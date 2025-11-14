# AWS 生産管理システム デプロイメントガイド

## 🎯 概要

このガイドでは、`aws-startup.sh` スクリプトを使用してAWS上で生産管理システムを起動・管理する方法を説明します。

## 📋 システム構成

### インフラストラクチャ
- **EC2 (t3.micro)**: Dockerコンテナホスト
- **RDS PostgreSQL 15 (db.t3.micro)**: マネージドデータベース
- **Elastic IP**: 固定IPアドレス
- **Security Group**: ファイアウォール設定
- **EventBridge Scheduler**: 自動起動/停止

### アプリケーション
- **nginx**: リバースプロキシ & 静的ファイル配信
- **Node.js API**: Express サーバー
- **PostgreSQL**: データベース (RDS)
- **Grafana** (オプション): 監視ダッシュボード
- **Prometheus** (オプション): メトリクス収集

## 💰 コスト見積もり

### 月額コスト (160時間/月稼働)
```
EC2 t3.micro (160h):     $3-4
RDS db.t3.micro:         $12-15
EBS 30GB:                $3
Elastic IP:              $0 (起動中は無料)
Data Transfer:           $1-2
──────────────────────────
合計:                    ~$19-24/月
```

### 24時間稼働の場合
```
合計:                    ~$30-35/月
```

## 🚀 クイックスタート

### 1. 前提条件の準備

#### AWS CLI のインストールと設定
```bash
# AWS CLI インストール (既にインストール済みならスキップ)
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt install awscli

# Amazon Linux
sudo yum install awscli

# AWS 認証情報の設定
aws configure
```

設定項目:
- **AWS Access Key ID**: IAMユーザーのアクセスキー
- **AWS Secret Access Key**: IAMユーザーのシークレットキー
- **Default region**: `ap-northeast-1` (東京リージョン推奨)
- **Default output format**: `json`

#### Terraform のインストール
```bash
# macOS
brew install terraform

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# バージョン確認
terraform version
```

#### SSH Key Pair の作成
```bash
# AWS Console で作成する場合:
# EC2 > Key Pairs > Create key pair
# Name: production-management-poc
# Type: RSA
# Format: .pem
# ダウンロード後、~/.ssh/ に移動

# AWS CLI で作成する場合:
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

### 2. 初回セットアップ

```bash
# プロジェクトディレクトリに移動
cd /home/user/webapp

# セットアップスクリプトを実行
./aws-startup.sh setup
```

このコマンドは以下を実行します:
- Terraform の初期化
- `terraform.tfvars` の作成 (編集が必要)

**重要**: セットアップ後、`terraform/terraform.tfvars` を編集してください:

```hcl
# terraform/terraform.tfvars
project_name = "production-mgmt"
environment  = "poc"

# 必須: 作成したSSH Key名を設定
key_name = "production-management-poc"

# 必須: 強力なパスワードに変更
db_password = "YourStrongPassword123!"

# 推奨: アクセス元IPを制限 (セキュリティ向上)
allowed_cidr_blocks = [
  "YOUR_OFFICE_IP/32",
  "YOUR_HOME_IP/32"
]

# オプション: スケジューラ設定
enable_scheduler = true
start_schedule   = "cron(0 0 ? * MON-FRI *)"  # 平日 9:00 JST
stop_schedule    = "cron(0 10 ? * MON-FRI *)" # 平日 19:00 JST
```

### 3. フルデプロイ (推奨)

初回デプロイは `full-deploy` コマンドで一括実行:

```bash
./aws-startup.sh full-deploy
```

このコマンドは以下を実行します:
1. ✅ インフラストラクチャのデプロイ (10-15分)
2. ✅ アプリケーションファイルのアップロード
3. ✅ データベースの初期化
4. ✅ アプリケーションの起動

完了後、アクセスURLが表示されます。

## 📚 コマンドリファレンス

### システム管理コマンド

#### 初回セットアップ
```bash
./aws-startup.sh setup
```
- Terraform初期化
- terraform.tfvars作成

#### インフラデプロイ
```bash
./aws-startup.sh deploy
```
- EC2/RDS/ネットワーク構築

#### フルデプロイ (推奨)
```bash
./aws-startup.sh full-deploy
```
- インフラ + アプリ + DB を一括デプロイ

#### システム起動
```bash
./aws-startup.sh start
```
- 停止中のEC2/RDSを起動

#### システム停止
```bash
./aws-startup.sh stop
```
- EC2/RDSを停止 (コスト削減)

#### システム再起動
```bash
./aws-startup.sh restart
```
- EC2/RDSを再起動

#### 状態確認
```bash
./aws-startup.sh status
```
- EC2/RDS/アプリの状態確認

### アプリケーション管理コマンド

#### SSH接続
```bash
./aws-startup.sh ssh
```
- EC2にSSH接続

#### ログ表示
```bash
./aws-startup.sh logs
```
- Docker Composeログを表示

#### ファイルアップロード
```bash
./aws-startup.sh upload
```
- ローカルファイルをEC2にアップロード

#### データベース初期化
```bash
./aws-startup.sh init-db
```
- データベーススキーマを初期化

### 運用管理コマンド

#### コスト見積もり
```bash
./aws-startup.sh cost
```
- 月額コスト見積もりを表示

#### バックアップ
```bash
./aws-startup.sh backup
```
- RDSスナップショットを作成

#### 全削除
```bash
./aws-startup.sh destroy
```
- 全リソースを削除 (警告: データも削除)

#### ヘルプ表示
```bash
./aws-startup.sh help
```
- 全コマンドのヘルプを表示

### オプションフラグ

```bash
# 確認スキップ (自動化用)
./aws-startup.sh start --yes

# 詳細ログ表示
./aws-startup.sh deploy --verbose

# 静かに実行
./aws-startup.sh status --quiet
```

## 🔄 典型的なワークフロー

### 初回デプロイ
```bash
# 1. セットアップ
./aws-startup.sh setup

# 2. terraform.tfvars を編集
nano terraform/terraform.tfvars

# 3. フルデプロイ
./aws-startup.sh full-deploy

# 4. 状態確認
./aws-startup.sh status
```

### 日常運用
```bash
# 朝: システム起動
./aws-startup.sh start

# 状態確認
./aws-startup.sh status

# 夕方: システム停止 (コスト削減)
./aws-startup.sh stop
```

### コード更新
```bash
# 1. ローカルでコード修正
vim web/app.js

# 2. EC2にアップロード
./aws-startup.sh upload

# 3. SSH接続してコンテナ再起動
./aws-startup.sh ssh
# EC2内で:
cd /opt/production-management
docker-compose restart
```

### トラブルシューティング
```bash
# ログ確認
./aws-startup.sh logs

# SSH接続して詳細調査
./aws-startup.sh ssh

# システム再起動
./aws-startup.sh restart
```

### プロジェクト終了
```bash
# バックアップ
./aws-startup.sh backup

# 全削除
./aws-startup.sh destroy
```

## 🌐 アクセス方法

デプロイ完了後、以下のURLでアクセスできます:

### Web アプリケーション
```
HTTP:  http://EC2_PUBLIC_IP
HTTPS: https://EC2_PUBLIC_IP
```

### 主要ページ
```
トップページ:        http://EC2_PUBLIC_IP/
出荷検品:            http://EC2_PUBLIC_IP/shipping-inspection-mockup.html
カメラテスト:        http://EC2_PUBLIC_IP/camera-test.html
Grafana (オプション): http://EC2_PUBLIC_IP/grafana/
```

### SSH接続
```bash
ssh -i ~/.ssh/production-management-poc.pem ec2-user@EC2_PUBLIC_IP
```

IPアドレスは `./aws-startup.sh status` で確認できます。

## 📱 iPhone/iPad アクセス

### QRスキャナー使用 (HTTPS必須)

1. **HTTPSアクセス**: `https://EC2_PUBLIC_IP`
2. **証明書警告を受け入れる**:
   - Safari: "詳細を表示" → "Webサイトを表示"
   - Chrome: "詳細設定" → "続行"
3. **カメラ権限を許可**
4. **QRコードをスキャン**

### 通常の検品 (HTTP可)

1. **HTTPアクセス**: `http://EC2_PUBLIC_IP`
2. **出荷検品ページに移動**
3. **手動入力で検品**

## 🔧 運用管理

### 自動起動/停止スケジューラ

`terraform.tfvars` で設定:

```hcl
enable_scheduler = true
start_schedule   = "cron(0 0 ? * MON-FRI *)"  # 平日 9:00 JST
stop_schedule    = "cron(0 10 ? * MON-FRI *)" # 平日 19:00 JST
```

時刻はUTC表記です (JST = UTC + 9時間):
- 9:00 JST = 0:00 UTC
- 19:00 JST = 10:00 UTC

### 手動起動/停止

```bash
# 起動
./aws-startup.sh start

# 停止
./aws-startup.sh stop

# 状態確認
./aws-startup.sh status
```

### モニタリング

#### CloudWatch ログ確認
```bash
# EC2 ログ
aws logs tail /aws/ec2/production-management --follow

# RDS ログ
aws rds describe-db-log-files --db-instance-identifier poc-production-db
```

#### コスト確認
```bash
# AWS Console: Cost Explorer
# または CLI:
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### バックアップ

#### 自動バックアップ
- **保持期間**: 7日間
- **バックアップウィンドウ**: 03:00-04:00 UTC (12:00-13:00 JST)

#### 手動バックアップ
```bash
./aws-startup.sh backup
```

#### スナップショットの復元
```bash
# AWS Console で実施:
# RDS > Snapshots > 復元したいスナップショットを選択 > Restore
```

## 🔒 セキュリティ

### 推奨設定

#### 1. IP制限
`terraform.tfvars`:
```hcl
allowed_cidr_blocks = [
  "YOUR_OFFICE_IP/32",
  "YOUR_HOME_IP/32"
]
```

現在のIPアドレス確認:
```bash
curl https://ifconfig.me
```

#### 2. 強力なパスワード
```hcl
db_password = "Use-Strong-Password-123!"
```

#### 3. SSH鍵の保護
```bash
chmod 400 ~/.ssh/production-management-poc.pem
```

#### 4. IAM権限最小化
必要な権限のみを付与:
- EC2: Full
- RDS: Full
- VPC: Full
- EventBridge: Create/Update Schedules

## 📈 スケールアップ

### インスタンスタイプ変更

`terraform.tfvars`:
```hcl
instance_type     = "t3.small"      # EC2 ~$15/月
db_instance_class = "db.t3.small"   # RDS ~$25/月
```

適用:
```bash
./aws-startup.sh deploy
```

### マルチAZ化 (本番環境用)

`terraform/modules/rds/main.tf`:
```hcl
multi_az            = true  # 可用性向上 (コスト約2倍)
deletion_protection = true
skip_final_snapshot = false
```

## 💡 コスト最適化Tips

### 1. 未使用時は停止
```bash
# 夜間・週末停止で約75%削減
./aws-startup.sh stop
```

### 2. スケジューラ活用
```hcl
# 平日のみ稼働 (月160時間)
start_schedule = "cron(0 0 ? * MON-FRI *)"
stop_schedule  = "cron(0 10 ? * MON-FRI *)"
```

### 3. RDS停止の注意点
- RDSは7日後に自動起動される
- 長期停止はスナップショット取得 + 削除を検討

### 4. 不要なリソースの削除
```bash
# 使わなくなったら削除
./aws-startup.sh destroy
```

## 🆘 トラブルシューティング

### EC2が起動しない

```bash
# ログ確認
aws ec2 get-console-output --instance-id $(cd terraform && terraform output -raw ec2_instance_id)

# セキュリティグループ確認
./aws-startup.sh status
```

### RDS接続エラー

```bash
# エンドポイント確認
cd terraform && terraform output rds_endpoint

# セキュリティグループ確認
aws rds describe-db-instances --db-instance-identifier poc-production-db
```

### アプリケーションが起動しない

```bash
# SSH接続してログ確認
./aws-startup.sh ssh

# EC2内で:
cd /opt/production-management
docker-compose logs
docker ps
```

### Terraform エラー

```bash
# State ロック解除
cd terraform
terraform force-unlock LOCK_ID

# State 確認
terraform state list

# 再初期化
rm -rf .terraform
terraform init
```

### 接続タイムアウト

```bash
# Security Group の確認
# 自分のIPアドレスが許可されているか確認

# 現在のIPアドレス
curl https://ifconfig.me

# terraform.tfvars で allowed_cidr_blocks を更新
./aws-startup.sh deploy
```

## 📊 モニタリング

### システムヘルスチェック

```bash
# 状態確認
./aws-startup.sh status

# ログ確認
./aws-startup.sh logs

# SSH接続して詳細確認
./aws-startup.sh ssh
docker ps
docker stats
```

### パフォーマンス監視

EC2内で:
```bash
# CPU/メモリ使用率
top

# ディスク使用率
df -h

# ネットワーク
netstat -tuln

# Docker統計
docker stats
```

## 🔄 アップデート手順

### アプリケーションコード更新

```bash
# 1. ローカルでコード修正
vim web/app.js

# 2. アップロード
./aws-startup.sh upload

# 3. コンテナ再起動
./aws-startup.sh ssh
cd /opt/production-management
docker-compose restart
```

### データベーススキーマ更新

```bash
# 1. バックアップ
./aws-startup.sh backup

# 2. SQL作成
vim postgres/init/03-migration.sql

# 3. アップロード & 実行
./aws-startup.sh upload
./aws-startup.sh ssh

# EC2内で:
cd /opt/production-management
export $(grep -v '^#' .env | xargs)
docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < postgres/init/03-migration.sql
```

### インフラストラクチャ更新

```bash
# 1. terraform.tfvars 編集
vim terraform/terraform.tfvars

# 2. デプロイ
./aws-startup.sh deploy
```

## 📞 サポート・問い合わせ

問題が発生した場合:

1. **ログ確認**: `./aws-startup.sh logs`
2. **状態確認**: `./aws-startup.sh status`
3. **AWS Console確認**: CloudWatch, EC2, RDS
4. **再起動**: `./aws-startup.sh restart`
5. **再デプロイ**: `./aws-startup.sh destroy` → `./aws-startup.sh full-deploy`

## 📚 関連ドキュメント

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Docker Compose](https://docs.docker.com/compose/)

## 📝 チェックリスト

### 初回デプロイ前
- [ ] AWS CLI インストール済み
- [ ] AWS 認証情報設定済み (`aws configure`)
- [ ] Terraform インストール済み
- [ ] SSH Key Pair 作成済み
- [ ] `terraform.tfvars` 編集済み
  - [ ] `key_name` 設定
  - [ ] `db_password` 変更
  - [ ] `allowed_cidr_blocks` 設定

### デプロイ後
- [ ] `./aws-startup.sh status` で状態確認
- [ ] ブラウザでアクセス確認
- [ ] iPhone/iPadでアクセス確認
- [ ] データベース接続確認
- [ ] バックアップ設定確認

### 運用中
- [ ] 定期的なバックアップ (`./aws-startup.sh backup`)
- [ ] コスト監視 (AWS Cost Explorer)
- [ ] ログ確認 (`./aws-startup.sh logs`)
- [ ] 未使用時は停止 (`./aws-startup.sh stop`)

---

## 🎉 まとめ

`aws-startup.sh` スクリプトを使用することで、AWS上での生産管理システムの起動・管理が簡単に行えます。

**主要コマンド**:
```bash
./aws-startup.sh setup       # 初回セットアップ
./aws-startup.sh full-deploy # フルデプロイ
./aws-startup.sh start       # 起動
./aws-startup.sh stop        # 停止
./aws-startup.sh status      # 状態確認
./aws-startup.sh ssh         # SSH接続
./aws-startup.sh help        # ヘルプ
```

詳細は `./aws-startup.sh help` を参照してください。
