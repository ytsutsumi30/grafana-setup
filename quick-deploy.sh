#!/bin/bash
# ========================================
# Quick Deploy Script - Production Management System
# ========================================
# 使い方: ./quick-deploy.sh [オプション]
# オプション:
#   --full     : 完全デプロイ（依存関係再インストール + 再起動）
#   --restart  : 再起動のみ
#   --no-restart : ファイル同期のみ（再起動なし）

set -e

# ========================================
# 設定
# ========================================
EC2_IP="52.69.217.246"
EC2_USER="ec2-user"
KEY_PATH="$HOME/.ssh/production-management-key.pem"
PROJECT_DIR="$HOME/grafana-setup"
REMOTE_PRIMARY_DIR="/opt/production-management"
REMOTE_SECONDARY_DIR="production-management"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# ヘルパー関数
# ========================================
log_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

show_header() {
    echo ""
    echo "=========================================="
    echo "  🚀 Quick Deploy to Production"
    echo "=========================================="
    echo ""
}

# ========================================
# オプション解析
# ========================================
FULL_DEPLOY=false
RESTART_ONLY=false
NO_RESTART=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_DEPLOY=true
            shift
            ;;
        --restart)
            RESTART_ONLY=true
            shift
            ;;
        --no-restart)
            NO_RESTART=true
            shift
            ;;
        -h|--help)
            show_header
            echo "使い方: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --full        完全デプロイ（依存関係再インストール + 再起動）"
            echo "  --restart     再起動のみ"
            echo "  --no-restart  ファイル同期のみ（再起動なし）"
            echo "  -h, --help    このヘルプを表示"
            echo ""
            echo "例:"
            echo "  $0              # 通常デプロイ（同期 + 再起動）"
            echo "  $0 --full       # 完全デプロイ"
            echo "  $0 --no-restart # ファイル同期のみ"
            echo "  $0 --restart    # 再起動のみ"
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            echo "使い方: $0 [--full|--restart|--no-restart|-h]"
            exit 1
            ;;
    esac
done

# ========================================
# メイン処理
# ========================================
show_header

# 再起動のみの場合
if [ "$RESTART_ONLY" = true ]; then
    log_info "サービスを再起動しています..."
    ssh -i "$KEY_PATH" $EC2_USER@$EC2_IP \
        "cd $REMOTE_PRIMARY_DIR && docker-compose restart"
    log_success "サービス再起動完了"
    
    # ヘルスチェック
    log_info "ヘルスチェック中..."
    sleep 10
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://hispot-iot.com/ || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "アプリケーション正常稼働中 (HTTPS $HTTP_STATUS)"
    else
        log_warning "アプリケーション確認: HTTPS $HTTP_STATUS"
    fi
    exit 0
fi

# 1. 前チェック
log_info "デプロイ前チェック..."

if [ ! -f "$KEY_PATH" ]; then
    log_error "SSHキーが見つかりません: $KEY_PATH"
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    log_error "プロジェクトディレクトリが見つかりません: $PROJECT_DIR"
    exit 1
fi

# SSH接続確認
if ! ssh -i "$KEY_PATH" -o ConnectTimeout=30 $EC2_USER@$EC2_IP "echo ok" > /dev/null 2>&1; then
    log_error "EC2への接続に失敗しました"
    exit 1
fi

log_success "前チェック完了"

# 2. ファイル同期
log_info "ファイルを同期しています..."
log_warning "除外: node_modules, .git, terraform, github-pages, *.log"

RSYNC_LOG=$(mktemp)

rsync -avz --delete \
    --itemize-changes \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='terraform' \
    --exclude='github-pages' \
    --exclude='ssl/server.key' \
    --exclude='ssl/server.crt' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --progress \
    -e "ssh -i $KEY_PATH" \
    "$PROJECT_DIR/" \
    $EC2_USER@$EC2_IP:"$REMOTE_PRIMARY_DIR"/ | tee "$RSYNC_LOG"

# 旧ディレクトリ用の同期（ドキュメント用途）
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='terraform' \
    --exclude='github-pages' \
    --exclude='ssl/server.key' \
    --exclude='ssl/server.crt' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    -e "ssh -i $KEY_PATH" \
    "$PROJECT_DIR/" \
    $EC2_USER@$EC2_IP:~/$REMOTE_SECONDARY_DIR/ >/dev/null 2>&1 || true

if grep -qE '^(>f|<f|c|\*)' "$RSYNC_LOG"; then
    log_info "同期されたファイル一覧"
    grep -E '^(>f|<f|c|\*)' "$RSYNC_LOG"
else
    log_warning "同期対象の変更はありませんでした"
fi

rm -f "$RSYNC_LOG"

log_success "ファイル同期完了"

# 3. 依存関係のインストール（フルデプロイの場合）
if [ "$FULL_DEPLOY" = true ]; then
    log_info "API依存関係をインストールしています..."
    ssh -i "$KEY_PATH" $EC2_USER@$EC2_IP << 'EOF'
cd /opt/production-management/api
npm install --production 2>&1 | tail -5
EOF
    log_success "依存関係インストール完了"
fi

# 4. サービス再起動（no-restartオプションがない場合）
if [ "$NO_RESTART" = false ]; then
    log_info "サービスを再起動しています..."
    ssh -i "$KEY_PATH" $EC2_USER@$EC2_IP << 'EOF'
cd /opt/production-management
docker-compose restart
EOF
    log_success "サービス再起動完了"
    
    # 5. ヘルスチェック
    log_info "ヘルスチェック中..."
    sleep 10
    
    # ALB経由のHTTPSチェック
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://hispot-iot.com/ || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "アプリケーション正常稼働中 (HTTPS $HTTP_STATUS)"
    else
        log_warning "アプリケーション確認: HTTPS $HTTP_STATUS (再試行します...)"
        sleep 5
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://hispot-iot.com/ || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then
            log_success "アプリケーション正常稼働中 (HTTPS $HTTP_STATUS)"
        else
            log_warning "アプリケーション確認: HTTPS $HTTP_STATUS"
        fi
    fi
    
    # API確認
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://hispot-iot.com/api/health || echo "000")
    if [ "$API_STATUS" = "200" ]; then
        log_success "API正常稼働中 (HTTPS $API_STATUS)"
    else
        log_warning "API確認: HTTPS $API_STATUS"
    fi
else
    log_warning "再起動はスキップされました（--no-restart）"
fi

# 6. デプロイ完了
echo ""
echo "=========================================="
log_success "デプロイ完了！"
echo "=========================================="
echo ""
echo "📱 アプリケーション: https://hispot-iot.com"
echo "🔌 API: https://hispot-iot.com/api/health"
echo "🛠️  メンテナンス: https://hispot-iot.com/maintenance.html"
echo "� 製品マスタ: https://hispot-iot.com/products.html"
echo "🔑 SSH: ssh -i $KEY_PATH $EC2_USER@$EC2_IP"
echo ""

# デプロイ時刻を記録
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ssh -i "$KEY_PATH" $EC2_USER@$EC2_IP \
    "echo '$TIMESTAMP - Deployed' >> /opt/production-management/deploy.log"
