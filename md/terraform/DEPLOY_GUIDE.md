# Deploy Script 修正概要

## 📋 実施した修正内容

### 1. **プロジェクト全体のアップロード対応** ✅

#### 変更前:
```bash
rsync ... \
    "$PROJECT_ROOT/api/" \
    "$PROJECT_ROOT/web/" \
    "$PROJECT_ROOT/nginx/" \
    ...
```

#### 変更後:
```bash
rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'terraform' \
    --exclude '*.log' \
    --exclude 'github-pages' \
    --exclude 'ssl/server.key' \
    --exclude '.env' \
    --exclude '*.tfstate*' \
    --exclude '.terraform' \
    "$PROJECT_ROOT/" \
    ec2-user@$EC2_IP:/opt/production-management/
```

**効果:**
- `~/grafana-setup`配下の全ファイルをアップロード
- セキュリティ上重要なファイル（秘密鍵、.envなど）は除外
- 不要なファイル（terraform、github-pages）も除外

---

### 2. **.env ファイルの自動生成** ✅

#### 新規追加:
```bash
# Generate .env file with Terraform outputs
log_info "Generating .env file on EC2..."
DB_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_HOST=$(echo "$DB_ENDPOINT" | cut -d: -f1)

ssh ... << 'ENVEOF'
cat > .env << 'DOTENV'
DB_HOST=RDS_HOST_PLACEHOLDER
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=production_pass
...
DOTENV
ENVEOF
```

**効果:**
- RDS接続情報をTerraformから自動取得
- セキュアに.envを生成（平文転送なし）
- 環境変数を正しく設定

---

### 3. **SSL証明書の自動生成** ✅

#### 新規機能: `setup_ssl()`
```bash
setup_ssl() {
    # Get EC2 public IP
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    # Generate OpenSSL configuration
    cat > ssl/openssl.cnf << SSLCONF
    CN = $PUBLIC_IP
    IP.2 = $PUBLIC_IP
    DNS.3 = *.compute.amazonaws.com
    SSLCONF
    
    # Generate self-signed certificate
    sudo openssl req -x509 -nodes -days 365 ...
    
    # Update nginx configuration
    sudo sed -i "s/server_name .*/server_name $PUBLIC_IP localhost;/g" ...
}
```

**効果:**
- EC2のパブリックIPで証明書を生成
- nginx設定を自動更新
- HTTPSでのQRスキャン機能を即座に使用可能

---

### 4. **docker-compose対応の起動処理** ✅

#### 変更前:
```bash
sudo systemctl start production-management
```

#### 変更後:
```bash
# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

# Stop existing containers
$COMPOSE_CMD down 2>/dev/null || true

# Start containers
$COMPOSE_CMD up -d

# Health check
curl -s http://localhost ...
```

**効果:**
- docker-compose v1/v2両対応
- コンテナの再起動処理
- ヘルスチェック機能追加

---

### 5. **データベース初期化の強化** ✅

#### 変更前:
```bash
if [ -f postgres/init/01-init.sql ]; then
    psql ... < postgres/init/01-init.sql
fi
```

#### 変更後:
```bash
# Initialize database
for sql_file in postgres/init/*.sql; do
    if [ -f "$sql_file" ]; then
        echo "Executing: $(basename $sql_file)"
        psql ... < "$sql_file"
    fi
done

# Run additional QR inspection tables setup
if [ -f postgres/init/02-qr-inspection-tables.sql ]; then
    psql ... < postgres/init/02-qr-inspection-tables.sql
fi
```

**効果:**
- 複数のSQLファイルを順次実行
- QR検品テーブルも自動セットアップ
- 初期データも含めて完全にデプロイ

---

### 6. **デプロイ情報の表示改善** ✅

#### 追加情報:
```bash
echo "🌐 Access URLs:"
echo "HTTP:             http://$EC2_IP"
echo "HTTPS:            https://$EC2_IP"
echo "Camera Test:      http://$EC2_IP/camera-test.html"

echo "📱 iPhone Access:"
echo "For QR Scanner (requires HTTPS):"
echo "  1. Access: https://$EC2_IP"
echo "  2. Accept certificate warning"
echo "  3. Or install certificate from: http://$EC2_IP/server.crt"

echo "💰 Cost Estimate:"
terraform output -raw monthly_cost_estimate
```

**効果:**
- アクセス方法が一目瞭然
- iPhoneアクセス手順を表示
- コスト見積もりも表示

---

## 🚀 使用方法

### 基本的な使い方

```bash
cd ~/grafana-setup/terraform

# 1. AWSクレデンシャル設定（初回のみ）
aws configure

# 2. terraform.tfvarsを編集（必要に応じて）
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 3. デプロイ実行
./deploy.sh
```

### デプロイフロー

```
1. Prerequisites Check
   ├─ Terraform installed?
   ├─ AWS CLI installed?
   └─ AWS credentials configured?

2. Terraform Init
   └─ terraform.tfvars準備

3. Infrastructure Deploy
   ├─ VPC/Subnet/IGW
   ├─ EC2 (t3.micro)
   ├─ RDS (PostgreSQL 15)
   ├─ Security Groups
   └─ Scheduler (起動/停止)

4. Application Upload
   ├─ ~/grafana-setup 全体をrsync
   ├─ docker-compose.yml配置
   └─ .env自動生成

5. SSL Setup
   ├─ EC2のパブリックIP取得
   ├─ 自己署名証明書生成
   └─ nginx設定更新

6. Database Init
   ├─ RDS接続待機
   ├─ 01-init.sql実行
   └─ 02-qr-inspection-tables.sql実行

7. Application Start
   ├─ docker-compose up -d
   ├─ ヘルスチェック
   └─ ログ確認

8. Show Results
   ├─ アクセスURL表示
   ├─ SSH接続情報
   └─ コスト見積もり
```

---

## 📂 アップロード対象ファイル

### ✅ アップロードされるもの
```
grafana-setup/
├── api/                    ✅ Node.js APIサーバー
├── web/                    ✅ フロントエンド
├── nginx/                  ✅ リバースプロキシ設定
├── grafana/                ✅ 監視ダッシュボード
├── prometheus/             ✅ メトリクス収集
├── postgres/               ✅ DBスキーマとデータ
├── docker-compose.yml      ✅ コンテナ構成
├── manage.sh               ✅ 管理スクリプト
├── setup-ssl.sh            ✅ SSL設定スクリプト
├── *.md                    ✅ ドキュメント
└── IPHONE_ACCESS_GUIDE.txt ✅ アクセスガイド
```

### ❌ 除外されるもの（セキュリティ/不要）
```
grafana-setup/
├── terraform/              ❌ Terraformコード（デプロイ済み）
├── github-pages/           ❌ テスト環境用
├── ssl/server.key          ❌ 秘密鍵（EC2で再生成）
├── .env                    ❌ 環境変数（自動生成）
├── node_modules/           ❌ 依存関係（再インストール）
├── .git/                   ❌ Gitリポジトリ
├── *.log                   ❌ ログファイル
├── *.tfstate*              ❌ Terraform状態ファイル
└── .terraform/             ❌ Terraformキャッシュ
```

---

## 🔒 セキュリティ対策

1. **秘密鍵の保護**
   - ローカルの`ssl/server.key`は転送しない
   - EC2上で新規生成

2. **.env の安全な生成**
   - Terraform outputから動的に生成
   - 平文での転送を回避

3. **RDS接続**
   - プライベートサブネット配置
   - EC2からのみアクセス可能
   - セキュリティグループで制限

4. **SSH鍵認証**
   - パスワード認証無効
   - 鍵ペア方式のみ

---

## 💡 トラブルシューティング

### Q1: SSHタイムアウト
```bash
# セキュリティグループ確認
aws ec2 describe-security-groups --group-ids sg-xxx

# ポート22が開放されているか確認
```

### Q2: RDS接続エラー
```bash
# EC2にSSHしてRDS接続確認
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
docker run --rm postgres:15-alpine psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Q3: コンテナ起動失敗
```bash
# EC2でログ確認
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
cd /opt/production-management
docker-compose logs
```

### Q4: HTTPS証明書エラー
```bash
# 証明書再生成
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
cd /opt/production-management
./setup-ssl.sh
docker-compose restart nginx
```

---

## 📊 デプロイ後の確認

### 1. **Webアクセス確認**
```bash
# HTTP
curl http://$EC2_IP

# HTTPS
curl -k https://$EC2_IP
```

### 2. **コンテナ確認**
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
docker ps
```

### 3. **データベース確認**
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
cd /opt/production-management
export $(grep -v '^#' .env | xargs)
docker run --rm postgres:15-alpine psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt"
```

### 4. **ログ確認**
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@$EC2_IP
cd /opt/production-management
docker-compose logs -f
```

---

## 🎯 完了チェックリスト

- [ ] Terraformインストール済み
- [ ] AWS CLIインストール済み
- [ ] AWS認証情報設定済み
- [ ] terraform.tfvars編集済み
- [ ] SSH鍵ペア作成済み（EC2用）
- [ ] ./deploy.sh実行成功
- [ ] HTTPアクセス確認完了
- [ ] HTTPSアクセス確認完了
- [ ] QRスキャン機能テスト完了
- [ ] データベース接続確認完了

---

**最終更新:** 2025年10月12日  
**対象バージョン:** grafana-setup v2.0 (全体デプロイ対応版)

