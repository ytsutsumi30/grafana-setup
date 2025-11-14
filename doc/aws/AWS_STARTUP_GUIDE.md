# AWS 生産管理システム - 起動ガイド

このガイドでは、AWS上で生産管理システムを稼働させるための手順を説明します。

## 📋 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [初回セットアップ](#初回セットアップ)
4. [日次運用](#日次運用)
5. [コマンドリファレンス](#コマンドリファレンス)
6. [トラブルシューティング](#トラブルシューティング)
7. [コスト管理](#コスト管理)

---

## 🎯 概要

### aws-startup.sh スクリプトでできること

このスクリプトは、AWS上での生産管理システムの全ライフサイクルを管理します：

✅ **インフラ構築** - Terraform による AWS リソースの自動作成  
✅ **アプリケーションデプロイ** - EC2 へのファイル転送と設定  
✅ **データベース初期化** - RDS PostgreSQL のセットアップ  
✅ **起動・停止** - コスト削減のための自動起動/停止  
✅ **監視** - ヘルスチェックとログ確認  
✅ **バックアップ** - データベースのスナップショット作成  

### アーキテクチャ

```
┌─────────────────────────────────────────────┐
│             Internet                         │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────▼──────────┐
        │  Elastic IP (固定IP) │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │  EC2 (t3.micro)     │
        │  - Docker           │
        │  - nginx            │
        │  - Node.js API      │
        │  - Web Frontend     │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │ RDS PostgreSQL 15  │
        │ (db.t3.micro)      │
        └────────────────────┘
```

---

## 🔧 前提条件

### 1. 必須ツールのインストール

#### AWS CLI
```bash
# macOS
brew install awscli

# Linux (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install awscli

# または pip でインストール
pip install awscli
```

#### Terraform
```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Linux (Ubuntu/Debian)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### 2. AWS 認証情報の設定

```bash
aws configure
```

入力項目：
- **AWS Access Key ID**: あなたのアクセスキー
- **AWS Secret Access Key**: あなたのシークレットキー
- **Default region**: `ap-northeast-1` (東京リージョン推奨)
- **Default output format**: `json`

### 3. SSH キーペアの作成

AWS コンソールまたは CLI で SSH キーペアを作成：

```bash
# AWS CLI で作成する場合
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

---

## 🚀 初回セットアップ

### ステップ 1: Terraform 設定ファイルの準備

```bash
cd terraform

# サンプル設定をコピー
cp terraform.tfvars.example terraform.tfvars

# 設定ファイルを編集
vim terraform.tfvars
```

**必須設定項目:**

```hcl
# SSH接続用のキーペア名
key_name = "production-management-poc"

# データベースパスワード（強力なパスワードに変更）
db_password = "YourStrongPassword123!"

# アクセス許可するIPアドレス（あなたのIPに制限）
allowed_cidr_blocks = [
  "203.0.113.0/32",  # あなたのオフィスIP
  "198.51.100.0/32"  # あなたの自宅IP
]

# スケジューラ設定（オプション）
enable_scheduler = true
start_schedule   = "cron(0 0 ? * MON-FRI *)"  # 平日 9:00 JST 起動
stop_schedule    = "cron(0 10 ? * MON-FRI *)" # 平日 19:00 JST 停止
```

### ステップ 2: デプロイ実行

```bash
# プロジェクトルートに戻る
cd ..

# フルデプロイを実行
./aws-startup.sh deploy
```

デプロイフローが実行されます：
1. ✅ 前提条件チェック
2. ✅ Terraform 初期化
3. ✅ インフラ構築プラン表示
4. ⏸️ 確認プロンプト → `yes` を入力
5. ✅ AWS リソース作成（10-15分）
6. ⏸️ アプリデプロイ確認 → `yes` を入力
7. ✅ ファイルアップロード
8. ✅ SSL証明書生成
9. ✅ データベース初期化
10. ✅ アプリケーション起動
11. 📊 アクセス情報表示

### ステップ 3: アクセス確認

デプロイ完了後、表示されたURLにアクセス：

```
🌐 アクセス URL:
  HTTP:         http://203.0.113.100
  HTTPS:        https://203.0.113.100
  QR検品:       http://203.0.113.100/qr-inspection.html
  出荷検品:     http://203.0.113.100/shipping-inspection-mockup.html
```

---

## 📅 日次運用

### 朝：システム起動

```bash
./aws-startup.sh start
```

実行内容：
- EC2 インスタンス起動
- RDS インスタンス起動
- Docker コンテナ起動
- ヘルスチェック

⏱️ 所要時間: 約3-5分

### 業務中：ステータス確認

```bash
# ステータス確認
./aws-startup.sh status

# ヘルスチェック
./aws-startup.sh health

# ログ確認（リアルタイム）
./aws-startup.sh logs
```

### 夜：システム停止

```bash
./aws-startup.sh stop
```

実行内容：
- Docker コンテナ停止
- EC2 インスタンス停止
- RDS インスタンス停止

⏱️ 所要時間: 約2-3分

💰 **コスト削減効果**: 停止中はEC2とRDSの時間課金が発生しません

---

## 📖 コマンドリファレンス

### 基本コマンド

```bash
# ヘルプ表示
./aws-startup.sh help

# 初回デプロイ
./aws-startup.sh deploy

# システム起動
./aws-startup.sh start

# システム停止
./aws-startup.sh stop

# システム再起動
./aws-startup.sh restart
```

### 監視・診断コマンド

```bash
# ステータス確認
./aws-startup.sh status
# 出力例:
# 📊 EC2 Instance:
#   ● running
#   IP: 203.0.113.100
# 📊 RDS Instance:
#   ● available
# 🌐 Application Health:
#   ● Healthy (HTTP 200)

# ヘルスチェック
./aws-startup.sh health
# 出力例:
# 🌐 HTTP Health Check:
#   ✓ HTTP: 200
#   ✓ HTTPS: 200
# 🔧 API Health Check:
#   ✓ API Health: 200
# 🐳 Docker Containers:
#   production-nginx    Up 2 hours
#   production-api      Up 2 hours

# ログ表示（リアルタイム）
./aws-startup.sh logs
# Ctrl+C で終了
```

### 運用コマンド

```bash
# SSH接続
./aws-startup.sh ssh

# データベースバックアップ
./aws-startup.sh backup

# デプロイ情報表示
./aws-startup.sh outputs
```

### 削除コマンド

```bash
# 全リソース削除（注意！）
./aws-startup.sh destroy
```

⚠️ **警告**: `destroy` コマンドは全てのAWSリソースとデータを削除します！

---

## 🔍 トラブルシューティング

### 問題 1: アプリケーションにアクセスできない

```bash
# ステータス確認
./aws-startup.sh status

# ヘルスチェック
./aws-startup.sh health

# ログ確認
./aws-startup.sh logs
```

**確認ポイント:**
- EC2が `running` 状態か？
- セキュリティグループでポート80/443が開いているか？
- アクセス元IPが `allowed_cidr_blocks` に含まれているか？

### 問題 2: SSH接続ができない

```bash
# SSH鍵のパーミッション確認
ls -l ~/.ssh/*.pem

# パーミッション修正
chmod 400 ~/.ssh/production-management-poc.pem

# 手動SSH接続テスト
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)
ssh -i ~/.ssh/production-management-poc.pem ec2-user@$EC2_IP
```

### 問題 3: データベース接続エラー

```bash
# SSH接続してログ確認
./aws-startup.sh ssh

# RDSエンドポイント確認
cd /opt/production-management
grep DB_HOST api/.env

# データベース接続テスト
docker run --rm -e PGPASSWORD=production_pass postgres:15-alpine \
  psql -h <RDS_ENDPOINT> -U production_user -d production_db -c "SELECT 1"
```

### 問題 4: Docker コンテナが起動しない

```bash
# SSH接続
./aws-startup.sh ssh

cd /opt/production-management

# コンテナ状態確認
docker ps -a

# ログ確認
docker-compose logs

# コンテナ再起動
docker-compose down
docker-compose up -d

# イメージ再ビルド（必要な場合）
docker-compose build --no-cache
docker-compose up -d
```

### 問題 5: Terraform エラー

```bash
cd terraform

# 状態確認
terraform state list

# 特定リソースの状態確認
terraform state show aws_instance.production_ec2

# 状態のリフレッシュ
terraform refresh

# プランの再確認
terraform plan
```

### 緊急対応: 完全リセット

```bash
# 全削除
./aws-startup.sh destroy

# Terraform 状態削除
cd terraform
rm -rf .terraform terraform.tfstate*

# 再デプロイ
cd ..
./aws-startup.sh deploy
```

---

## 💰 コスト管理

### 月額コスト見積もり

#### パターン A: 平日のみ稼働（推奨）
**稼働時間**: 月～金 9:00-19:00 (週50時間 × 4週 = 月200時間)

| リソース | 月額コスト |
|---------|-----------|
| EC2 t3.micro (200h) | $4-5 |
| RDS db.t3.micro (200h) | $15-18 |
| EBS 30GB | $3 |
| Elastic IP | $0 (起動中) |
| Data Transfer | $1-2 |
| **合計** | **$23-28** |

#### パターン B: 24時間稼働
**稼働時間**: 24時間 × 30日 = 月720時間

| リソース | 月額コスト |
|---------|-----------|
| EC2 t3.micro (720h) | $15-18 |
| RDS db.t3.micro (720h) | $25-30 |
| EBS 30GB | $3 |
| Elastic IP | $0 (起動中) |
| Data Transfer | $2-3 |
| **合計** | **$45-54** |

### コスト削減のヒント

#### 1. スケジューラーの活用

`terraform/terraform.tfvars` でスケジュール設定：

```hcl
enable_scheduler = true

# 平日のみ稼働（週末停止で約40%削減）
start_schedule = "cron(0 0 ? * MON *)"     # 月曜 9:00 JST
stop_schedule  = "cron(0 10 ? * FRI *)"    # 金曜 19:00 JST

# 営業時間のみ稼働（最大75%削減）
start_schedule = "cron(0 0 ? * MON-FRI *)" # 平日 9:00 JST
stop_schedule  = "cron(0 10 ? * MON-FRI *)" # 平日 19:00 JST
```

#### 2. 定期的なバックアップ

```bash
# 週次バックアップ
./aws-startup.sh backup

# 古いスナップショットの削除（コンソールまたはCLI）
aws rds describe-db-snapshots --db-instance-identifier poc-production-db
aws rds delete-db-snapshot --db-snapshot-identifier old-snapshot-id
```

#### 3. コスト監視

```bash
# 当月のコスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 day ago" +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment

# CloudWatch での監視設定
# AWS Console > CloudWatch > Billing Alarms
```

#### 4. 不要なリソースの削除

```bash
# 使用していないスナップショットの確認
aws rds describe-db-snapshots

# 古いAMIの削除
aws ec2 describe-images --owners self

# 未使用のEBSボリュームの確認
aws ec2 describe-volumes --filters Name=status,Values=available
```

---

## 📚 参考情報

### 関連ドキュメント

- [README.md](./README.md) - システム全体の概要
- [CLAUDE.md](./CLAUDE.md) - 開発者向け詳細ガイド
- [terraform/README.md](./terraform/README.md) - Terraform 詳細ガイド

### AWS ドキュメント

- [AWS CLI リファレンス](https://docs.aws.amazon.com/cli/)
- [EC2 ユーザーガイド](https://docs.aws.amazon.com/ec2/)
- [RDS PostgreSQL ガイド](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/)

### サポート

問題が解決しない場合：

1. **ログ確認**: `./aws-startup.sh logs`
2. **ステータス確認**: `./aws-startup.sh status`
3. **ヘルスチェック**: `./aws-startup.sh health`
4. **SSH接続して詳細調査**: `./aws-startup.sh ssh`
5. **最終手段**: `./aws-startup.sh destroy` → `./aws-startup.sh deploy`

---

## 🎓 クイックリファレンス

### 初回セットアップ（5ステップ）

```bash
# 1. AWS認証設定
aws configure

# 2. SSH鍵作成
aws ec2 create-key-pair --key-name production-management-poc \
  --query 'KeyMaterial' --output text > ~/.ssh/production-management-poc.pem
chmod 400 ~/.ssh/production-management-poc.pem

# 3. Terraform設定
cd terraform
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars  # key_name, db_password, allowed_cidr_blocks を設定

# 4. デプロイ
cd ..
./aws-startup.sh deploy

# 5. アクセス確認
./aws-startup.sh status
```

### 日次運用（3コマンド）

```bash
# 朝
./aws-startup.sh start

# 確認
./aws-startup.sh status

# 夜
./aws-startup.sh stop
```

### 緊急時（トラブル対応）

```bash
# ヘルスチェック
./aws-startup.sh health

# ログ確認
./aws-startup.sh logs

# SSH接続
./aws-startup.sh ssh

# 再起動
./aws-startup.sh restart
```

---

**以上で AWS 生産管理システムの起動ガイドは完了です！** 🎉

質問や問題があれば、このガイドの[トラブルシューティング](#トラブルシューティング)セクションを参照してください。
