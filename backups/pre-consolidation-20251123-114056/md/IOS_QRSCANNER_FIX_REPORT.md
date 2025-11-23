# iOS Safari QR Scanner Fix Report

**日付**: 2025-10-15
**問題**: QR同梱物検品でQRスキャン開始押下後、iOSカメラ起動エラー
**エラーコード**: I5-71H: BarcodeDetector API unavailable on iOS Safari

---

## 問題の概要

iOS Safari で QR 検品機能を使用する際、「QRスキャン開始」ボタンを押下してカメラが起動した後、以下のエラーが発生していました：

```
I5-71H: BarcodeDetector API unavailable on iOS Safari
```

---

## 根本原因

### 1. **QR Scanner Library の初期化失敗**

`web/js/qr-scanner.js` の `startQRDetection()` メソッド（485-537行目）で、以下の問題がありました：

- QR Scanner library（qr-scanner@1.4.2）が正しく初期化されない
- ライブラリの初期化に失敗すると、フォールバック検出メソッド `fallbackToManualDetection()` に移行
- iOS Safari では BarcodeDetector API がサポートされていないため、フォールバック検出も失敗

### 2. **ライブラリ参照の問題**

```javascript
// 修正前
if (typeof QrScanner !== 'undefined') {
    this.qrScanner = new QrScanner(...);
}
```

このチェックでは、UMD モジュールとして読み込まれた `window.QrScanner` を検出できない場合がありました。

### 3. **iOS Safari 特有の制約**

iOS Safari では以下の API が利用できません：
- **BarcodeDetector API**: サポートされていない
- 代替として QR Scanner library（qr-scanner.js）を使用する必要がある

---

## 実装した修正

### 修正1: QR Scanner Library の参照方法を改善

**ファイル**: `web/js/qr-scanner.js:485-556`

```javascript
// 修正後
const QrScannerLib = typeof QrScanner !== 'undefined' ? QrScanner : (typeof window !== 'undefined' && window.QrScanner);

if (QrScannerLib) {
    this.qrScanner = new QrScannerLib(
        this.video,
        result => {
            console.log('QR Scanner callback received:', result);
            this.handleQRResult(result.data || result);
        },
        scannerOptions
    );
}
```

**変更内容**:
- `window.QrScanner` もチェックするように変更
- より詳細なログ出力を追加
- エラーハンドリングを強化

### 修正2: iOS Safari 専用のエラーハンドリング追加

**ファイル**: `web/js/qr-scanner.js:584-659`

```javascript
fallbackToManualDetection() {
    // iOS Safari の場合、QR Scanner library が失敗した理由を特定
    if (this.deviceInfo.isIOS) {
        console.error('QR Scanner library failed on iOS Safari');
        console.log('Possible reasons:', {
            videoReady: this.video?.readyState,
            streamActive: this.stream?.active,
            videoSize: `${this.video?.videoWidth}x${this.video?.videoHeight}`,
            iosVersion: this.deviceInfo.iosVersion
        });

        // iOS Safari では BarcodeDetector が使えないので、専用エラーを表示
        this.showIOSQRScannerError();
        return;
    }

    // ... 他のブラウザ向けの BarcodeDetector フォールバック
}
```

**変更内容**:
- iOS Safari を検出した場合、BarcodeDetector を試行せずに専用エラーを表示
- デバッグ情報を詳細に出力

### 修正3: iOS Safari 専用エラーメッセージの追加

**ファイル**: `web/js/qr-scanner.js:661-705`

新しいメソッド `showIOSQRScannerError()` を追加：

```javascript
showIOSQRScannerError() {
    this.stopScan();

    const errorHTML = `
        <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
            ...
            <h3>iOS Safari でのQRスキャナー初期化エラー</h3>
            <p><strong>🔧 解決方法:</strong></p>
            <ol>
                <li>ページを再読み込み（F5キーまたは画面を引き下げ）</li>
                <li>カメラ権限を確認: 設定 → Safari → カメラ → 許可</li>
                <li>他のアプリでカメラを使用していないか確認</li>
                <li>Safariを再起動</li>
                <li>iOSを最新バージョンに更新（推奨: iOS 15以降）</li>
            </ol>
            <p><strong>📋 代替手段:</strong></p>
            <ul>
                <li>Chrome for iOS または Edge for iOS を使用</li>
                <li>iOSの標準カメラアプリでQRコードを読み取り</li>
                <li>「テストスキャン」ボタンで手動入力</li>
            </ul>
        </div>
    `;

    this.handleError(errorHTML, new Error('QR Scanner library initialization failed on iOS Safari'));
}
```

### 修正4: キャッシュバスティング

**ファイル**: `web/index.html:394-395`

```html
<!-- 修正前 -->
<script type="module" src="js/index-app.js?v=20251015-1400"></script>
<script type="module" src="js/qr-scanner.js?v=20251015-1400"></script>

<!-- 修正後 -->
<script type="module" src="js/index-app.js?v=20251015-1530"></script>
<script type="module" src="js/qr-scanner.js?v=20251015-1530"></script>
```

**目的**: iOS Safari のキャッシュを強制的にクリアし、最新のコードを読み込む

---

## テスト手順

### 1. **iOS Safari でのテスト（推奨）**

1. iPhone/iPad Safari で以下の URL にアクセス:
   ```
   https://your-domain/index.html
   ```

2. 以下の手順でキャッシュをクリア:
   - Safari を開く
   - 設定 → Safari → 詳細 → Website データ → 全てのWebサイトデータを削除
   - またはページを強制リロード（画面を引き下げて更新）

3. 「検品待ち出荷指示」から「QR検品」ボタンをクリック

4. 「検品者名」を入力

5. 「QRスキャン開始」ボタンをクリック

6. カメラ権限を許可

7. **期待される動作**:
   - カメラが正常に起動
   - QR Scanner library が正常に初期化される
   - QRコードをスキャンできる

8. **エラーが発生した場合**:
   - 新しいエラーメッセージが表示される（オレンジ色の枠）
   - 「iOS Safari でのQRスキャナー初期化エラー」というタイトル
   - 具体的な解決方法が提示される

### 2. **Chrome for iOS でのテスト**

iOS Safari で問題が継続する場合、Chrome for iOS を使用:
- Chrome for iOS は独自のレンダリングエンジンではなく Safari WebKit を使用するが、一部の API サポートが異なる場合がある

### 3. **デバッグモードでの確認**

1. QR検品モーダルで「Debug」ボタンをクリック
2. デバッグ情報パネルが表示される
3. 以下の情報を確認:
   - **Device**: iPad/iPhone の検出状況
   - **ReadyState**: ビデオ要素の準備状態
   - **Stream**: カメラストリームの接続状況
   - **Detection**: QR検出エンジンの状態

### 4. **ブラウザコンソールでの確認**

Safari のデベロッパーツールを開いて以下を確認:
```
Safari → 開発 → [デバイス名] → [ページ名]
```

以下のログが出力されることを確認:
```
Initializing QR Scanner with library (UMD)...
Device info: {isIOS: true, isIPad: true/false, ...}
QrScanner lib: function QrScanner() { ... }
Scanner options: {...}
QR Scanner started successfully with UMD library
```

---

## 既知の制約事項

### iOS Safari の制約

1. **BarcodeDetector API 非対応**
   - iOS Safari では BarcodeDetector API が実装されていない
   - 代替として qr-scanner library（qr-scanner@1.4.2）を使用

2. **カメラストリームの初期化時間**
   - iOS デバイスではカメラの初期化に時間がかかる場合がある
   - キャリブレーション時間を 3秒（iOS）に設定済み

3. **メモリ制約**
   - iOS Safari ではメモリ制限が厳しいため、長時間の使用で問題が発生する可能性がある
   - ページの再読み込みを推奨

### 回避策

1. **ページ再読み込み**: エラーが発生した場合は、まずページを再読み込み

2. **別ブラウザの使用**: Chrome for iOS または Edge for iOS を試す

3. **手動入力**: 「テストスキャン」ボタンでシミュレーションが可能

4. **標準カメラアプリ**: iOS 標準のカメラアプリでQRコードを読み取り、結果を手動入力

---

## 影響範囲

### 変更されたファイル

1. **`web/js/qr-scanner.js`**
   - `startQRDetection()` メソッドの改善
   - `fallbackToManualDetection()` メソッドに iOS 専用ロジックを追加
   - `showIOSQRScannerError()` メソッドを新規追加
   - デバッグログの強化

2. **`web/index.html`**
   - キャッシュバスティングバージョンを更新（v=20251015-1530）

### 影響を受ける機能

- **QR同梱物検品機能**: メイン機能
- **エラーハンドリング**: iOS Safari 特有のエラーメッセージ改善
- **デバッグ機能**: より詳細な情報を出力

### 影響を受けないもの

- 従来の検品機能（非QR）
- Android/PC ブラウザでの動作
- バックエンドAPI

---

## 今後の改善案

### 短期的改善（1-2週間）

1. **jsQR ライブラリの統合**
   - QR Scanner library が失敗した場合の追加フォールバック
   - Canvas ベースの検出ロジック実装

2. **エラー報告機能**
   - エラー発生時に自動的にログをサーバーに送信
   - デバイス情報、エラー詳細を収集

### 中期的改善（1-3ヶ月）

1. **Progressive Web App (PWA) 対応**
   - Service Worker でキャッシュ管理を改善
   - オフライン動作のサポート

2. **WebAssembly 版 QR デコーダー**
   - より高速で安定した QR 検出
   - ブラウザ依存性の低減

3. **ネイティブアプリの検討**
   - iOS/Android ネイティブアプリで完全なカメラ制御
   - より安定した動作を保証

---

## まとめ

### 修正の効果

1. **エラーメッセージの改善**: ユーザーが次にとるべきアクションが明確になった
2. **デバッグの容易化**: より詳細なログ出力で問題の特定が容易に
3. **iOS 特化の対応**: iOS Safari の制約に対応した専用ロジック

### 注意事項

- iOS Safari では QR Scanner library の初期化に失敗する場合がまだある
- その場合は、表示されるエラーメッセージの指示に従って対処
- 代替手段（Chrome for iOS、標準カメラアプリ）を推奨

### サポート

問題が継続する場合は、以下の情報を添えて報告してください：
- iOS バージョン
- Safari バージョン
- ブラウザコンソールのエラーログ
- デバッグパネルの情報（スクリーンショット）

---

**修正実施者**: Claude Code
**レビュー**: 未実施
**次回レビュー予定**: iOS実機でのテスト後
