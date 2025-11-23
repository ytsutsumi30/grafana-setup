# Production Management System - AWS Terraform Deployment

POC環境向けのコスト最適化されたAWSインフラストラクチャ構成

## 📋 構成概要

### アーキテクチャ
- **Single-AZ構成** (コスト最適化)
- **EC2 + Docker Compose** (既存構成を活用)
- **RDS PostgreSQL 15** (マネージドDB)
- **自動起動/停止スケジューラ** (EventBridge)

### 月額コスト見積もり (160時間/月稼働)
```
EC2 t3.micro (160h):     ~$3-4
RDS db.t3.micro:         ~$12-15
EBS 30GB:                ~$3
Elastic IP:              ~$0 (起動中は無料)
Data Transfer:           ~$1-2
────────────────────────────
合計:                    ~$19-24/月
```

※ 24時間稼働の場合: ~$30-35/月

---

## 🚀 デプロイ手順

### 1. 前提条件

#### AWS CLI設定
```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: ap-northeast-1
# Default output format: json
```

#### SSH Key Pairの作成
```bash
# AWS Console -> EC2 -> Key Pairs -> Create key pair
# または AWS CLIで:
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

### 2. Terraform初期化

```bash
cd terraform

# 変数ファイルの作成
cp terraform.tfvars.example terraform.tfvars

# 必須項目を編集
vim terraform.tfvars
# - key_name: 作成したSSH Key名
# - db_password: 強力なパスワードに変更
# - allowed_cidr_blocks: アクセス元IPを制限
```

### 3. デプロイ実行

```bash
# Terraform初期化
terraform init

# プランの確認
terraform plan

# インフラ構築
terraform apply
# -> "yes" を入力

# 完了まで約10-15分
```

### 4. 出力情報の確認

```bash
# デプロイ情報を表示
terraform output

# 重要な情報:
# - ec2_public_ip: EC2のパブリックIP
# - application_url: アプリケーションURL
# - ssh_command: SSH接続コマンド
```

---

## 📦 アプリケーションデプロイ

### EC2へのファイル転送

```bash
# プロジェクトディレクトリに移動
cd /home/tsutsumi/grafana-setup

# EC2のIPアドレスを取得
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)

# ファイルを転送
scp -i ~/.ssh/production-management-poc.pem -r \
  api web nginx grafana prometheus postgres \
  ec2-user@$EC2_IP:/opt/production-management/

# または、rsyncで同期
rsync -avz -e "ssh -i ~/.ssh/production-management-poc.pem" \
  --exclude 'node_modules' \
  --exclude '.git' \
  api/ web/ nginx/ grafana/ prometheus/ postgres/ \
  ec2-user@$EC2_IP:/opt/production-management/
```

### SSH接続とアプリケーション起動

```bash
# SSH接続
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$EC2_IP

# アプリケーション起動
sudo systemctl start production-management

# ステータス確認
sudo systemctl status production-management
docker ps

# ログ確認
cd /opt/production-management
sudo docker-compose logs -f
```

### データベース初期化

```bash
# SSH接続後、PostgreSQLクライアントで初期化
cd /opt/production-management

# 初期化スクリプトの実行 (RDS接続)
docker run --rm -i \
  -e PGPASSWORD=$(grep DB_PASSWORD .env | cut -d'=' -f2) \
  postgres:15-alpine \
  psql -h $(grep DB_HOST .env | cut -d'=' -f2) \
  -U $(grep DB_USER .env | cut -d'=' -f2) \
  -d $(grep DB_NAME .env | cut -d'=' -f2) \
  < postgres/init/01-init.sql
```

---

## 🔧 運用管理

### スケジューラの管理

#### スケジュール確認
```bash
# EventBridge Schedulerの確認
aws scheduler list-schedules \
  --group-name poc-schedule-group

# 実行履歴の確認
aws scheduler get-schedule \
  --name poc-start-ec2 \
  --group-name poc-schedule-group
```

#### 手動起動/停止
```bash
# EC2の起動
aws ec2 start-instances --instance-ids $(terraform output -raw ec2_instance_id)

# EC2の停止
aws ec2 stop-instances --instance-ids $(terraform output -raw ec2_instance_id)

# RDSの起動
aws rds start-db-instance --db-instance-identifier $(terraform output -raw rds_instance_id)

# RDSの停止
aws rds stop-db-instance --db-instance-identifier $(terraform output -raw rds_instance_id)
```

#### スケジュール変更
```bash
# terraform.tfvarsを編集
vim terraform.tfvars

# 変更を適用
terraform apply
```

### モニタリング

#### CloudWatchログ
```bash
# EC2のログ確認
aws logs tail /aws/ec2/production-management --follow

# RDSのログ確認
aws logs tail /aws/rds/instance/poc-production-db/postgresql --follow
```

#### コスト確認
```bash
# Cost Explorerで月次コスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment
```

### バックアップ

#### RDS自動バックアップ
- 保持期間: 7日間
- バックアップウィンドウ: 03:00-04:00 UTC (12:00-13:00 JST)

#### 手動スナップショット
```bash
aws rds create-db-snapshot \
  --db-instance-identifier poc-production-db \
  --db-snapshot-identifier poc-manual-snapshot-$(date +%Y%m%d)
```

---

## 🔒 セキュリティ

### 推奨設定

#### 1. IPアドレス制限
```hcl
# terraform.tfvars
allowed_cidr_blocks = [
  "YOUR_OFFICE_IP/32",
  "YOUR_HOME_IP/32"
]
```

#### 2. DBパスワード管理
```bash
# AWS Secrets Managerの利用を推奨
aws secretsmanager create-secret \
  --name poc/db/password \
  --secret-string "YourStrongPassword123!"
```

#### 3. SSH鍵の保護
```bash
chmod 400 ~/.ssh/production-management-poc.pem
```

---

## 📈 スケールアップ

### インスタンスタイプ変更

```hcl
# terraform.tfvars
instance_type = "t3.small"      # EC2 ~$15/月
db_instance_class = "db.t3.small"  # RDS ~$25/月
```

```bash
terraform apply
```

### マルチAZ化 (本番環境用)

```hcl
# modules/rds/main.tf
multi_az = true  # 可用性向上 (コスト約2倍)
deletion_protection = true
skip_final_snapshot = false
```

---

## 🗑️ 環境削除

```bash
cd terraform

# 全リソースの削除
terraform destroy
# -> "yes" を入力

# 確認
aws ec2 describe-instances --filters "Name=tag:Environment,Values=poc"
aws rds describe-db-instances --db-instance-identifier poc-production-db
```

---

## 📊 コスト最適化Tips

### 1. スケジューラの最適化
```hcl
# 土日完全停止 (月160時間 → 週40時間で約75%削減)
start_schedule = "cron(0 0 ? * MON *)"     # 月曜 9:00 JST
stop_schedule  = "cron(0 10 ? * FRI *)"    # 金曜 19:00 JST
```

### 2. RDS停止時の注意
- RDSは7日後に自動起動される
- 長期停止の場合はスナップショット取得 + 削除を検討

### 3. スポットインスタンスの利用
```hcl
# EC2スポット料金で最大90%削減 (中断リスクあり)
# 別途スポットインスタンス設定が必要
```

---

## 🆘 トラブルシューティング

### EC2が起動しない
```bash
# ログ確認
aws ec2 get-console-output --instance-id $(terraform output -raw ec2_instance_id)

# セキュリティグループ確認
aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id)
```

### RDS接続エラー
```bash
# エンドポイント確認
terraform output rds_endpoint

# セキュリティグループ確認
aws rds describe-db-instances --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].VpcSecurityGroups'
```

### アプリケーションが起動しない
```bash
# SSH接続してログ確認
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$EC2_IP

sudo systemctl status production-management
sudo docker-compose logs
journalctl -u production-management -f
```

---

## 📚 参考資料

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [EC2 Cost Optimization](https://aws.amazon.com/jp/ec2/cost-optimization/)

---

## 📞 サポート

問題が発生した場合:

1. CloudWatchログを確認
2. `terraform plan` で差分を確認
3. AWS Cost Explorerで予期しないコストをチェック
4. 必要に応じて `terraform destroy` で削除して再構築
