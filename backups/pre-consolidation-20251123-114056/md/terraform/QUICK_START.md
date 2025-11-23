# クイックスタートガイド

最短5分でAWS環境にデプロイ

## 🚀 3ステップデプロイ

### 1. 前提条件の確認

```bash
# AWS CLI確認
aws --version

# Terraform確認
terraform version

# SSH Keyを作成 (未作成の場合)
aws ec2 create-key-pair \
  --key-name production-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-poc.pem
chmod 400 ~/.ssh/production-poc.pem
```

### 2. 設定ファイルの作成

```bash
cd terraform

# 設定ファイル作成
cat > terraform.tfvars << 'TFVARS'
key_name    = "production-poc"
db_password = "ChangeMe123!"
TFVARS
```

### 3. デプロイ実行

```bash
# 自動デプロイ
./deploy.sh

# または手動
terraform init
terraform apply -auto-approve
```

## 📋 デプロイ後の確認

```bash
# アプリケーションURL取得
terraform output application_url

# SSH接続
terraform output ssh_command | bash
```

## 💰 コスト

**月額 $19-24** (平日9-19時稼働)

## 🗑️ 削除

```bash
terraform destroy -auto-approve
```

---

詳細は [README.md](README.md) または [../DEPLOYMENT_AWS.md](../DEPLOYMENT_AWS.md) を参照
