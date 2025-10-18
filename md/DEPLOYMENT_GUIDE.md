# デプロイメントガイド

## 📋 概要

このガイドでは、QR同梱物検品システムをEC2に確実にデプロイし、リリースが正しく適用されているかを確認する方法を説明します。

## ✅ デプロイ前チェックリスト

### 1. ローカル環境の確認

```bash
# Gitの状態確認
git status

# 最新のコミットを確認
git log -1 --oneline

# ブランチ確認
git branch
```

### 2. デプロイメント検証

```bash
# デプロイメント検証スクリプトを実行
./verify-deployment.sh
```

**確認項目:**
- ✅ すべてのファイルが存在する
- ✅ MD5ハッシュが表示される
- ✅ バージョン情報が正しい (v2.1.1)
- ✅ Gitが未コミット変更がない（クリーン）
- ✅ Dockerコンテナが実行中

### 3. リリースノート生成

```bash
# リリースノートを自動生成
./generate-release-notes.sh

# 生成されたファイルを確認
cat RELEASE_NOTES_2.1.1.md
```

## 🚀 EC2へのデプロイ手順

### オプション1: quick-deploy.sh を使用（推奨）

```bash
# デプロイスクリプトを実行
./quick-deploy.sh
```

このスクリプトは以下を自動実行します:
1. Gitリポジトリを最新化
2. Dockerコンテナの再起動
3. Nginxの設定リロード

### オプション2: 手動デプロイ

```bash
# EC2にSSH接続
ssh ec2-user@<EC2-IP>

# リポジトリを更新
cd /home/ec2-user/grafana-setup
git pull origin main

# Dockerコンテナを再起動
docker-compose down
docker-compose up -d

# Nginxをリロード
docker exec production-nginx nginx -s reload
```

## 🔍 デプロイ検証手順

### 1. ファイルハッシュの確認

**ローカル:**
```bash
md5sum web/qr-inspection.html
# 出力例: 106a8573bbb4e9531e5f4d8e150be1c2
```

**EC2:**
```bash
ssh ec2-user@<EC2-IP> "md5sum /home/ec2-user/grafana-setup/web/qr-inspection.html"
# 出力が同じか確認
```

### 2. バージョン情報の確認

**方法1: HTMLメタタグを確認**
```bash
ssh ec2-user@<EC2-IP> "grep -A 3 'meta name=\"version\"' /home/ec2-user/grafana-setup/web/qr-inspection.html"
```

期待される出力:
```html
<meta name="version" content="2.1.1">
<meta name="build-date" content="2025-10-18">
<meta name="git-commit" content="cd44442">
```

**方法2: ブラウザで確認**

1. ブラウザで `http://<EC2-IP>/qr-inspection.html` を開く
2. 開発者コンソールを開く (F12)
3. 以下のコマンドを実行:

```javascript
// バージョン情報を表示
window.QR_INSPECTION_VERSION
```

期待される出力:
```javascript
{
  version: "2.1.1",
  buildDate: "2025-10-18",
  gitCommit: "cd44442",
  timestamp: "2025-10-18T12:00:00.000Z"
}
```

4. ページフッター（左下）でバージョン表示を確認:
   - `v2.1.1 (2025-10-18)` が表示される

### 3. 機能動作確認

#### QRスキャン機能
- [ ] QRスキャン開始ボタンが動作
- [ ] カメラ権限が要求される
- [ ] カメラプレビューが表示される
- [ ] カメラ切り替えボタンが表示される

#### カメラ切り替え機能
- [ ] カメラ切り替えボタンをクリック
- [ ] 複数カメラがある場合、切り替わる
- [ ] 切り替え後もQRスキャンが継続

#### QR検品フロー
- [ ] QRコードをスキャン
- [ ] 検品リストが更新される
- [ ] 進捗バーが更新される
- [ ] 検品完了できる

## 📊 デプロイメント情報の確認

### DEPLOYMENT_INFO.json

デプロイ前に自動生成される情報ファイル:

```bash
cat DEPLOYMENT_INFO.json
```

内容例:
```json
{
  "version": "2.1.1",
  "buildDate": "2025-10-18",
  "gitCommit": "cd44442",
  "gitBranch": "main",
  "deployedAt": "2025-10-18T11:51:39Z",
  "deployedBy": "tsutsumi@hp13-tsutsumi",
  "files": {
    "web/qr-inspection.html": {
      "md5": "106a8573bbb4e9531e5f4d8e150be1c2",
      "size": 53781
    }
  }
}
```

このファイルをEC2にコピーして、デプロイ記録として保存できます:

```bash
scp DEPLOYMENT_INFO.json ec2-user@<EC2-IP>:/home/ec2-user/grafana-setup/
```

## 🐛 トラブルシューティング

### 問題: バージョン情報が古い

**原因:** ブラウザキャッシュ

**解決策:**
```javascript
// ブラウザで強制リロード
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

// または、キャッシュクリア後にリロード
```

### 問題: MD5ハッシュが一致しない

**原因:** ファイルが正しくデプロイされていない

**解決策:**
```bash
# EC2で再度git pull
ssh ec2-user@<EC2-IP>
cd /home/ec2-user/grafana-setup
git fetch origin
git reset --hard origin/main
```

### 問題: カメラが起動しない

**原因:** HTTPS接続が必要

**確認:**
```bash
# NginxでHTTPSが有効か確認
ssh ec2-user@<EC2-IP> "docker exec production-nginx nginx -T | grep ssl"
```

### 問題: window.QR_INSPECTION_VERSION が undefined

**原因:** JavaScriptエラーでクラスが初期化されていない

**確認:**
```javascript
// ブラウザコンソールでエラーを確認
console.log(document.readyState);
console.log(window.qrInspectionApp);
```

## 📝 デプロイ記録テンプレート

デプロイごとに以下を記録することを推奨:

```markdown
## デプロイ記録

**日時:** 2025-10-18 20:51:39 JST
**バージョン:** v2.1.1
**Git Commit:** cd44442
**デプロイ担当:** Tsutsumi

### チェック結果
- [x] verify-deployment.sh 実行
- [x] MD5ハッシュ一致確認
- [x] バージョン情報表示確認
- [x] QRスキャン機能動作確認
- [x] カメラ切り替え動作確認

### 問題点
- なし

### 備考
- カメラ切り替え機能追加
- Safari iOS最適化済み
```

## 🔗 関連ドキュメント

- [RELEASE_NOTES_2.1.1.md](RELEASE_NOTES_2.1.1.md) - リリースノート
- [QR_INSPECTION_REBUILD_REPORT.md](QR_INSPECTION_REBUILD_REPORT.md) - 再構築レポート
- [DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md) - AWS環境構築
- [README.md](README.md) - システム概要

## 💡 ベストプラクティス

1. **デプロイ前に必ず検証スクリプトを実行**
   ```bash
   ./verify-deployment.sh
   ```

2. **リリースノートを生成して確認**
   ```bash
   ./generate-release-notes.sh
   ```

3. **デプロイ後に必ずバージョン確認**
   - ブラウザコンソール: `window.QR_INSPECTION_VERSION`
   - ページフッター: バージョン表示

4. **MD5ハッシュで整合性確認**
   - ローカルとEC2で一致することを確認

5. **デプロイ記録を残す**
   - DEPLOYMENT_INFO.json を保存
   - デプロイ日時と担当者を記録

## 🎯 次回デプロイ時のクイックチェック

```bash
# 1. 検証
./verify-deployment.sh

# 2. デプロイ
./quick-deploy.sh

# 3. 確認（ブラウザで）
# - http://<EC2-IP>/qr-inspection.html
# - console: window.QR_INSPECTION_VERSION
# - フッター: バージョン表示

# 4. 記録
echo "Deployed v2.1.1 at $(date)" >> deployment.log
```
