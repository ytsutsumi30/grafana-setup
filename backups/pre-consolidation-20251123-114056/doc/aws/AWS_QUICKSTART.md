# AWS デプロイ クイックスタート

## 🚀 5分でAWS起動

### ステップ1: 前提条件確認
```bash
# AWS CLI確認
aws --version

# Terraform確認
terraform version

# AWS認証確認
aws sts get-caller-identity
```

### ステップ2: SSH Key作成
```bash
# AWS CLIでキー作成
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem

chmod 400 ~/.ssh/production-management-poc.pem
```

### ステップ3: セットアップ
```bash
cd /home/user/webapp
./aws-startup.sh setup
```

### ステップ4: 設定編集
```bash
# terraform.tfvars を編集
nano terraform/terraform.tfvars

# 最低限の設定:
# key_name = "production-management-poc"
# db_password = "YourStrongPassword123!"
```

### ステップ5: デプロイ
```bash
./aws-startup.sh full-deploy
```

完了！ 10-15分で起動します。

---

## 📋 必須コマンド

```bash
# 起動
./aws-startup.sh start

# 停止
./aws-startup.sh stop

# 状態確認
./aws-startup.sh status

# SSH接続
./aws-startup.sh ssh

# 削除
./aws-startup.sh destroy
```

---

## 💰 コスト

- **開発/テスト**: 月160時間稼働で **$19-24/月**
- **24時間稼働**: **$30-35/月**

停止中はほぼ無料 (EBSストレージ約$3/月のみ)

---

## 🔧 トラブル？

```bash
# ログ確認
./aws-startup.sh logs

# 再起動
./aws-startup.sh restart

# 詳細ガイド
cat AWS_DEPLOYMENT_GUIDE.md
```

---

## 📱 アクセス

デプロイ後:
```bash
./aws-startup.sh status
```
で表示されるIPアドレスにブラウザでアクセス

例: `http://54.123.45.67`

---

詳細: [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)
