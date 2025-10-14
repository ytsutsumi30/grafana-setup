# Quick Deploy - 使い方ガイド

## 🚀 基本的な使い方

### 1. 通常デプロイ（最も一般的）
ファイルを同期して、サービスを再起動します。
```bash
./quick-deploy.sh
```

### 2. 完全デプロイ
依存関係も再インストールします（package.json変更時）。
```bash
./quick-deploy.sh --full
```

### 3. ファイル同期のみ
再起動せずにファイルだけ転送します（設定ファイル更新時など）。
```bash
./quick-deploy.sh --no-restart
```

### 4. 再起動のみ
ファイルは転送せず、サービスだけ再起動します。
```bash
./quick-deploy.sh --restart
```

### 5. ヘルプ表示
```bash
./quick-deploy.sh --help
```

---

## 📋 デプロイフロー

### 通常デプロイ（`./quick-deploy.sh`）の流れ:

1. ✅ **前チェック**
   - SSHキーの存在確認
   - プロジェクトディレクトリの確認
   - EC2への接続確認

2. 📦 **ファイル同期** (rsync)
   - 差分のみ転送（高速）
   - 除外パターン適用
   - 削除ファイルも同期

3. 🔄 **サービス再起動**
   - docker-compose restart

4. 🏥 **ヘルスチェック**
   - HTTP 200 確認
   - API動作確認

5. ✅ **完了通知**
   - デプロイ時刻記録
   - URL表示

---

## 🎯 使い分けガイド

| 変更内容 | コマンド | 理由 |
|---------|---------|------|
| **コード修正** | `./quick-deploy.sh` | 標準的なデプロイ |
| **HTML/CSS変更** | `./quick-deploy.sh --no-restart` | 静的ファイルは再起動不要 |
| **package.json変更** | `./quick-deploy.sh --full` | 依存関係を再インストール |
| **設定ファイル変更** | `./quick-deploy.sh` | 再起動で反映 |
| **API修正** | `./quick-deploy.sh` | サービス再起動が必要 |
| **エラー発生時** | `./quick-deploy.sh --restart` | 再起動で回復試行 |

---

## 🔧 除外パターン

以下のファイル・ディレクトリは自動的に除外されます：

- `node_modules/` - 依存関係（EC2で直接インストール）
- `.git/` - バージョン管理
- `terraform/` - インフラコード（ローカルのみ）
- `*.log` - ログファイル
- `.env` - 環境変数（EC2で個別管理）
- `ssl/server.key` - 秘密鍵（セキュリティ）

除外パターンの編集: `.rsyncignore` ファイル

---

## 📊 デプロイ時間の目安

- **初回デプロイ**: 30-60秒（全ファイル転送）
- **通常デプロイ**: 5-15秒（差分のみ）
- **コード1ファイル修正**: 3-5秒
- **再起動のみ**: 5-10秒

---

## 🐛 トラブルシューティング

### エラー: "SSH接続に失敗"
```bash
# EC2が起動しているか確認
aws ec2 describe-instances --instance-ids i-04de99c65f29977d8 \
  --query 'Reservations[0].Instances[0].State.Name'

# スケジューラーで停止している可能性
# → 月-金 9:00-19:00 JSTのみ自動起動
```

### エラー: "Permission denied"
```bash
# SSHキーの権限確認
chmod 400 ~/.ssh/production-management-key.pem
```

### デプロイ後もアプリが古い
```bash
# ブラウザキャッシュをクリア: Ctrl + Shift + R
# または強制再起動
./quick-deploy.sh --restart
```

### ログ確認
```bash
# SSH接続してログ確認
ssh -i ~/.ssh/production-management-key.pem ec2-user@57.180.82.161

# コンテナログ
cd ~/production-management
sudo docker-compose logs -f api
sudo docker-compose logs -f nginx

# デプロイ履歴
cat ~/production-management/deploy.log
```

---

## 💡 便利なエイリアス（オプション）

`~/.bashrc` または `~/.zshrc` に追加:

```bash
# Production Management デプロイショートカット
alias deploy='~/grafana-setup/quick-deploy.sh'
alias deploy-full='~/grafana-setup/quick-deploy.sh --full'
alias deploy-restart='~/grafana-setup/quick-deploy.sh --restart'
alias deploy-sync='~/grafana-setup/quick-deploy.sh --no-restart'
alias deploy-ssh='ssh -i ~/.ssh/production-management-key.pem ec2-user@57.180.82.161'
```

設定後:
```bash
source ~/.bashrc  # または source ~/.zshrc

# 使用例
deploy           # 通常デプロイ
deploy-full      # 完全デプロイ
deploy-restart   # 再起動のみ
deploy-ssh       # SSH接続
```

---

## 🔐 セキュリティ注意事項

1. **`.env` ファイル**は転送されません
   - EC2側で個別に管理されています
   - 変更する場合はSSH接続後に手動編集

2. **SSL秘密鍵**は転送されません
   - EC2上で生成・管理されています

3. **本番環境のパスワード**
   - terraform.tfvars の `db_password` は必ず変更してください

---

## 📞 サポート

- アプリケーション: http://57.180.82.161
- HTTPS: https://57.180.82.161
- SSH接続: `ssh -i ~/.ssh/production-management-key.pem ec2-user@57.180.82.161`

デプロイに問題がある場合は、ログを確認してください。
