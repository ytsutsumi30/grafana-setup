#!/bin/bash

###############################################################################
# デプロイメント検証スクリプト
# EC2への適用が正しく行われたかを確認
###############################################################################

set -e

# 色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# バージョン情報
VERSION="2.1.1"
BUILD_DATE="2025-10-18"
GIT_COMMIT=$(git rev-parse --short HEAD)

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         デプロイメント検証スクリプト v1.0                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. ローカルファイルの検証
echo -e "${BLUE}[1/5] ローカルファイルの検証...${NC}"

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        local hash=$(md5sum "$file" | awk '{print $1}')
        local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
        echo -e "  ${GREEN}✓${NC} $file"
        echo -e "    MD5: $hash"
        echo -e "    Size: $size bytes"
        
        # バージョン情報をチェック
        if grep -q "meta name=\"version\"" "$file" 2>/dev/null; then
            local ver=$(grep "meta name=\"version\"" "$file" | sed -n 's/.*content="\([^"]*\)".*/\1/p')
            echo -e "    Version: ${CYAN}$ver${NC}"
        fi
        
        return 0
    else
        echo -e "  ${RED}✗${NC} $file ${RED}(存在しません)${NC}"
        return 1
    fi
}

FILES=(
    "web/qr-inspection.html"
    "web/qr-inspection2.html"
    "web/index.html"
    "api/server.js"
    "docker-compose.yml"
)

failed=0
for file in "${FILES[@]}"; do
    if ! check_file "$file"; then
        ((failed++))
    fi
done

if [ $failed -gt 0 ]; then
    echo -e "${RED}警告: $failed 個のファイルが見つかりませんでした${NC}"
fi

echo ""

# 2. Git状態の確認
echo -e "${BLUE}[2/5] Git状態の確認...${NC}"
echo -e "  Current Branch: ${CYAN}$(git branch --show-current)${NC}"
echo -e "  Latest Commit:  ${CYAN}$GIT_COMMIT${NC}"
echo -e "  Commit Message: ${CYAN}$(git log -1 --pretty=%s)${NC}"

uncommitted=$(git status --porcelain | wc -l)
if [ $uncommitted -gt 0 ]; then
    echo -e "  ${YELLOW}⚠${NC}  未コミットの変更: ${YELLOW}$uncommitted ファイル${NC}"
    git status --short
else
    echo -e "  ${GREEN}✓${NC} クリーンな状態（未コミット変更なし）"
fi

echo ""

# 3. Dockerコンテナの確認
echo -e "${BLUE}[3/5] Dockerコンテナの確認...${NC}"

if command -v docker &> /dev/null; then
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "grafana\|nginx\|postgres"; then
        echo -e "${GREEN}✓${NC} Dockerコンテナが実行中:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "grafana|nginx|postgres|api" || true
    else
        echo -e "${YELLOW}⚠${NC} Dockerコンテナが実行されていません"
    fi
else
    echo -e "${YELLOW}⚠${NC} Dockerコマンドが見つかりません（スキップ）"
fi

echo ""

# 4. リモートEC2への接続確認（オプション）
echo -e "${BLUE}[4/5] EC2接続確認...${NC}"

if [ -f "terraform/terraform.tfvars" ]; then
    # EC2のIPを取得
    EC2_IP=$(grep "ec2_public_ip" terraform/outputs.tf 2>/dev/null || echo "")
    
    if [ -n "$EC2_IP" ]; then
        echo -e "  EC2 IP: ${CYAN}$EC2_IP${NC}"
        
        # SSH接続テスト（タイムアウト5秒）
        if timeout 5 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" "echo 'Connected'" &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} EC2への接続成功"
            
            # リモートファイルのバージョン確認
            echo -e "\n  リモートファイルのバージョン確認:"
            ssh ec2-user@"$EC2_IP" "grep -A 3 'meta name=\"version\"' /home/ec2-user/grafana-setup/web/qr-inspection.html" 2>/dev/null || echo "    バージョン情報取得不可"
        else
            echo -e "  ${YELLOW}⚠${NC} EC2への接続失敗（タイムアウト）"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} EC2 IPが見つかりません"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} terraform.tfvarsが見つかりません（スキップ）"
fi

echo ""

# 5. ビルド情報の生成
echo -e "${BLUE}[5/5] デプロイメント情報の生成...${NC}"

DEPLOY_INFO_FILE="DEPLOYMENT_INFO.json"

cat > "$DEPLOY_INFO_FILE" << EOF
{
  "version": "$VERSION",
  "buildDate": "$BUILD_DATE",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$(git branch --show-current)",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployedBy": "$(whoami)@$(hostname)",
  "files": {
$(
    first=true
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            hash=$(md5sum "$file" | awk '{print $1}')
            size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
            
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            
            printf "    \"$file\": {\"md5\": \"$hash\", \"size\": $size}"
        fi
    done
)
  }
}
EOF

echo -e "  ${GREEN}✓${NC} デプロイメント情報を生成: ${CYAN}$DEPLOY_INFO_FILE${NC}"
cat "$DEPLOY_INFO_FILE"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                  検証完了                                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}デプロイ準備完了${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo -e "  1. ${CYAN}./quick-deploy.sh${NC} でEC2にデプロイ"
echo -e "  2. ブラウザで ${CYAN}http://<EC2-IP>/qr-inspection.html${NC} を開く"
echo -e "  3. コンソールでバージョン情報を確認: ${CYAN}window.QR_INSPECTION_VERSION${NC}"
echo -e "  4. ページフッターでバージョン表示を確認"
echo ""
