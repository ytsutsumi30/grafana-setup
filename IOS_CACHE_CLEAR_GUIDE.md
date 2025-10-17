# iOS Safari キャッシュクリア完全ガイド

**作成日**: 2025-10-15  
**対象エラー**: I5-71H - BarcodeDetector API unavailable on iOS Safari  
**バージョン**: v2.0 (キャッシュバスティング対応)

---

## 🔄 実施したキャッシュ対策

### 1. HTMLメタタグによるキャッシュ制御

**ファイル**: `web/index.html`

```html
<!-- キャッシュ制御メタタグ（iOS Safari対応） -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### 2. JSファイルのバージョン管理（キャッシュバスティング）

**ファイル**: `web/index.html`

```html
<!-- キャッシュバスティング: バージョン番号でキャッシュを回避 -->
<script type="module" src="js/index-app.js?v=20251015-1400"></script>
<script type="module" src="js/qr-scanner.js?v=20251015-1400"></script>
```

**効果**: クエリパラメータが変更されるため、ブラウザは新しいファイルとして認識

### 3. Nginxサーバー側のキャッシュ制御強化

**ファイル**: `nginx/conf.d/default.conf`

```nginx
# キャッシュ無効化（開発用・iOS Safari対応強化）
add_header Cache-Control "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0" always;
add_header Pragma "no-cache" always;
add_header Expires "0" always;

# iOS Safari特有のキャッシュ対策
if_modified_since off;
etag off;
```

---

## 📱 iPhone/iPad Safari での完全キャッシュクリア手順

### 方法1: 設定アプリからクリア（推奨）

1. **設定アプリ**を開く
2. **Safari**を選択
3. 下にスクロールして**「履歴とWebサイトデータを消去」**をタップ
4. **「履歴とデータを消去」**で確認
5. Safariを開き直す
6. `https://57.180.82.161` にアクセス

### 方法2: Safari内でのクリア（簡易版）

1. **Safari**アプリを開く
2. 右下の**📖（ブック）**アイコンをタップ
3. **🕐（時計）**アイコンをタップ
4. 右下の**「消去」**をタップ
5. **「すべての履歴」**を選択
6. ページを再読み込み

### 方法3: プライベートブラウズモード（一時的）

1. **Safari**アプリを開く
2. 右下の**タブ切り替え**アイコンをタップ
3. 下部の**「プライベート」**をタップ
4. **「+」**で新しいプライベートタブを開く
5. `https://57.180.82.161` にアクセス

**メリット**: キャッシュの影響を受けない  
**デメリット**: ログイン状態などが保持されない

### 方法4: 強制再読み込み（最も簡単）

1. **Safari**で対象ページを開く
2. アドレスバーをタップ
3. URLの最後に `?nocache=20251015` を追加
   ```
   https://57.180.82.161/?nocache=20251015
   ```
4. **Go**をタップ

### 方法5: Safariの完全リセット（最終手段）

1. **設定**アプリを開く
2. **Safari**を選択
3. 下にスクロールして**「詳細」**をタップ
4. **「Webサイトデータ」**をタップ
5. **「全Webサイトデータを削除」**をタップ
6. 確認して削除
7. デバイスを再起動（推奨）

---

## 🔍 キャッシュクリア確認方法

### 1. デベロッパーツールで確認（Mac + Safari）

1. Mac SafariでWebインスペクタを有効化:
   - Safari → 環境設定 → 詳細
   - 「メニューバーに"開発"メニューを表示」にチェック

2. iPhoneをMacに接続

3. Mac Safari メニュー:
   - 開発 → [あなたのiPhone] → [対象ページ]

4. **Network**タブを開く

5. ページを再読み込み

6. JSファイルのステータス確認:
   - `200 OK` = サーバーから新規取得 ✅
   - `304 Not Modified` = キャッシュ使用 ❌
   - `(cached)` = ブラウザキャッシュ ❌

### 2. コンソールログで確認

1. Safari Webインスペクタの**Console**タブを開く

2. 以下のコマンドを実行:
   ```javascript
   console.log('QrScanner available:', typeof QrScanner !== 'undefined');
   console.log('Script loaded:', document.querySelector('script[src*="qr-scanner.umd.min.js"]'));
   ```

3. 期待される出力:
   ```
   QrScanner available: true
   Script loaded: <script src="...qr-scanner.umd.min.js">
   ```

### 3. 実際の動作確認

1. QR同梱物検品画面を開く
2. 「QRスキャン開始」ボタンを押下
3. コンソールログを確認:
   ```
   Initializing QR Scanner with library (UMD)...
   QR Scanner started successfully with UMD library
   ```

4. ❌ 以下のログが出る場合はキャッシュが残っている:
   ```
   BarcodeDetector API unavailable on iOS Safari
   ```

---

## ⚙️ キャッシュが残っている場合の対処

### 対処法1: タイムスタンプ付きURL

毎回異なるクエリパラメータでアクセス:

```
https://57.180.82.161/?t=1697356800
https://57.180.82.161/?t=1697356801
https://57.180.82.161/?t=1697356802
```

### 対処法2: Service Worker のクリア

1. Safari Webインスペクタを開く
2. **Application** タブ（または**Storage**）
3. **Service Workers** を選択
4. 登録されているService Workerを削除

### 対処法3: iOS再起動

1. デバイスの電源を完全に切る
2. 30秒待つ
3. 電源を入れ直す
4. Safariでページにアクセス

---

## 🧪 テスト手順

### テストケース1: 新規アクセス

```bash
# iOS Safariで実行
1. 履歴とWebサイトデータを消去
2. https://57.180.82.161 にアクセス
3. QR同梱物検品を開く
4. 「QRスキャン開始」を押下
5. カメラ起動を確認
6. ✅ エラーが出ないことを確認
```

### テストケース2: リロード後

```bash
# iOS Safariで実行
1. ページをリロード（下に引っ張る）
2. QR同梱物検品を開く
3. 「QRスキャン開始」を押下
4. ✅ エラーが出ないことを確認
```

### テストケース3: プライベートモード

```bash
# iOS Safariで実行
1. プライベートブラウズモードに切り替え
2. https://57.180.82.161 にアクセス
3. QR同梱物検品を開く
4. 「QRスキャン開始」を押下
5. ✅ エラーが出ないことを確認
```

---

## 📊 バージョン確認方法

### 現在のバージョンを確認

1. Safari Webインスペクタを開く
2. **Console**タブで実行:

```javascript
// HTMLのバージョン確認
console.log('Cache-Control meta:', document.querySelector('meta[http-equiv="Cache-Control"]')?.content);

// JSファイルのバージョン確認
Array.from(document.scripts).forEach(script => {
    if (script.src.includes('index-app.js') || script.src.includes('qr-scanner.js')) {
        console.log('Script:', script.src);
    }
});

// QrScannerライブラリの確認
console.log('QrScanner:', typeof QrScanner);
console.log('QrScanner UMD:', document.querySelector('script[src*="qr-scanner.umd.min.js"]'));
```

### 期待される出力

```javascript
Cache-Control meta: "no-cache, no-store, must-revalidate"
Script: https://57.180.82.161/js/index-app.js?v=20251015-1400
Script: https://57.180.82.161/js/qr-scanner.js?v=20251015-1400
QrScanner: function
QrScanner UMD: <script src="https://unpkg.com/qr-scanner@1.4.2/qr-scanner.umd.min.js">
```

---

## 🚨 トラブルシューティング

### 問題1: まだ古いエラーメッセージが表示される

**症状**: `BarcodeDetector API unavailable on iOS Safari`

**原因**: 
- ブラウザキャッシュが残っている
- Service Workerが古いバージョンをキャッシュ

**解決策**:
1. Safari の履歴とデータを完全削除
2. デバイスを再起動
3. プライベートブラウズモードで確認
4. `?nocache=` クエリパラメータを追加

### 問題2: QrScannerが undefined

**症状**: `QrScanner is not defined` または `typeof QrScanner === 'undefined'`

**原因**:
- UMD版スクリプトが読み込まれていない
- ネットワークエラー

**解決策**:
```javascript
// Consoleで確認
console.log('Script tags:', 
    Array.from(document.scripts)
        .filter(s => s.src.includes('qr-scanner'))
        .map(s => s.src)
);

// 期待される出力
// ["https://unpkg.com/qr-scanner@1.4.2/qr-scanner.umd.min.js"]
```

### 問題3: カメラは起動するがQR検出しない

**症状**: カメラ映像は表示されるが、QRコードを読み取らない

**原因**:
- QrScannerの初期化エラー
- iOS Safariの制限

**解決策**:
1. カメラ権限を再設定:
   - 設定 → Safari → カメラ → 許可
2. ページをリロード
3. 明るい場所でテスト
4. QRコードを大きく表示

### 問題4: デプロイ後も変更が反映されない

**原因**: CDNやNginxの中間キャッシュ

**解決策**:
```bash
# サーバー側でNginxキャッシュをクリア
ssh -i ~/.ssh/production-management-key.pem ec2-user@57.180.82.161
docker exec production-nginx nginx -s reload

# または、Dockerコンテナを再起動
docker restart production-nginx
```

---

## 📝 今後の更新時の注意

### バージョン番号の更新

**ファイル**: `web/index.html`

JSファイルを更新した場合、必ずバージョン番号を変更:

```html
<!-- 変更前 -->
<script type="module" src="js/index-app.js?v=20251015-1400"></script>

<!-- 変更後 -->
<script type="module" src="js/index-app.js?v=20251015-1530"></script>
```

**命名規則**: `YYYYMMDD-HHMM` 形式

### デプロイ時のチェックリスト

- [ ] JSファイルのバージョン番号を更新
- [ ] `./quick-deploy.sh` でデプロイ
- [ ] Nginx再起動: `docker restart production-nginx`
- [ ] プライベートモードでテスト
- [ ] 通常モードでテスト（キャッシュクリア後）
- [ ] デベロッパーツールでバージョン確認

---

## 🎯 確認用チェックリスト

### デプロイ直後の確認

- [ ] `https://57.180.82.161` にアクセスできる
- [ ] HTMLに `Cache-Control` メタタグがある
- [ ] JSファイルにバージョンパラメータがある (`?v=20251015-1400`)
- [ ] QrScanner UMD版が読み込まれている
- [ ] `typeof QrScanner !== 'undefined'`

### iOS Safari での確認

- [ ] キャッシュをクリアした
- [ ] QR同梱物検品画面が開く
- [ ] 「QRスキャン開始」ボタンが動作する
- [ ] カメラ権限を許可した
- [ ] カメラが起動する
- [ ] エラーメッセージが出ない
- [ ] QRコードを読み取れる

### プライベートモードでの確認

- [ ] プライベートブラウズモードに切り替え
- [ ] 上記の確認項目を再実施
- [ ] すべて正常動作

---

## 📚 関連ドキュメント

- **修正レポート**: `IOS_QRSCANNER_FIX.md`
- **スケジューラ分析**: `SCHEDULER_ANALYSIS_REPORT.md`
- **Safari機能リスト**: `SAFARI_QRSCAN_FEATURES_LIST.md`
- **統合レポート**: `SAFARI_INTEGRATION_COMPLETE.md`

---

## 🔗 有用なリンク

### iOS Safari デバッグ

- [Safari Web Inspector Guide](https://developer.apple.com/safari/tools/)
- [iOS Safari Cache Behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

### QrScanner ライブラリ

- [QrScanner GitHub](https://github.com/nimiq/qr-scanner)
- [UMD vs ESM](https://github.com/umdjs/umd)

### キャッシュバスティング

- [Cache Busting Techniques](https://css-tricks.com/strategies-for-cache-busting-css/)
- [HTTP Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

---

## 📞 サポート

### エラーが解決しない場合

以下の情報を収集してください:

1. **iOS バージョン**: 設定 → 一般 → 情報 → ソフトウェアバージョン
2. **Safari バージョン**: 設定 → Safari → バージョン情報
3. **エラーメッセージ**: Webインスペクタのコンソールログ
4. **Network ログ**: JSファイルの読み込みステータス
5. **実施した手順**: キャッシュクリア方法など

---

**ドキュメント作成日**: 2025-10-15  
**最終更新日**: 2025-10-15 14:00  
**バージョン**: 2.0 (キャッシュバスティング対応)  
**作成者**: GitHub Copilot AI Assistant
