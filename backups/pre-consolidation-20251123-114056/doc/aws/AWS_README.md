# 🚀 AWS デプロイメント - 完全ガイド

## 📦 提供されるファイル

| ファイル | 説明 | 用途 |
|---------|------|------|
| `aws-startup.sh` | **メインスクリプト** | すべてのAWS操作を実行 |
| `AWS_QUICKSTART.md` | **クイックスタート** | 5分で開始する最短手順 |
| `AWS_DEPLOYMENT_GUIDE.md` | **完全ガイド** | 詳細な手順とトラブルシューティング |
| `AWS_README.md` | **このファイル** | 概要とナビゲーション |

## 🎯 目的別ガイド

### 初めてAWSを使う方
👉 **[AWS_QUICKSTART.md](./AWS_QUICKSTART.md)** から開始してください

### 詳細な手順が必要な方
👉 **[AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)** を参照してください

### すぐに始めたい方
```bash
./aws-startup.sh setup
./aws-startup.sh full-deploy
```

## 📋 基本コマンド早見表

```bash
# ===== セットアップ =====
./aws-startup.sh setup          # 初回セットアップ
./aws-startup.sh full-deploy    # フルデプロイ (初回)

# ===== 日常運用 =====
./aws-startup.sh start          # システム起動
./aws-startup.sh stop           # システム停止 (コスト削減)
./aws-startup.sh restart        # システム再起動
./aws-startup.sh status         # 状態確認

# ===== 管理 =====
./aws-startup.sh ssh            # SSH接続
./aws-startup.sh logs           # ログ表示
./aws-startup.sh upload         # ファイルアップロード
./aws-startup.sh backup         # バックアップ

# ===== その他 =====
./aws-startup.sh cost           # コスト見積もり
./aws-startup.sh help           # ヘルプ表示
./aws-startup.sh destroy        # 全削除
```

## 💰 コスト情報

### 開発/テスト環境 (推奨)
```
稼働時間: 月160時間 (平日8時間)
月額コスト: $19-24
```

### 本番環境 (24時間稼働)
```
稼働時間: 月720時間
月額コスト: $30-35
```

### コスト削減のコツ
- ✅ 使わない時は `./aws-startup.sh stop` で停止
- ✅ スケジューラで自動起動/停止
- ✅ 開発時は平日のみ稼働

## 🏗️ デプロイされるインフラ

```
┌─────────────────────────────────────────┐
│         Internet (ユーザー)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Elastic IP (固定IPアドレス)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  EC2 Instance (t3.micro)                │
│  - Docker Engine                         │
│  - nginx (リバースプロキシ)              │
│  - Node.js API (Express)                │
│  - Grafana (オプション)                  │
│  - Prometheus (オプション)               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  RDS PostgreSQL (db.t3.micro)           │
│  - 自動バックアップ (7日保持)            │
│  - Multi-AZ 対応可能                     │
└─────────────────────────────────────────┘
```

## 🔐 セキュリティ

デフォルトで以下のセキュリティ機能が有効化されます:

- ✅ Security Group によるアクセス制限
- ✅ SSH Key 認証
- ✅ HTTPS 対応 (自己署名証明書)
- ✅ Database パスワード認証
- ✅ VPC による隔離

**重要**: `terraform/terraform.tfvars` でIPアドレス制限を設定してください

## 📱 アクセス方法

デプロイ後、以下の方法でアクセスできます:

### Web ブラウザ
```
http://YOUR_EC2_IP
https://YOUR_EC2_IP (QRスキャナー用)
```

### SSH 接続
```bash
./aws-startup.sh ssh
```

### iPhone/iPad
1. `https://YOUR_EC2_IP` にアクセス
2. 証明書警告を受け入れる
3. カメラ権限を許可してQRスキャン

## 🔄 ワークフロー例

### 初回セットアップ (15分)
```bash
# 1. 前提条件確認
aws --version
terraform version
aws sts get-caller-identity

# 2. SSH Key作成
aws ec2 create-key-pair \
  --key-name production-management-poc \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-poc.pem
chmod 400 ~/.ssh/production-management-poc.pem

# 3. セットアップ
./aws-startup.sh setup

# 4. terraform.tfvars編集
nano terraform/terraform.tfvars
# key_name と db_password を設定

# 5. デプロイ
./aws-startup.sh full-deploy
```

### 日常運用
```bash
# 朝
./aws-startup.sh start

# 作業
# ... システムを使用 ...

# 夕方
./aws-startup.sh stop
```

### コード更新
```bash
# ローカルで編集
vim web/app.js

# アップロード
./aws-startup.sh upload

# 再起動
./aws-startup.sh ssh
cd /opt/production-management
docker-compose restart
```

### トラブル時
```bash
# ログ確認
./aws-startup.sh logs

# SSH接続して調査
./aws-startup.sh ssh

# 再起動
./aws-startup.sh restart

# どうしてもダメなら再デプロイ
./aws-startup.sh destroy
./aws-startup.sh full-deploy
```

## 🆘 よくある質問

### Q: AWSアカウントを持っていません
A: [AWS公式サイト](https://aws.amazon.com/)でアカウント作成してください。12ヶ月の無料枠があります。

### Q: コストが心配です
A: 
- 開発環境なら月$20-25程度
- 使わない時は `stop` で停止すれば月$3程度
- いつでも `destroy` で全削除可能

### Q: どのリージョンを使えばいいですか？
A: 日本なら `ap-northeast-1` (東京) を推奨します

### Q: エラーが出ました
A: 
1. `./aws-startup.sh logs` でログ確認
2. `./aws-startup.sh status` で状態確認
3. AWS_DEPLOYMENT_GUIDE.md のトラブルシューティング参照

### Q: 本番環境で使えますか？
A: 
- 小規模なら使用可能
- スケール時は `terraform.tfvars` でインスタンスタイプを変更
- Multi-AZ化も可能

### Q: データは安全ですか？
A: 
- RDSは自動バックアップ有効 (7日保持)
- 手動バックアップ: `./aws-startup.sh backup`
- スナップショットからの復元可能

### Q: SSL証明書はどうすれば？
A: 
- デフォルトは自己署名証明書
- Let's Encryptなど使用する場合は別途設定が必要
- AWS Certificate Manager (ACM) の利用も検討可能

## 📞 サポート

問題が発生した場合:

1. **ログ確認**: `./aws-startup.sh logs`
2. **状態確認**: `./aws-startup.sh status`
3. **ドキュメント**: `AWS_DEPLOYMENT_GUIDE.md` のトラブルシューティング
4. **AWS Console**: CloudWatch, EC2, RDS で詳細確認

## 📚 関連リンク

- [AWS公式ドキュメント](https://docs.aws.amazon.com/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)

## 🎓 次のステップ

1. ✅ **クイックスタート** を完了
2. ✅ **システム動作確認**
3. ✅ **バックアップ設定**
4. ✅ **監視設定** (Grafana)
5. ✅ **本番運用開始**

---

**🎉 AWS上での生産管理システムの運用を楽しんでください！**

質問や問題があれば、`AWS_DEPLOYMENT_GUIDE.md` を参照するか、AWSサポートにお問い合わせください。
