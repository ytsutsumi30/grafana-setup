#!/bin/bash

###############################################################################
# SSL証明書セットアップスクリプト
# カメラAPI（getUserMedia）を使用するために必要なHTTPS環境を構築します
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}/ssl"
NGINX_CONF="${SCRIPT_DIR}/nginx/conf.d/default.conf"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  SSL証明書セットアップ for QRスキャナー${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# SSLディレクトリの作成
if [ ! -d "$SSL_DIR" ]; then
    echo -e "${YELLOW}[INFO]${NC} SSLディレクトリを作成します: ${SSL_DIR}"
    mkdir -p "$SSL_DIR"
fi

# 既存の証明書チェック
if [ -f "${SSL_DIR}/server.crt" ] && [ -f "${SSL_DIR}/server.key" ]; then
    echo -e "${YELLOW}[WARNING]${NC} 既存の証明書が見つかりました。"
    read -p "証明書を再生成しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}[OK]${NC} 既存の証明書を使用します。"
        SKIP_CERT_GEN=true
    fi
fi

# 証明書生成
if [ "$SKIP_CERT_GEN" != "true" ]; then
    echo -e "${YELLOW}[INFO]${NC} 自己署名SSL証明書を生成します..."
    
    # サーバーのIPアドレスを取得
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # OpenSSL設定ファイルの作成
    cat > "${SSL_DIR}/openssl.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = JP
ST = Tokyo
L = Tokyo
O = Production Management System
OU = QR Inspection
CN = ${SERVER_IP}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
IP.1 = 127.0.0.1
IP.2 = ${SERVER_IP}
EOF

    # 秘密鍵と証明書の生成（有効期間365日）
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${SSL_DIR}/server.key" \
        -out "${SSL_DIR}/server.crt" \
        -config "${SSL_DIR}/openssl.cnf" \
        > /dev/null 2>&1
    
    # パーミッション設定
    chmod 600 "${SSL_DIR}/server.key"
    chmod 644 "${SSL_DIR}/server.crt"
    
    echo -e "${GREEN}[OK]${NC} SSL証明書を生成しました:"
    echo -e "  証明書: ${SSL_DIR}/server.crt"
    echo -e "  秘密鍵: ${SSL_DIR}/server.key"
    echo -e "  有効期間: 365日"
    echo -e "  サーバーIP: ${SERVER_IP}"
fi

# nginx設定の更新
echo ""
echo -e "${YELLOW}[INFO]${NC} nginx設定を更新します..."

# SSL設定のコメントを解除
sed -i 's/# listen 443 ssl;/listen 443 ssl;/' "$NGINX_CONF"
sed -i 's|# ssl_certificate /etc/nginx/ssl/server.crt;|ssl_certificate /etc/nginx/ssl/server.crt;|' "$NGINX_CONF"
sed -i 's|# ssl_certificate_key /etc/nginx/ssl/server.key;|ssl_certificate_key /etc/nginx/ssl/server.key;|' "$NGINX_CONF"
sed -i 's/# ssl_protocols/ssl_protocols/' "$NGINX_CONF"
sed -i 's/# ssl_ciphers/ssl_ciphers/' "$NGINX_CONF"

echo -e "${GREEN}[OK]${NC} nginx設定を更新しました"

# docker-compose.ymlの確認
echo ""
echo -e "${YELLOW}[INFO]${NC} docker-compose.ymlのSSLマウント設定を確認します..."

if grep -q "./ssl:/etc/nginx/ssl:ro" "${SCRIPT_DIR}/docker-compose.yml"; then
    echo -e "${GREEN}[OK]${NC} SSLマウント設定が既に存在します"
else
    echo -e "${YELLOW}[WARNING]${NC} docker-compose.ymlにSSLマウント設定がありません"
    echo "以下の設定を nginx サービスの volumes に追加してください:"
    echo "  - ./ssl:/etc/nginx/ssl:ro"
fi

# nginxコンテナの再起動
echo ""
echo -e "${YELLOW}[INFO]${NC} nginxコンテナを再起動します..."

if docker-compose ps nginx | grep -q "Up"; then
    docker-compose restart nginx
    echo -e "${GREEN}[OK]${NC} nginxを再起動しました"
else
    echo -e "${YELLOW}[WARNING]${NC} nginxコンテナが起動していません"
    echo "以下のコマンドで起動してください:"
    echo "  ./manage.sh start"
fi

# 完了メッセージ
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  SSL証明書のセットアップが完了しました！${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}【アクセス方法】${NC}"
echo -e "  HTTPS: ${GREEN}https://${SERVER_IP}${NC}"
echo -e "  HTTP:  http://${SERVER_IP}  ${YELLOW}(HTTPSを推奨)${NC}"
echo ""
echo -e "${BLUE}【iPhoneからのアクセス手順】${NC}"
echo -e "  1. iPhoneのSafariで ${GREEN}https://${SERVER_IP}${NC} にアクセス"
echo -e "  2. 「この接続ではプライバシーが保護されません」と表示されます"
echo -e "  3. ${YELLOW}「詳細を表示」→「このWebサイトを閲覧」${NC}をタップ"
echo -e "  4. 証明書の警告を承認してアクセス"
echo -e "  5. QR検品画面でカメラ権限を許可"
echo ""
echo -e "${BLUE}【注意事項】${NC}"
echo -e "  • 自己署名証明書のため、ブラウザで警告が表示されます"
echo -e "  • 本番環境では正式なSSL証明書（Let's Encryptなど）を使用してください"
echo -e "  • カメラAPIはHTTPS環境でのみ動作します（HTTPでは動作しません）"
echo ""
echo -e "${YELLOW}【トラブルシューティング】${NC}"
echo -e "  証明書エラーが解消しない場合:"
echo -e "    docker-compose down && docker-compose up -d"
echo ""

