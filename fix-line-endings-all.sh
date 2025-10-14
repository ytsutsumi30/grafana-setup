#!/bin/bash

###############################################################################
# 改行コード一括修正スクリプト
# Windows形式(CRLF)からUnix形式(LF)へ変換
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  改行コード修正ツール${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# shellスクリプトをリストアップ
echo -e "${YELLOW}[INFO]${NC} shellスクリプトを検索中..."
SHELL_SCRIPTS=$(find "$SCRIPT_DIR" -type f -name "*.sh")
SCRIPT_COUNT=$(echo "$SHELL_SCRIPTS" | wc -l)

echo -e "${GREEN}[FOUND]${NC} ${SCRIPT_COUNT}個のshellスクリプトが見つかりました"
echo ""

# リスト表示
echo -e "${BLUE}対象ファイル:${NC}"
echo "$SHELL_SCRIPTS" | while read -r script; do
    relative_path=$(realpath --relative-to="$SCRIPT_DIR" "$script")
    echo "  • $relative_path"
done
echo ""

# 確認プロンプト
read -p "改行コードをCRLF→LFに修正しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました。"
    exit 0
fi

echo ""
echo -e "${YELLOW}[PROCESSING]${NC} 改行コードを修正中..."
echo ""

# 各ファイルを修正
SUCCESS_COUNT=0
FAILED_COUNT=0

echo "$SHELL_SCRIPTS" | while read -r script; do
    relative_path=$(realpath --relative-to="$SCRIPT_DIR" "$script")
    
    # CRLFが含まれているか確認
    if grep -q $'\r' "$script" 2>/dev/null; then
        # 修正実行
        if sed -i 's/\r$//' "$script" 2>/dev/null; then
            echo -e "${GREEN}  ✓${NC} $relative_path ${YELLOW}(CRLF→LF)${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "${RED}  ✗${NC} $relative_path ${RED}(エラー)${NC}"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    else
        echo -e "${BLUE}  -${NC} $relative_path ${BLUE}(変更なし)${NC}"
    fi
done

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  完了${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "対象ファイル数: $SCRIPT_COUNT"
echo ""

# 実行権限確認と付与
echo -e "${YELLOW}[INFO]${NC} 実行権限を確認中..."
echo "$SHELL_SCRIPTS" | while read -r script; do
    if [ ! -x "$script" ]; then
        relative_path=$(realpath --relative-to="$SCRIPT_DIR" "$script")
        chmod +x "$script"
        echo -e "${GREEN}  ✓${NC} 実行権限付与: $relative_path"
    fi
done

echo ""
echo -e "${GREEN}✓ すべての処理が完了しました${NC}"
echo ""

# 検証
echo -e "${BLUE}検証結果:${NC}"
echo "$SHELL_SCRIPTS" | head -3 | while read -r script; do
    relative_path=$(realpath --relative-to="$SCRIPT_DIR" "$script")
    file_info=$(file "$script")
    echo "  $relative_path"
    echo "    → $file_info"
done
echo ""
