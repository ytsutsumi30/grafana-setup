#!/bin/bash

###############################################################################
# GitHub Pages デプロイスクリプト
# QRスキャンテストをGitHub Pagesにデプロイします
###############################################################################

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║       🚀 GitHub Pages デプロイガイド                       ║${NC}"
echo -e "${BLUE}║          QRスキャンテスト                                  ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 ファイル一覧${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$SCRIPT_DIR"

if [ ! -f "index.html" ] || [ ! -f "app.js" ]; then
    echo -e "${RED}✗ 必要なファイルが見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} index.html  $(wc -l < index.html) 行"
echo -e "${GREEN}✓${NC} app.js      $(wc -l < app.js) 行"
echo -e "${GREEN}✓${NC} README.md   $(wc -l < README.md) 行"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 デプロイ方法の選択${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}1.${NC} Web UI経由でデプロイ（推奨・簡単）"
echo -e "${YELLOW}2.${NC} Git コマンドラインでデプロイ（技術者向け）"
echo -e "${YELLOW}3.${NC} ローカルテスト（GitHub Pages不要）"
echo ""

read -p "選択してください (1-3): " choice
echo ""

case $choice in
    1)
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}📤 Web UI デプロイ手順${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BLUE}ステップ1: GitHubリポジトリを作成${NC}"
        echo -e "  1. https://github.com/new にアクセス"
        echo -e "  2. Repository name: ${GREEN}qr-scanner-test${NC} (任意の名前)"
        echo -e "  3. ${GREEN}Public${NC} を選択"
        echo -e "  4. 「Create repository」をクリック"
        echo ""
        
        echo -e "${BLUE}ステップ2: ファイルをアップロード${NC}"
        echo -e "  1. リポジトリページで「uploading an existing file」をクリック"
        echo -e "  2. 以下のファイルをドラッグ&ドロップ:"
        echo -e "     ${CYAN}• index.html${NC}"
        echo -e "     ${CYAN}• app.js${NC}"
        echo -e "     ${CYAN}• README.md${NC}"
        echo -e "  3. 「Commit changes」をクリック"
        echo ""
        
        echo -e "${BLUE}ステップ3: GitHub Pagesを有効化${NC}"
        echo -e "  1. リポジトリの ${GREEN}Settings${NC} をクリック"
        echo -e "  2. 左メニューから ${GREEN}Pages${NC} を選択"
        echo -e "  3. Source: ${GREEN}Deploy from a branch${NC}"
        echo -e "  4. Branch: ${GREEN}main${NC} / ${GREEN}/ (root)${NC} を選択"
        echo -e "  5. 「Save」をクリック"
        echo ""
        
        echo -e "${BLUE}ステップ4: アクセス${NC}"
        echo -e "  数分後、以下のURLでアクセス可能:"
        echo -e "  ${GREEN}https://[username].github.io/qr-scanner-test/${NC}"
        echo ""
        
        echo -e "${YELLOW}💡 ヒント:${NC}"
        echo -e "  • [username]はあなたのGitHubユーザー名です"
        echo -e "  • デプロイには1-5分程度かかる場合があります"
        echo -e "  • エラーが出た場合はSettingsのPagesページを確認"
        echo ""
        ;;
        
    2)
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}⚙️  Git コマンドライン デプロイ${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        # Gitがインストールされているか確認
        if ! command -v git &> /dev/null; then
            echo -e "${RED}✗ Gitがインストールされていません${NC}"
            echo -e "  インストール: ${CYAN}sudo apt-get install git${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Git がインストールされています${NC}"
        echo ""
        
        # GitHubユーザー名を入力
        echo -e "${YELLOW}GitHubユーザー名を入力してください:${NC}"
        read -p "Username: " github_username
        
        if [ -z "$github_username" ]; then
            echo -e "${RED}✗ ユーザー名が入力されていません${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}以下のコマンドを実行してください:${NC}"
        echo ""
        echo -e "${CYAN}# 1. Gitリポジトリを初期化${NC}"
        echo "git init"
        echo ""
        echo -e "${CYAN}# 2. ファイルを追加${NC}"
        echo "git add ."
        echo ""
        echo -e "${CYAN}# 3. 初回コミット${NC}"
        echo 'git commit -m "Initial commit: QR Scanner Test"'
        echo ""
        echo -e "${CYAN}# 4. GitHubでリポジトリを作成後、リモートを追加${NC}"
        echo -e "# ${YELLOW}https://github.com/new${NC} でリポジトリを作成してから:"
        echo "git remote add origin https://github.com/${github_username}/qr-scanner-test.git"
        echo ""
        echo -e "${CYAN}# 5. プッシュ${NC}"
        echo "git branch -M main"
        echo "git push -u origin main"
        echo ""
        echo -e "${CYAN}# 6. GitHub Pagesを有効化（Webから）${NC}"
        echo -e "#    Settings → Pages → Source: main / root"
        echo ""
        
        echo -e "${YELLOW}自動実行しますか？ (y/N):${NC} "
        read -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${GREEN}実行中...${NC}"
            echo ""
            
            # Gitリポジトリ初期化
            if [ ! -d ".git" ]; then
                git init
                echo -e "${GREEN}✓${NC} Gitリポジトリを初期化しました"
            fi
            
            # ファイル追加
            git add .
            echo -e "${GREEN}✓${NC} ファイルを追加しました"
            
            # コミット
            git commit -m "Initial commit: QR Scanner Test" || echo -e "${YELLOW}⚠${NC}  既にコミット済み"
            
            echo ""
            echo -e "${YELLOW}次のステップ:${NC}"
            echo -e "1. https://github.com/new でリポジトリを作成"
            echo -e "2. 以下のコマンドを実行:"
            echo -e "   ${CYAN}git remote add origin https://github.com/${github_username}/qr-scanner-test.git${NC}"
            echo -e "   ${CYAN}git branch -M main${NC}"
            echo -e "   ${CYAN}git push -u origin main${NC}"
            echo -e "3. Settings → Pages で有効化"
        fi
        ;;
        
    3)
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}🧪 ローカルテスト${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        # Pythonの確認
        if command -v python3 &> /dev/null; then
            echo -e "${GREEN}✓ Python3 が見つかりました${NC}"
            echo ""
            echo -e "${YELLOW}ローカルサーバーを起動しますか？ (y/N):${NC} "
            read -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo ""
                echo -e "${GREEN}HTTPサーバーを起動しています...${NC}"
                echo ""
                echo -e "${CYAN}アクセスURL:${NC} ${GREEN}http://localhost:8000${NC}"
                echo -e "${YELLOW}※ localhostはHTTPでもカメラAPI使用可能${NC}"
                echo ""
                echo -e "終了するには ${RED}Ctrl+C${NC} を押してください"
                echo ""
                
                python3 -m http.server 8000
            fi
        elif command -v python &> /dev/null; then
            echo -e "${GREEN}✓ Python2 が見つかりました${NC}"
            echo ""
            echo -e "${YELLOW}ローカルサーバーを起動しますか？ (y/N):${NC} "
            read -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo ""
                echo -e "${GREEN}HTTPサーバーを起動しています...${NC}"
                echo ""
                echo -e "${CYAN}アクセスURL:${NC} ${GREEN}http://localhost:8000${NC}"
                echo ""
                echo -e "終了するには ${RED}Ctrl+C${NC} を押してください"
                echo ""
                
                python -m SimpleHTTPServer 8000
            fi
        else
            echo -e "${YELLOW}⚠ Pythonが見つかりません${NC}"
            echo ""
            echo -e "他の方法でHTTPサーバーを起動してください:"
            echo -e "  • Node.js: ${CYAN}npx http-server -p 8000${NC}"
            echo -e "  • PHP: ${CYAN}php -S localhost:8000${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}✗ 無効な選択です${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📚 関連ドキュメント${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "詳細な手順: ${CYAN}README.md${NC}"
echo -e "GitHub Pages公式: ${CYAN}https://docs.github.com/en/pages${NC}"
echo ""
