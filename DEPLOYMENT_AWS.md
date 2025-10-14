# AWS環境へのデプロイガイド

## 🎯 概要

本プロジェクトをAWS環境にTerraformでデプロイするための完全ガイドです。

### 構成
- **EC2 + Docker Compose** - 既存のDocker構成をそのまま活用
- **RDS PostgreSQL 15** - マネージドデータベース
- **Single-AZ構成** - POC/開発環境向け
- **自動起動/停止** - EventBridgeスケジューラー

### 💰 コスト見積もり
**月額 $19-24** (160時間/月稼働時)
- EC2 t3.micro: ~$3-4
- RDS db.t3.micro: ~$12-15
- EBS 30GB: ~$3
- Data Transfer: ~$1-2

詳細は [terraform/COST_OPTIMIZATION.md](terraform/COST_OPTIMIZATION.md) を参照

---

## 📋 前提条件

### 1. AWS CLIのインストールと設定

```bash
# AWS CLI v2 インストール (Linux)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 設定
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: ap-northeast-1
# Default output format: json

# 確認
aws sts get-caller-identity
```

### 2. Terraformのインストール

```bash
# Terraform インストール (Linux)
wget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip
unzip terraform_1.7.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# 確認
terraform version
```

### 3. SSH Key Pairの作成

```bash
# AWS Console -> EC2 -> Key Pairs -> Create key pair
# または AWS CLIで:
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

---

## 🚀 デプロイ手順

### 方法1: 自動デプロイスクリプト (推奨)

```bash
cd /home/tsutsumi/grafana-setup/terraform

# 1. 設定ファイルの準備
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars

# 以下を編集:
# - key_name: SSH Key名
# - db_password: 強力なパスワード
# - allowed_cidr_blocks: アクセス元IP制限

# 2. デプロイ実行
./deploy.sh
```

### 方法2: 手動デプロイ

#### Step 1: 設定ファイルの準備

```bash
cd /home/tsutsumi/grafana-setup/terraform

# terraform.tfvarsを作成
cp terraform.tfvars.example terraform.tfvars

# 編集
vim terraform.tfvars
```

**terraform.tfvars の最小設定:**
```hcl
key_name    = "production-management-poc"
db_password = "YourStrongPassword123!"

# オプション: IPアドレス制限
allowed_cidr_blocks = ["YOUR_IP/32"]
```

#### Step 2: Terraform初期化

```bash
terraform init
```

#### Step 3: プランの確認

```bash
terraform plan
```

#### Step 4: インフラ構築

```bash
terraform apply
# -> "yes" を入力

# 完了まで約10-15分
```

#### Step 5: 出力情報の確認

```bash
terraform output

# 重要な情報をメモ:
# - ec2_public_ip: XXX.XXX.XXX.XXX
# - application_url: http://XXX.XXX.XXX.XXX
# - ssh_command: ssh -i ~/.ssh/production-management-poc.pem ec2-user@XXX.XXX.XXX.XXX
```

---

## 📦 アプリケーションのデプロイ

### EC2へのファイル転送

```bash
# EC2のIPアドレスを取得
cd /home/tsutsumi/grafana-setup/terraform
EC2_IP=$(terraform output -raw ec2_public_ip)

# プロジェクトルートに移動
cd /home/tsutsumi/grafana-setup

# ファイルを転送
rsync -avz -e "ssh -i ~/.ssh/production-management-poc.pem -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'terraform' \
  --exclude '*.log' \
  api/ web/ nginx/ grafana/ prometheus/ postgres/ \
  ec2-user@$EC2_IP:/opt/production-management/
```

### SSH接続とサービス起動

```bash
# SSH接続
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$EC2_IP

# サービス起動
sudo systemctl start production-management

# ステータス確認
sudo systemctl status production-management

# コンテナ確認
docker ps

# ログ確認
cd /opt/production-management
sudo docker-compose logs -f
```

### データベース初期化

```bash
# EC2上で実行
cd /opt/production-management

# 環境変数を読み込み
export $(grep -v '^#' .env | xargs)

# データベース初期化
docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < postgres/init/01-init.sql

echo "Database initialized successfully"
```

---

## 🔧 設定とカスタマイズ

### スケジューラーの設定

デフォルト設定 (平日9-19時):
```hcl
# terraform.tfvars
start_schedule = "cron(0 0 ? * MON-FRI *)"   # 9:00 AM JST
stop_schedule  = "cron(0 10 ? * MON-FRI *)"  # 7:00 PM JST
```

他のスケジュール例:

**平日のみ24時間稼働:**
```hcl
start_schedule = "cron(0 15 ? * SUN *)"      # 月曜 00:00 JST
stop_schedule  = "cron(0 15 ? * FRI *)"      # 土曜 00:00 JST
```

**営業時間のみ (8-18時):**
```hcl
start_schedule = "cron(0 23 ? * SUN-THU *)"  # 8:00 AM JST
stop_schedule  = "cron(0 9 ? * MON-FRI *)"   # 6:00 PM JST
```

変更を適用:
```bash
terraform apply
```

### 手動起動/停止

```bash
# 起動
aws ec2 start-instances --instance-ids $(terraform output -raw ec2_instance_id)
aws rds start-db-instance --db-instance-identifier $(terraform output -raw rds_instance_id)

# 停止
aws ec2 stop-instances --instance-ids $(terraform output -raw ec2_instance_id)
aws rds stop-db-instance --db-instance-identifier $(terraform output -raw rds_instance_id)
```

### インスタンスタイプ変更

```hcl
# terraform.tfvars
instance_type     = "t3.small"      # EC2を2GB RAMに
db_instance_class = "db.t3.small"   # RDSを2GB RAMに
```

```bash
terraform apply
```

---

## 🔍 監視と運用

### アクセスURL

デプロイ後、以下のURLでアクセス可能:

```bash
# メインアプリケーション
http://$(terraform output -raw ec2_public_ip)

# Grafana
http://$(terraform output -raw ec2_public_ip)/grafana/
# ユーザー: admin
# パスワード: admin123

# Prometheus
http://$(terraform output -raw ec2_public_ip)/prometheus/

# API Health Check
http://$(terraform output -raw ec2_public_ip)/api/health
```

### ログ確認

```bash
# SSH接続後
cd /opt/production-management

# 全サービスのログ
sudo docker-compose logs -f

# 特定サービス
sudo docker-compose logs -f production-api
sudo docker-compose logs -f nginx

# システムログ
sudo journalctl -u production-management -f
```

### CloudWatchログ

```bash
# RDSログ確認
aws logs tail /aws/rds/instance/poc-production-db/postgresql --follow

# EC2ログ (設定した場合)
aws logs tail /aws/ec2/production-management --follow
```

### パフォーマンス監視

```bash
# EC2メトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$(terraform output -raw ec2_instance_id) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# RDSメトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=$(terraform output -raw rds_instance_id) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 💾 バックアップと復元

### 自動バックアップ (RDS)

- **保持期間**: 7日間
- **バックアップウィンドウ**: 03:00-04:00 UTC (12:00-13:00 JST)
- **メンテナンスウィンドウ**: 月曜 04:00-05:00 UTC (13:00-14:00 JST)

### 手動バックアップ

```bash
# RDSスナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier $(terraform output -raw rds_instance_id) \
  --db-snapshot-identifier poc-manual-snapshot-$(date +%Y%m%d-%H%M)

# スナップショット一覧
aws rds describe-db-snapshots \
  --db-instance-identifier $(terraform output -raw rds_instance_id)

# EC2バックアップ (AMI作成)
aws ec2 create-image \
  --instance-id $(terraform output -raw ec2_instance_id) \
  --name "production-management-$(date +%Y%m%d-%H%M)" \
  --description "Production Management System backup"
```

### 復元

```bash
# スナップショットから復元
# terraform.tfvarsに追加:
# snapshot_identifier = "poc-manual-snapshot-YYYYMMDD"

terraform apply
```

---

## 🔐 セキュリティ

### 推奨設定

#### 1. IPアドレス制限

```hcl
# terraform.tfvars
allowed_cidr_blocks = [
  "YOUR_OFFICE_IP/32",
  "YOUR_HOME_IP/32"
]
```

#### 2. DBパスワードの厳格化

```bash
# 強力なパスワード生成
openssl rand -base64 32

# terraform.tfvarsに設定
db_password = "生成されたパスワード"
```

#### 3. SSL/TLS証明書 (オプション)

```bash
# Let's Encryptで証明書取得 (EC2上で)
sudo amazon-linux-extras install epel -y
sudo yum install certbot -y

sudo certbot certonly --standalone \
  -d your-domain.com \
  --email your-email@example.com
```

#### 4. セキュリティグループの監査

```bash
# 現在のルールを確認
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id) \
  --output table
```

---

## 💰 コスト管理

### コストアラート設定

```bash
# AWS Budgetsでアラート設定
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "production-management-poc",
    "BudgetLimit": {
      "Amount": "30",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### 月次コスト確認

```bash
# 今月のコスト
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://filter.json

# filter.json
{
  "Tags": {
    "Key": "Environment",
    "Values": ["poc"]
  }
}
```

### コスト最適化チェック

```bash
# 未使用のEIPをチェック
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=" \
  --query 'Addresses[*].PublicIp'

# 停止中のインスタンス確認
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType]'
```

詳細は [terraform/COST_OPTIMIZATION.md](terraform/COST_OPTIMIZATION.md) 参照

---

## 🗑️ 環境削除

### 完全削除

```bash
cd /home/tsutsumi/grafana-setup/terraform

# 削除実行
terraform destroy
# -> "yes" を入力

# 確認
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=poc" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name]'
```

### 一時停止 (コスト削減)

```bash
# スナップショット取得後に削除
aws rds create-db-snapshot \
  --db-instance-identifier $(terraform output -raw rds_instance_id) \
  --db-snapshot-identifier poc-temp-snapshot

# インスタンス停止
aws ec2 stop-instances --instance-ids $(terraform output -raw ec2_instance_id)
aws rds stop-db-instance --db-instance-identifier $(terraform output -raw rds_instance_id)
```

---

## 🆘 トラブルシューティング

### EC2が起動しない

```bash
# コンソール出力確認
aws ec2 get-console-output \
  --instance-id $(terraform output -raw ec2_instance_id) \
  --output text

# システムログ
aws ec2 get-console-screenshot \
  --instance-id $(terraform output -raw ec2_instance_id)
```

### RDS接続エラー

```bash
# エンドポイント確認
terraform output rds_endpoint

# セキュリティグループ確認
aws rds describe-db-instances \
  --db-instance-identifier $(terraform output -raw rds_instance_id) \
  --query 'DBInstances[0].VpcSecurityGroups'

# 接続テスト (EC2から)
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$(terraform output -raw ec2_public_ip)

docker run --rm -it -e PGPASSWORD=your_password postgres:15-alpine \
  psql -h YOUR_RDS_ENDPOINT -U production_user -d production_db
```

### Docker Composeが起動しない

```bash
# SSH接続
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$(terraform output -raw ec2_public_ip)

# ログ確認
sudo journalctl -u production-management -n 100

# 手動起動
cd /opt/production-management
sudo docker-compose up -d

# コンテナ状態確認
docker ps -a
docker logs production-api
```

### Terraformエラー

```bash
# 状態確認
terraform state list

# 特定リソースの再作成
terraform taint module.ec2.aws_instance.main
terraform apply

# 状態リフレッシュ
terraform refresh
```

---

## 📚 参考資料

- [Terraform設定詳細](terraform/README.md)
- [コスト最適化ガイド](terraform/COST_OPTIMIZATION.md)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

## ✅ デプロイチェックリスト

### デプロイ前
- [ ] AWS CLIがインストール済み
- [ ] Terraformがインストール済み
- [ ] AWS認証情報が設定済み
- [ ] SSH Key Pairを作成済み
- [ ] terraform.tfvarsを設定済み
- [ ] DBパスワードを変更済み
- [ ] 予算アラートを設定済み

### デプロイ中
- [ ] terraform initが成功
- [ ] terraform planを確認
- [ ] terraform applyが成功
- [ ] 出力情報を保存

### デプロイ後
- [ ] EC2にSSH接続確認
- [ ] アプリケーションファイルを転送
- [ ] データベースを初期化
- [ ] サービスが起動
- [ ] Webアプリケーションにアクセス可能
- [ ] Grafanaにアクセス可能
- [ ] スケジューラーが設定済み
- [ ] コスト監視を設定

---

**注意**: 本構成はPOC/開発環境向けです。本番環境では以下を検討してください:
- Multi-AZ構成
- 削除保護の有効化
- より厳格なセキュリティグループ
- VPN/PrivateLinkの利用
- 詳細な監視・アラート設定
