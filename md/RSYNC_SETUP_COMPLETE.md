# ✅ rsync デプロイセットアップ完了

## 📦 インストール済みコンポーネント

### ローカル環境
- ✅ rsync 3.2.7 インストール済み
- ✅ `quick-deploy.sh` スクリプト作成
- ✅ `.rsyncignore` 除外パターン設定
- ✅ bashエイリアス設定完了

### EC2環境
- ✅ rsync 3.4.0 インストール済み
- ✅ SSH接続確認済み
- ✅ デプロイ先ディレクトリ準備完了

---

## 🚀 すぐに使えるコマンド

### 新しいターミナルを開いて、以下のコマンドが使えます:

```bash
# 通常デプロイ（最もよく使う）
deploy

# 完全デプロイ（package.json変更時）
deploy-full

# ファイル同期のみ（再起動なし）
deploy-sync

# 再起動のみ
deploy-restart

# SSH接続
deploy-ssh

# ログ監視
deploy-logs
```

---

## 📝 使用例

### 例1: HTMLファイルを修正してデプロイ
```bash
# 1. ファイルを編集
nano ~/grafana-setup/web/index.html

# 2. デプロイ
deploy

# 3. 確認
# ブラウザで http://57.180.82.161 を開く
```

### 例2: APIコードを修正してデプロイ
```bash
# 1. ファイルを編集
nano ~/grafana-setup/api/server.js

# 2. デプロイ
deploy

# 3. ログ確認
deploy-logs
```

### 例3: package.jsonを更新してデプロイ
```bash
# 1. 依存関係を追加
cd ~/grafana-setup/api
npm install express-rate-limit --save

# 2. 完全デプロイ（依存関係も更新）
deploy-full
```

---

## ⚡ デプロイ速度

実測値:
- **初回デプロイ**: 約30-60秒
- **通常デプロイ**: 約5-15秒
- **ファイル1つ修正**: 約3-5秒

---

## 🎯 ワークフロー

### 開発サイクル:

```
1. ローカルでコード修正
   ↓
2. deploy コマンド実行
   ↓
3. 5-15秒で本番反映
   ↓
4. ブラウザで確認
   ↓
5. 問題があれば再度修正
```

---

## 📊 除外されるファイル

以下は自動的に除外されます（`.rsyncignore`参照）:

- `node_modules/` - 依存関係
- `.git/` - Git履歴
- `terraform/` - インフラコード
- `*.log` - ログファイル
- `.env` - 環境変数
- `ssl/server.key` - 秘密鍵

---

## 🔧 カスタマイズ

### 除外パターンの追加
```bash
nano ~/grafana-setup/.rsyncignore
```

### デプロイスクリプトの編集
```bash
nano ~/grafana-setup/quick-deploy.sh
```

### エイリアスの追加
```bash
nano ~/.bashrc
source ~/.bashrc
```

---

## 📞 接続情報

- **EC2 IP**: 57.180.82.161
- **アプリURL**: http://57.180.82.161
- **HTTPS URL**: https://57.180.82.161
- **SSHキー**: ~/.ssh/production-management-key.pem
- **リモートディレクトリ**: ~/production-management

---

## 🐛 トラブルシューティング

### エラー: "command not found: deploy"
```bash
# 新しいターミナルを開くか、bashrcを再読込
source ~/.bashrc
```

### エラー: "SSH connection failed"
```bash
# EC2の状態確認
aws ec2 describe-instances --instance-ids i-04de99c65f29977d8 \
  --query 'Reservations[0].Instances[0].State.Name'

# 月-金 9:00-19:00 JSTのみ自動起動中
# 手動起動が必要な場合:
aws ec2 start-instances --instance-ids i-04de99c65f29977d8
```

### デプロイが遅い
```bash
# フルデプロイの代わりに通常デプロイを使用
deploy  # --full は不要な場合が多い
```

---

## ✅ セットアップ確認

以下を確認してセットアップ完了です:

- [x] rsync インストール完了
- [x] quick-deploy.sh 実行可能
- [x] エイリアス設定完了
- [x] EC2への接続確認済み
- [x] テストデプロイ成功

---

## 🎉 これで準備完了！

次回から`deploy`コマンド一つで本番環境にデプロイできます。

詳細なガイドは `DEPLOY_GUIDE.md` を参照してください。
