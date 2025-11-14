# AWS生産管理システム - デプロイメントガイド

AWS上で生産管理システムを稼働開始するための完全ガイドです。

## 📋 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [クイックスタート](#クイックスタート)
- [詳細手順](#詳細手順)
- [運用管理](#運用管理)
- [トラブルシューティング](#トラブルシューティング)
- [コスト管理](#コスト管理)

---

## 🌟 概要

### システム構成

```
┌─────────────────────────────────────────────────────┐
│                    AWS Cloud                        │
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │   EC2 (t3)   │────────▶│ RDS PostgreSQL│        │
│  │              │         │   (db.t3)     │        │
│  │ - nginx      │         └──────────────┘        │
│  │ - Node.js API│                                  │
│  │ - Docker     │         ┌──────────────┐        │
│  └──────────────┘         │ EventBridge  │        │
│         ▲                 │  Scheduler   │        │
│         │                 │ (自動起動/停止)│        │
│         │                 └──────────────┘        │
│  ┌──────┴──────┐                                  │
│  │   Browser   │                                   │
│  │  (http/https)│                                  │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

### 特徴

- ✅ **コスト最適化**: 自動起動/停止スケジューラで月額 $19-24
- ✅ **簡単デプロイ**: 1コマンドでフルデプロイ
- ✅ **自動化**: データベース初期化、SSL証明書生成を自動化
- ✅ **監視対応**: Grafana/Prometheus統合（オプション）
- ✅ **柔軟な管理**: 起動、停止、再起動、ログ確認など豊富なコマンド

### 月額コスト見積もり（160時間/月稼働）

| リソース | 仕様 | 月額コスト |
|---------|-----|-----------|
| EC2 | t3.micro (160h) | $3-4 |
| RDS | db.t3.micro | $12-15 |
| EBS | 30GB | $3 |
| Elastic IP | 起動中は無料 | $0 |
| Data Transfer | 約1GB | $1-2 |
| **合計** | | **$19-24** |

※ 24時間稼働の場合: 約 $30-35/月

---

## 🚀 前提条件

### 必須ツール

1. **Terraform** (v1.0+)
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **AWS CLI** (v2+)
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

3. **rsync** (ファイル同期用)
   ```bash
   # 通常、デフォルトでインストール済み
   which rsync
   ```

### AWS設定

#### 1. AWS認証情報の設定

```bash
aws configure
```

入力項目:
- **AWS Access Key ID**: あなたのアクセスキー
- **AWS Secret Access Key**: あなたのシークレットキー
- **Default region**: `ap-northeast-1` (東京リージョン推奨)
- **Default output format**: `json`

#### 2. SSH Key Pairの作成

```bash
# AWS CLIで作成
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

# パーミッション設定
chmod 400 ~/.ssh/production-management-poc.pem
```

または、AWS Console で作成:
1. EC2 → Key Pairs → Create key pair
2. 名前: `production-management-poc`
3. ダウンロードした .pem ファイルを `~/.ssh/` に保存

---

## ⚡ クイックスタート

### 最短3ステップでデプロイ

#### Step 1: 前提条件チェック

```bash
cd /home/user/webapp
./aws-startup.sh check
```

✅ すべてのチェックがパスすることを確認

#### Step 2: 設定ファイルの編集

```bash
# terraform.tfvarsを作成・編集
cd terraform
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars
```

必須の編集項目:
```hcl
# SSH Key名（作成したKey Pair名）
key_name = "production-management-poc"

# データベースパスワード（強力なものに変更）
db_password = "YourStrongPassword123!"

# アクセス元IPアドレス制限（あなたのIPに変更）
allowed_cidr_blocks = [
  "YOUR_IP_ADDRESS/32"  # 例: "203.0.113.1/32"
]
```

#### Step 3: フルデプロイ実行

```bash
cd /home/user/webapp
./aws-startup.sh full
```

⏳ 約15-20分で完了します

完了後、表示されるURLにアクセス:
- HTTP: `http://YOUR_EC2_IP`
- HTTPS: `https://YOUR_EC2_IP`

---

## 📖 詳細手順

### 個別コマンドで段階的にデプロイ

#### 1. 前提条件チェック

```bash
./aws-startup.sh check
```

出力例:
```
[SUCCESS] Terraform: インストール済み (v1.6.0)
[SUCCESS] AWS CLI: インストール済み (aws-cli/2.13.0)
[SUCCESS] AWS認証: 設定済み (Account: 123456789012, Region: ap-northeast-1)
✅ すべての前提条件を満たしています
```

#### 2. Terraform初期化

```bash
./aws-startup.sh setup
```

初回実行時に `terraform.tfvars` を編集するよう促されます。

#### 3. インフラデプロイ

```bash
./aws-startup.sh deploy
```

作成されるリソース:
- VPC、サブネット、セキュリティグループ
- EC2インスタンス (t3.micro)
- RDS PostgreSQL (db.t3.micro)
- EventBridge Scheduler（自動起動/停止）

#### 4. アプリケーション起動

```bash
./aws-startup.sh start
```

以下が自動実行されます:
- アプリケーションファイルのアップロード
- 環境変数設定 (.env生成)
- SSL証明書生成
- データベーススキーマ初期化
- Dockerコンテナ起動

#### 5. ステータス確認

```bash
./aws-startup.sh status
```

出力例:
```
🌐 AWS リソース状態:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EC2 Instance: running
  - Instance ID: i-0123456789abcdef0
  - Public IP: 203.0.113.1
RDS Database: available
  - Instance ID: poc-production-db

🔗 アクセスURL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP:  http://203.0.113.1
HTTPS: https://203.0.113.1
API:   http://203.0.113.1/api/health

📦 Docker コンテナ状態:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAMES                 STATUS              PORTS
production-nginx      Up 5 minutes        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
production-api        Up 5 minutes        0.0.0.0:3000->3000/tcp
```

---

## 🔧 運用管理

### システム操作

#### システム起動

```bash
./aws-startup.sh start
```

監視システム（Grafana/Prometheus）も起動:
```bash
./aws-startup.sh start --monitoring
```

#### システム停止

```bash
./aws-startup.sh stop
```

停止されるもの:
- EC2インスタンス
- RDSインスタンス（7日後に自動起動）
- Dockerコンテナ

#### システム再起動

```bash
./aws-startup.sh restart
```

#### ログ表示

```bash
./aws-startup.sh logs
```

リアルタイムでログを表示（Ctrl+C で終了）

### SSH接続

```bash
./aws-startup.sh ssh
```

接続後の作業ディレクトリ: `/opt/production-management`

手動でDockerコマンドを実行する場合:
```bash
cd /opt/production-management
docker-compose ps
docker-compose logs -f production-api
docker-compose restart nginx
```

### 設定変更

#### 環境変数の変更

```bash
./aws-startup.sh ssh

cd /opt/production-management
vim api/.env

# 変更後、APIコンテナを再起動
docker-compose restart production-api
```

#### スケジュール変更

```bash
cd terraform
vim terraform.tfvars

# スケジュール設定例
start_schedule = "cron(0 0 ? * MON-FRI *)"  # 平日 9:00 JST
stop_schedule  = "cron(0 10 ? * MON-FRI *)" # 平日 19:00 JST

# 変更を適用
terraform apply
```

### データベース操作

#### PostgreSQL直接接続

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

docker run --rm -it \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

#### データベースバックアップ

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# ダンプ作成
docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

#### データベースリストア

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# リストア実行
docker run --rm -i \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20231201.sql
```

### 監視システム

#### Grafana起動（オプション）

```bash
./aws-startup.sh ssh

cd /opt/production-management
docker-compose --profile monitoring up -d grafana prometheus
```

アクセス:
- **Grafana**: `http://YOUR_EC2_IP/grafana/`
- **ログイン**: admin / admin123

### RDS手動スナップショット

```bash
# スナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier poc-production-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)

# スナップショット一覧
aws rds describe-db-snapshots \
  --db-instance-identifier poc-production-db
```

---

## 🆘 トラブルシューティング

### よくある問題と解決方法

#### 1. SSH接続できない

**症状**: `./aws-startup.sh ssh` で接続タイムアウト

**原因と解決策**:
```bash
# 1. EC2が起動しているか確認
./aws-startup.sh status

# 2. セキュリティグループでSSH許可されているか確認
cd terraform
terraform output security_group_id

aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id) \
  --query 'SecurityGroups[0].IpPermissions'

# 3. SSH Key のパーミッション確認
ls -l ~/.ssh/production-management-poc.pem
# -r-------- であることを確認

chmod 400 ~/.ssh/production-management-poc.pem
```

#### 2. アプリケーションにアクセスできない

**症状**: ブラウザで `http://EC2_IP` にアクセスできない

**チェックリスト**:
```bash
# 1. EC2が起動しているか
./aws-startup.sh status

# 2. Dockerコンテナが起動しているか
./aws-startup.sh ssh
docker ps

# 3. nginxのログを確認
docker-compose logs nginx

# 4. セキュリティグループでポート80/443が開いているか確認
# terraform.tfvars の allowed_cidr_blocks に自分のIPが含まれているか
```

#### 3. データベース接続エラー

**症状**: API起動時に "cannot connect to database"

**解決策**:
```bash
./aws-startup.sh ssh

cd /opt/production-management

# 1. .env ファイルの確認
cat api/.env

# 2. RDSへの接続テスト
export $(grep -v '^#' api/.env | xargs)

docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT 1"

# 3. RDSのセキュリティグループ確認
aws rds describe-db-instances \
  --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].VpcSecurityGroups'
```

#### 4. RDSが7日後に自動起動される

**原因**: RDSの仕様で、手動停止後7日で自動起動されます

**対策**:
1. **短期停止の場合**: そのまま放置（自動起動される）
2. **長期停止の場合**: スナップショット取得後、RDSインスタンスを削除

```bash
# スナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier poc-production-db \
  --db-snapshot-identifier long-term-backup-$(date +%Y%m%d)

# RDS削除（コスト削減）
cd terraform
vim terraform.tfvars
# 一時的に skip_final_snapshot = true に設定

terraform destroy -target=module.rds
```

#### 5. デプロイ中にエラーが発生

**症状**: `terraform apply` でエラー

**一般的な対処法**:
```bash
# 1. Terraformの状態をリフレッシュ
cd terraform
terraform refresh

# 2. エラー詳細を確認
terraform plan

# 3. 特定のリソースのみ再作成
terraform taint aws_instance.main
terraform apply

# 4. 最終手段: 全削除して再デプロイ
terraform destroy
terraform apply
```

### ログ確認方法

#### アプリケーションログ

```bash
./aws-startup.sh ssh

# すべてのコンテナログ
cd /opt/production-management
docker-compose logs -f

# 特定のコンテナログ
docker-compose logs -f production-api
docker-compose logs -f production-nginx
```

#### EC2システムログ

```bash
# コンソール出力を取得
cd terraform
aws ec2 get-console-output \
  --instance-id $(terraform output -raw ec2_instance_id)

# CloudWatch Logs（設定されている場合）
aws logs tail /aws/ec2/production-management --follow
```

#### RDSログ

```bash
aws logs tail /aws/rds/instance/poc-production-db/postgresql --follow
```

---

## 💰 コスト管理

### コスト確認

#### AWS Cost Explorer

```bash
# 月次コスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment
```

#### リソース別コスト

```bash
# EC2コスト
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --filter file://filter.json \
  --metrics BlendedCost

# filter.json内容:
# {
#   "Dimensions": {
#     "Key": "SERVICE",
#     "Values": ["Amazon Elastic Compute Cloud - Compute"]
#   }
# }
```

### コスト最適化Tips

#### 1. 稼働時間の削減

```bash
# 平日のみ稼働（週40時間）
cd terraform
vim terraform.tfvars

start_schedule = "cron(0 0 ? * MON *)"     # 月曜 9:00 JST
stop_schedule  = "cron(0 10 ? * FRI *)"    # 金曜 19:00 JST

terraform apply
```

月額コスト削減効果: **約75%削減** ($20 → $5)

#### 2. インスタンスサイズの変更

開発/テスト環境の場合:
```bash
cd terraform
vim terraform.tfvars

# より小さいインスタンス（t3.micro → t2.micro）
instance_type = "t2.micro"          # さらに安価
db_instance_class = "db.t2.micro"   # さらに安価

terraform apply
```

本番環境でパフォーマンスが必要な場合:
```bash
# より大きいインスタンス
instance_type = "t3.small"          # 月額 $15
db_instance_class = "db.t3.small"   # 月額 $25

terraform apply
```

#### 3. 不要なリソースの削除

```bash
# 監視システムが不要な場合
./aws-startup.sh ssh
cd /opt/production-management
docker-compose --profile monitoring down

# Elastic IP削除（使用しない場合）
# terraform.tfvars で設定
```

#### 4. Reserved Instances（長期利用の場合）

1年間の継続利用が確定している場合:
- EC2 Reserved Instance: 約40%削減
- RDS Reserved Instance: 約35%削減

AWS Console → EC2/RDS → Reserved Instances から購入

### 予算アラート設定

```bash
# AWS Budgets で予算アラート作成
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

---

## 🗑️ システム削除

### 完全削除

```bash
cd /home/user/webapp
./aws-startup.sh destroy
```

確認プロンプトで `DELETE` と入力すると削除されます。

削除されるもの:
- ✅ EC2インスタンス
- ✅ RDSインスタンス（最終スナップショット作成）
- ✅ VPC、サブネット、セキュリティグループ
- ✅ EventBridge Scheduler

保持されるもの:
- SSH Key Pair（手動削除が必要）
- RDS最終スナップショット（手動削除が必要）

### 手動クリーンアップ

```bash
# SSH Keyの削除
aws ec2 delete-key-pair --key-name production-management-poc
rm ~/.ssh/production-management-poc.pem

# RDSスナップショットの削除
aws rds describe-db-snapshots \
  --db-instance-identifier poc-production-db

aws rds delete-db-snapshot \
  --db-snapshot-identifier poc-production-db-final-snapshot
```

---

## 📚 参考資料

### 公式ドキュメント

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Amazon EC2 User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/)
- [AWS Cost Optimization](https://aws.amazon.com/jp/ec2/cost-optimization/)

### システム関連

- [プロジェクトREADME](./README.md)
- [Claude向けガイド](./CLAUDE.md)
- [Terraformディレクトリ](./terraform/README.md)

---

## 📞 サポート

### 問題が解決しない場合

1. **ログを確認**: `./aws-startup.sh logs`
2. **ステータス確認**: `./aws-startup.sh status`
3. **Terraform状態確認**: `cd terraform && terraform plan`
4. **AWS Cost Explorer確認**: 予期しないコストが発生していないかチェック
5. **再デプロイ**: `./aws-startup.sh destroy` → `./aws-startup.sh full`

### よく使うコマンド一覧

```bash
# クイックリファレンス
./aws-startup.sh check          # 前提条件チェック
./aws-startup.sh full           # フルデプロイ
./aws-startup.sh start          # システム起動
./aws-startup.sh stop           # システム停止
./aws-startup.sh restart        # システム再起動
./aws-startup.sh status         # ステータス確認
./aws-startup.sh logs           # ログ表示
./aws-startup.sh ssh            # SSH接続
./aws-startup.sh destroy        # 全削除
```

---

## 🎉 おわりに

このガイドを使って、AWS上で生産管理システムを稼働させることができます。

質問や問題がある場合は、トラブルシューティングセクションを参照してください。

Happy Deploying! 🚀
