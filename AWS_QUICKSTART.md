# AWS生産管理システム - クイックスタートガイド

最短でAWS上にシステムをデプロイする方法

## 🚀 3ステップでデプロイ

### ステップ1: 前提条件の準備

#### 必要なツールをインストール

```bash
# Terraform
brew install terraform  # macOS
# または
sudo apt-get install terraform  # Linux

# AWS CLI
brew install awscli  # macOS
# または
sudo apt-get install awscli  # Linux
```

#### AWS認証設定

```bash
aws configure
# AWS Access Key ID: [あなたのキー]
# AWS Secret Access Key: [あなたのシークレット]
# Default region: ap-northeast-1
# Default output format: json
```

#### SSH Key作成

```bash
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

---

### ステップ2: 設定ファイル編集

```bash
cd /home/user/webapp/terraform
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars
```

**編集する項目（3つだけ）**:

```hcl
# 1. SSH Key名
key_name = "production-management-poc"

# 2. データベースパスワード（強力なものに変更！）
db_password = "YourStrongPassword123!"

# 3. アクセス元IPアドレス（自分のIPに変更）
allowed_cidr_blocks = [
  "203.0.113.1/32"  # ← あなたのIPアドレスに変更
]
```

💡 **自分のIPアドレスを確認**:
```bash
curl ifconfig.me
```

---

### ステップ3: デプロイ実行

```bash
cd /home/user/webapp
./aws-startup.sh full
```

⏳ **15-20分待つ**

✅ 完了すると以下が表示されます:
```
🔗 アクセスURL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP:  http://203.0.113.1
HTTPS: https://203.0.113.1
API:   http://203.0.113.1/api/health

🎉 システムが正常に稼働しています！
```

---

## ✅ デプロイ完了！

### システムにアクセス

ブラウザで以下にアクセス:
- **生産管理システム**: http://YOUR_EC2_IP
- **出荷検品**: http://YOUR_EC2_IP/shipping-inspection-mockup.html

### 基本操作

```bash
# ステータス確認
./aws-startup.sh status

# ログ表示
./aws-startup.sh logs

# SSH接続
./aws-startup.sh ssh

# システム停止（EC2停止でコスト削減）
./aws-startup.sh stop

# システム再起動
./aws-startup.sh start
```

---

## 💰 コスト管理

### 月額コスト: $19-24（160時間/月稼働）

- EC2 t3.micro: $3-4
- RDS db.t3.micro: $12-15
- EBS 30GB: $3
- その他: $1-2

### コスト削減方法

#### 1. 使わない時は停止

```bash
# 夜間・週末に停止
./aws-startup.sh stop

# 朝に起動
./aws-startup.sh start
```

#### 2. 自動起動/停止スケジュール

デフォルトで設定済み:
- **起動**: 平日 9:00 JST
- **停止**: 平日 19:00 JST

変更する場合:
```bash
cd terraform
vim terraform.tfvars

# 例: 土日も停止
start_schedule = "cron(0 0 ? * MON *)"  # 月曜朝起動
stop_schedule  = "cron(0 10 ? * FRI *)" # 金曜夜停止

terraform apply
```

---

## 🆘 トラブルシューティング

### アクセスできない

```bash
# 1. EC2が起動しているか確認
./aws-startup.sh status

# 2. セキュリティグループを確認
# terraform.tfvars の allowed_cidr_blocks に自分のIPが正しく設定されているか
```

### SSH接続できない

```bash
# Key のパーミッション確認
chmod 400 ~/.ssh/production-management-poc.pem

# EC2の状態確認
./aws-startup.sh status
```

### データベースエラー

```bash
# RDSが起動しているか確認
aws rds describe-db-instances \
  --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].DBInstanceStatus'

# "available" であることを確認
```

---

## 🗑️ 削除方法

全てのリソースを削除（課金停止）:

```bash
./aws-startup.sh destroy

# 確認プロンプトで "DELETE" と入力
```

---

## 📋 コマンドチートシート

| コマンド | 説明 |
|---------|------|
| `./aws-startup.sh check` | 前提条件チェック |
| `./aws-startup.sh full` | フルデプロイ |
| `./aws-startup.sh start` | システム起動 |
| `./aws-startup.sh stop` | システム停止 |
| `./aws-startup.sh restart` | システム再起動 |
| `./aws-startup.sh status` | ステータス確認 |
| `./aws-startup.sh logs` | ログ表示 |
| `./aws-startup.sh ssh` | SSH接続 |
| `./aws-startup.sh destroy` | 全削除 |

---

## 📚 詳細情報

より詳しい情報は以下を参照:
- [完全デプロイメントガイド](./AWS_DEPLOYMENT.md)
- [Terraformドキュメント](./terraform/README.md)
- [プロジェクトREADME](./README.md)

---

## 🎯 次のステップ

1. ✅ システムにアクセスして動作確認
2. ✅ `./aws-startup.sh stop` で停止してコスト確認
3. ✅ データベースに初期データを投入
4. ✅ カスタマイズやデータ移行

Happy Deploying! 🚀
