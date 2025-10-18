# QRスキャン問題分析レポート
**作成日時**: 2025年10月16日  
**分析対象**: safari.html と qr-inspection.html のQRスキャン成功率の差異

## 🔍 問題の要約

### ユーザー報告
- **safari.html**: 画面切り替えや再SCANで成功することが多い ✅
- **qr-inspection.html**: QRSCANの読み取りが成功しない ❌

## 📊 詳細分析結果

### 1. **スキャンレート設定の違い（最重要）**

#### safari.html の設定:
```javascript
// 行824-826: safari.html
maxScansPerSecond: this.isIOSDevice() ? 3 : 5,  // iOS: 3回/秒、その他: 5回/秒
```

#### qr-inspection-app.js (qr-scanner.js) の設定:
```javascript
// 行524-526: qr-scanner.js
maxScansPerSecond: this.deviceInfo.isIOS ? 10 : 25,  // iOS: 10回/秒、その他: 25回/秒
```

**差異**:
- iOS Safari: **3回/秒 vs 10回/秒** (3.3倍の差)
- その他: **5回/秒 vs 25回/秒** (5倍の差)

**分析**:
- qr-inspection.htmlは**過度に高速なスキャンレート**を使用
- iOS Safariはリソース制約により、高速スキャンでパフォーマンス低下
- 画面切り替え後にsafari.htmlが成功する理由: **低スキャンレートによる安定性**

---

### 2. **キャリブレーション時間の違い**

#### safari.html の設定:
```javascript
// 行774-776: safari.html
await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5秒
```

#### qr-scanner.js の設定:
```javascript
// 行448-450: qr-scanner.js
const calibrationTime = this.deviceInfo.isIOS ? 3000 : 2000; // iOS: 3秒、その他: 2秒
```

**差異**:
- safari.html: 一律 **2.5秒**
- qr-scanner.js: iOS **3秒**、その他 2秒

**分析**: キャリブレーション時間は大きな問題ではない（僅差）

---

### 3. **エラーハンドリングとフォールバックの違い**

#### safari.html:
```javascript
// 行832-834: safari.html - より堅牢なエラーハンドリング
} catch (error) {
    console.warn('QR Scanner library failed, using fallback:', error);
    this.fallbackToManualDetection(); // BarcodeDetectorへのフォールバック
}
```

#### qr-scanner.js:
```javascript
// 行551-557: qr-scanner.js - 同様のフォールバック実装
} catch (error) {
    console.error('QR Scanner library failed:', error);
    this.log('QRスキャナーライブラリ失敗、フォールバック試行');
    this.fallbackToManualDetection();
}
```

**分析**: フォールバック機能は同等に実装されている

---

### 4. **ビデオ準備待機の違い**

#### safari.html:
```javascript
// 行664-665: safari.html
const waitTime = this.isIOSDevice() ? 2000 : 1000;
setTimeout(resolve, waitTime);
```

#### qr-scanner.js:
```javascript
// 行389-392: qr-scanner.js
this.video.onloadedmetadata = () => {
    this.log('Video metadata loaded');
    setTimeout(checkReady, 100);
};
```

**分析**: safari.htmlはiOS向けに**2秒の追加待機時間**を設定（より慎重）

---

### 5. **カメラ制約の段階的フォールバック**

両方とも同様の段階的フォールバック機能を実装しているため、差異なし。

---

## 🎯 根本原因の特定

### **主要原因: スキャンレートの過剰設定**

qr-inspection.html (qr-scanner.js) は、iOS Safariで **10回/秒** のスキャンレートを使用しています。これは以下の問題を引き起こします:

1. **CPUリソースの過剰消費**
   - iOS Safariは他のブラウザよりメモリ・CPU制約が厳しい
   - 10回/秒は処理が追いつかず、スキャンが不安定になる

2. **カメラストリームの競合**
   - 高頻度スキャンによりビデオストリームの読み取りが不安定化
   - フレームドロップやバッファリング遅延が発生

3. **ワーカースレッドのオーバーヘッド**
   - QRスキャナーはWebWorkerを使用
   - 高頻度呼び出しによりワーカーとメインスレッド間の通信が過負荷

### **safari.htmlが成功する理由**

- **低スキャンレート (3回/秒)** により、各スキャン処理に十分な時間を確保
- カメラが安定してフレームをキャプチャできる
- CPUリソースに余裕があり、QR検出精度が向上

---

## 🔧 推奨される修正

### **修正1: スキャンレートの最適化（最重要）**

**ファイル**: `js/qr-scanner.js`  
**行**: 524-526

**現在の設定**:
```javascript
maxScansPerSecond: this.deviceInfo.isIOS ? 10 : 25,
```

**推奨設定**:
```javascript
// safari.html実証済み設定を採用
maxScansPerSecond: this.deviceInfo.isIOS ? 3 : 5,
```

**根拠**:
- safari.htmlで実証済みの成功率
- iOS Safariのリソース制約に適合
- ユーザー体験の向上（安定したスキャン）

---

### **修正2: iOS向け追加待機時間の実装**

**ファイル**: `js/qr-scanner.js`  
**行**: 389-392 付近

**現在の設定**:
```javascript
setTimeout(checkReady, 100);
```

**推奨設定**:
```javascript
// iOS向けに長めの待機時間を設定
const waitTime = this.deviceInfo.isIOS ? 2000 : 1000;
setTimeout(() => {
    this.log('Video playback started after wait');
    setTimeout(resolve, waitTime);
}, 100);
```

---

### **修正3: デバッグ情報の追加**

スキャンレートとデバイス情報をコンソールに明示的に出力:

```javascript
console.log('QR Scanner initialized:', {
    device: this.deviceInfo.isIOS ? (this.deviceInfo.isIPad ? 'iPad' : 'iPhone') : 'Other',
    maxScansPerSecond: scannerOptions.maxScansPerSecond,
    iosVersion: this.deviceInfo.iosVersion
});
```

---

## 📈 期待される効果

### **修正実施後の改善**

1. **iOS Safariでのスキャン成功率向上**: 現在の低成功率 → **safari.html同等（高成功率）**
2. **安定性の向上**: スキャンの一貫性が向上
3. **CPUリソース使用率の低下**: バッテリー消費の削減
4. **ユーザー体験の改善**: ストレスのないQRスキャン体験

---

## 🧪 テスト計画

### **検証項目**

1. **iOS Safari (iPad/iPhone)**
   - [ ] QRコードスキャンの成功率テスト（10回連続）
   - [ ] 画面切り替え後の再スキャンテスト
   - [ ] 長時間使用時の安定性テスト

2. **その他のブラウザ**
   - [ ] Chrome/Edge/Firefoxでの互換性テスト
   - [ ] スキャン速度の体感確認

3. **パフォーマンステスト**
   - [ ] CPUリソース使用率の測定（開発者ツール）
   - [ ] メモリ使用量のモニタリング

---

## 📝 まとめ

### **問題の本質**
qr-inspection.htmlは、iOS Safariに対して**過剰なスキャンレート（10回/秒）**を設定しており、これがリソース競合とスキャン失敗の原因となっています。

### **解決策**
safari.htmlで実証済みの**低スキャンレート（3回/秒）**を採用することで、安定したQRスキャン機能を実現できます。

### **実装優先度**
1. **最優先**: スキャンレートの変更（3回/秒）
2. **推奨**: iOS向け待機時間の追加
3. **オプション**: デバッグ情報の追加

---

**次のステップ**: 修正の実装と本番環境へのデプロイ
