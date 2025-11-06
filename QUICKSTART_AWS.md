# ⚡ AWS クイックスタートガイド

AWS上で生産管理システムを**10分で**稼働開始！

## 🎯 この5ステップで完了

```bash
# 1️⃣ AWS認証設定（1分）
aws configure
# Access Key, Secret Key, Region (ap-northeast-1) を入力

# 2️⃣ SSH鍵作成（30秒）
aws ec2 create-key-pair --key-name production-management-poc \
  --query 'KeyMaterial' --output text > ~/.ssh/production-management-poc.pem
chmod 400 ~/.ssh/production-management-poc.pem

# 3️⃣ Terraform設定（2分）
cd terraform
cp terraform.tfvars.example terraform.tfvars
# エディタで key_name, db_password, allowed_cidr_blocks を編集

# 4️⃣ デプロイ実行（5-10分）
cd ..
./aws-startup.sh deploy
# "yes" を2回入力するだけ！

# 5️⃣ アクセス
./aws-startup.sh outputs
# 表示されたURLにブラウザでアクセス
```

## 📱 アクセスURL（デプロイ後）

```
🌐 メインシステム
http://YOUR_EC2_IP/

📋 QR検品システム
http://YOUR_EC2_IP/qr-inspection.html

📦 出荷検品システム
http://YOUR_EC2_IP/shipping-inspection-mockup.html
```

## 🔄 日常の使い方

### 朝（システム起動）
```bash
./aws-startup.sh start
```

### 夜（システム停止）
```bash
./aws-startup.sh stop
```

### 確認したいとき
```bash
./aws-startup.sh status    # ステータス確認
./aws-startup.sh health    # ヘルスチェック
./aws-startup.sh logs      # ログ表示
```

## 💰 コスト

**平日のみ稼働**: 約 $23-28/月  
**24時間稼働**: 約 $45-54/月

## 📚 詳細ドキュメント

- [AWS_STARTUP_GUIDE.md](./AWS_STARTUP_GUIDE.md) - 完全ガイド
- [README.md](./README.md) - システム概要
- [terraform/README.md](./terraform/README.md) - Terraform詳細

## 🆘 トラブル？

```bash
# まずヘルスチェック
./aws-startup.sh health

# ログを確認
./aws-startup.sh logs

# 再起動してみる
./aws-startup.sh restart
```

それでもダメなら → [AWS_STARTUP_GUIDE.md](./AWS_STARTUP_GUIDE.md) のトラブルシューティング参照

---

**準備完了！** さっそく `./aws-startup.sh deploy` を実行しましょう 🚀
