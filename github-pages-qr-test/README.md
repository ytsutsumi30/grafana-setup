# QRスキャンテスト - GitHub Pages版

iPhone SafariでのQRコードスキャン機能をテストするためのデモページです。

## 🌐 デモ

GitHub Pagesでホスティング予定:
```
https://[username].github.io/qr-scanner-test/
```

## ✨ 機能

- 📱 **iPhone Safari対応** - iOS 11以降のSafariで動作
- 🔒 **HTTPS自動対応** - GitHub PagesのHTTPSで自動的にカメラAPI利用可能
- 📸 **リアルタイムQRスキャン** - qr-scanner.jsライブラリ使用
- 📝 **スキャン履歴** - 最大20件まで履歴を保持
- 🎨 **レスポンシブデザイン** - モバイル・デスクトップ対応

## 🚀 GitHub Pagesへのデプロイ方法

### 方法1: GitHubのWeb UIを使用

1. **新しいリポジトリを作成**
   - GitHubにログイン
   - 「New repository」をクリック
   - リポジトリ名: `qr-scanner-test` (任意)
   - Public を選択
   - 「Create repository」をクリック

2. **ファイルをアップロード**
   - 「uploading an existing file」をクリック
   - `index.html`、`app.js`、`README.md` をドラッグ&ドロップ
   - 「Commit changes」をクリック

3. **GitHub Pagesを有効化**
   - リポジトリの Settings をクリック
   - 左メニューから「Pages」を選択
   - Source: 「Deploy from a branch」を選択
   - Branch: `main` (または `master`) / `/ (root)` を選択
   - 「Save」をクリック

4. **アクセス**
   - 数分後、以下のURLでアクセス可能になります:
   ```
   https://[username].github.io/qr-scanner-test/
   ```

### 方法2: Git コマンドラインを使用

```bash
# 1. このディレクトリに移動
cd /home/tsutsumi/grafana-setup/github-pages-qr-test

# 2. Gitリポジトリを初期化
git init

# 3. ファイルを追加
git add .

# 4. 初回コミット
git commit -m "Initial commit: QR Scanner Test"

# 5. GitHubに新しいリポジトリを作成後、リモートを追加
git remote add origin https://github.com/[username]/qr-scanner-test.git

# 6. プッシュ
git branch -M main
git push -u origin main

# 7. GitHub PagesをWebから有効化（Settings → Pages）
```

## 📱 iPhone Safari でのテスト手順

1. **GitHub Pagesにアクセス**
   ```
   https://[username].github.io/qr-scanner-test/
   ```

2. **環境情報を確認**
   - プロトコル: HTTPS ✓（自動）
   - カメラAPI: 対応 ✓

3. **カメラ権限を許可**
   - 「カメラを起動」ボタンをタップ
   - ブラウザのカメラ権限ダイアログで「許可」をタップ

4. **QRコードをスキャン**
   - カメラが起動したら、QRコードを枠内に収める
   - 自動的に読み取りが開始される
   - 読み取り成功すると結果が表示される

5. **履歴を確認**
   - スキャン履歴セクションで過去の読み取り結果を確認
   - コピーボタンでクリップボードにコピー可能

## 🛠️ 技術スタック

- **QRスキャン**: [qr-scanner](https://github.com/nimiq/qr-scanner) v1.4.2
- **UIフレームワーク**: Bootstrap 5.3.0
- **アイコン**: Font Awesome 6.4.0

## 📋 動作要件

- HTTPS環境（GitHub Pages対応済み）
- カメラ権限の許可
- 対応ブラウザ:
  - Safari (iOS 11+)
  - Chrome (Android 5+)
  - Firefox
  - Edge

## 🔧 ローカルでのテスト

```bash
# シンプルなHTTPサーバーを起動（Python 3）
python3 -m http.server 8000

# または Python 2
python -m SimpleHTTPServer 8000

# ブラウザでアクセス
# http://localhost:8000
# ※ localhostはHTTPでもカメラAPI使用可能
```

## 📝 カスタマイズ方法

### スキャン速度の調整

`app.js` の以下の部分を変更:
```javascript
maxScansPerSecond: 5,  // 1秒あたりのスキャン回数（1-10）
```

### スキャン領域のサイズ変更

```javascript
const scanRegionSize = Math.round(smallestDimension * 0.6);
// 0.6 を 0.4-0.8 の範囲で調整
```

### 履歴の保持件数

```javascript
if (scanHistory.length > 20) {  // 20を変更
```

## 🐛 トラブルシューティング

### カメラが起動しない

1. **HTTPSでアクセスしているか確認**
   - GitHub Pagesは自動的にHTTPSになります
   - ローカルテストの場合は `localhost` を使用

2. **カメラ権限を確認**
   - iOS: 設定 → Safari → カメラ → 許可
   - iOS: 設定 → プライバシーとセキュリティ → カメラ → Safari

3. **ブラウザのキャッシュをクリア**
   - Safari: 設定 → Safari → 履歴とWebサイトデータを消去

### QRコードが読み取れない

1. **照明を確認** - 明るい場所で試す
2. **距離を調整** - カメラから10-30cm程度
3. **QRコードのサイズ** - 小さすぎると読み取れない場合あり

## 📄 ライセンス

このプロジェクトはテスト目的のデモです。
使用ライブラリのライセンス:
- qr-scanner: MIT License
- Bootstrap: MIT License

## 🔗 関連リンク

- [qr-scanner GitHub](https://github.com/nimiq/qr-scanner)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/ja/docs/Web/API/MediaDevices/getUserMedia)

## 📧 フィードバック

バグ報告や機能要望は、GitHubのIssuesで受け付けています。

---

**作成日**: 2025-10-12  
**対応環境**: iOS 11+ Safari, Chrome, Firefox, Edge
