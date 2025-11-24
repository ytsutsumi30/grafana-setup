# QRスキャナー完全ガイド

**最終更新**: 2025-11-23
**対象システム**: 生産管理システム QRスキャン機能

---

## 目次

1. [概要](#概要)
2. [QRスキャナーアーキテクチャ](#qrスキャナーアーキテクチャ)
3. [バージョン履歴と比較](#バージョン履歴と比較)
4. [実装技術詳細](#実装技術詳細)
5. [パフォーマンス最適化](#パフォーマンス最適化)
6. [ベストプラクティス](#ベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

本システムでは、複数のQRスキャナー実装があり、それぞれ異なる用途に最適化されています。

### 主要実装ファイル

| ファイル | 用途 | 最適化 | 推奨度 |
|---------|------|--------|--------|
| `qr-scanner.js` | 本番業務システム（モジュール版） | iOS/Safari完全対応 | ⭐⭐⭐⭐⭐ |
| `qr-inspection.html` | QR検品システム（インライン版） | iOS/Safari完全対応 | ⭐⭐⭐⭐⭐ |
| `safari.html` | テスト・実証用 | URL自動遷移 | ⭐⭐⭐⭐ |
| `safari2.html` | 簡易版（非推奨） | 基本機能のみ | ⭐⭐ |
| `QRPOC.html` | INFOR CSI統合テスト | CSI連携専用 | ⭐⭐⭐ |

---

## QRスキャナーアーキテクチャ

### 基本構成

```
┌─────────────────────────────────────┐
│   SafariOptimizedQRScanner クラス    │
├─────────────────────────────────────┤
│ - カメラアクセス管理                  │
│ - QRコード検出 (qr-scanner@1.4.2)   │
│ - BarcodeDetector フォールバック     │
│ - iOS最適化（3回/秒スキャン）        │
│ - BFCache対応                       │
│ - デバイス自動検出                   │
│ - キャリブレーション（自動）         │
└─────────────────────────────────────┘
```

### 検出方法の優先順位

```
1. QrScanner (qr-scanner@1.4.2 UMD)
   ├─ iOS: 3回/秒スキャン
   ├─ その他: 5回/秒スキャン
   ├─ calculateScanRegion で領域最適化
   └─ preferredCamera: 'environment' で背面カメラ優先

   失敗 ↓

2. BarcodeDetector (ブラウザネイティブAPI)
   ├─ 200ms間隔（5回/秒相当）
   ├─ requestAnimationFrame で効率的スキャン
   └─ Chrome/Safari対応

   失敗 ↓

3. エラー表示 + 手動入力
   └─ プロンプトでQR値を手入力可能
```

### デバイス検出

#### 簡易版 (safari.html)
```javascript
isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
```

#### 詳細版 (qr-scanner.js)
```javascript
detectDevice() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIPad = /iPad/.test(ua);
    const isIPhone = /iPhone/.test(ua);

    // iOS バージョン検出
    const match = ua.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
    let iosVersion = null;
    if (match) {
        iosVersion = {
            major: parseInt(match[1]),
            minor: parseInt(match[2]),
            patch: match[3] ? parseInt(match[3]) : 0
        };
    }

    return {
        isIOS, isIPad, isIPhone, iosVersion,
        userAgent: ua,
        supportsImageCapture: 'ImageCapture' in window,
        supportsBarcodeDetector: 'BarcodeDetector' in window
    };
}
```

---

## バージョン履歴と比較

### バージョンタイムライン

```
初期実装 (safari2.html)
├─ maxScansPerSecond: 10 (固定)
└─ preferredCamera: 未設定

↓ 問題発見: iOS Safariでスキャン失敗率高い

改善版 (safari.html)
├─ maxScansPerSecond: iOS 3回/秒、その他 5回/秒
├─ preferredCamera: 'environment'
└─ 5段階カメラフォールバック

↓ 実証実験: 成功率大幅改善

最終版 (qr-scanner.js)
├─ safari.html実証設定を採用
├─ デバイス詳細検出追加
├─ 連続スキャンモード対応
└─ 業務システム統合機能追加
```

### 主要バージョン比較

#### 1. スキャンレート設定

| バージョン | iOS | その他 | CPU使用率 (iOS) | 安定性 |
|-----------|-----|--------|----------------|--------|
| safari2.html | 10回/秒 | 10回/秒 | 50-70% (高) | 不安定 |
| safari.html | 3回/秒 | 5回/秒 | 15-25% (低) | 高い |
| qr-scanner.js | 3回/秒 | 5回/秒 | 15-25% (低) | 高い |

#### 2. カメラ初期化フォールバック

**safari2.html (1段階のみ)**:
```javascript
{ width: 1280, height: 720, facingMode: this.currentCamera }
```

**safari.html / qr-scanner.js (5段階フォールバック)**:
```javascript
// Level 1: 理想的な設定
{ width: 1280, height: 720, facingMode: 'environment' }

// Level 2: HD解像度
{ width: 1280, height: 720, facingMode: this.currentCamera }

// Level 3: SD解像度
{ width: 640, height: 480, facingMode: this.currentCamera }

// Level 4: 最小要求
{ facingMode: this.currentCamera }

// Level 5: 完全フォールバック
{ video: true }  // 任意のカメラ
```

#### 3. 機能比較マトリクス

| 機能 | safari.html | safari2.html | qr-scanner.js | qr-inspection.html |
|------|-------------|--------------|---------------|-------------------|
| **デバイス検出** | 簡易版 | 簡易版 | 詳細版 | 詳細版 |
| **URL自動遷移** | ✅ | ❌ | ❌ | ❌ |
| **カウントダウン** | ✅ | ❌ | ❌ | ❌ |
| **BFCache対応** | ✅ | ✅ | ✅ | ✅ |
| **カメラ切り替え** | ✅ | ✅ | ✅ | ✅ |
| **手動入力** | ❌ | ❌ | ✅ | ✅ |
| **検品進捗表示** | ❌ | ❌ | ✅ | ✅ |
| **APIデータ連携** | ❌ | ❌ | ✅ | ✅ |
| **連続スキャン** | ❌ | ❌ | ✅ | ✅ |
| **デバッグモード** | ✅ | ✅ | ✅ | ✅ |

---

## 実装技術詳細

### QRスキャナーオプション設定

#### 推奨設定 (本番環境)

```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

const scannerOptions = {
    returnDetailedScanResult: true,
    highlightScanRegion: false,
    highlightCodeOutline: false,
    maxScansPerSecond: isIOS ? 3 : 5,  // iOS: 3回/秒、その他: 5回/秒
    calculateScanRegion: this.calculateScanRegion.bind(this),
    preferredCamera: 'environment'  // 背面カメラ優先
};

this.qrScanner = new QrScanner(
    this.video,
    result => this.handleQRResult(result.data),
    scannerOptions
);
```

#### スキャン領域動的計算

```javascript
calculateScanRegion(video) {
    const { videoWidth, videoHeight } = video;

    // 動画の向き（縦/横）に応じて調整
    const isPortrait = videoHeight > videoWidth;
    const baseSize = Math.min(videoWidth, videoHeight);

    // スキャン領域のサイズ（画面の60%）
    const size = Math.round(baseSize * 0.6);
    const x = Math.round((videoWidth - size) / 2);
    const y = Math.round((videoHeight - size) / 2);

    return {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(size, videoWidth),
        height: Math.min(size, videoHeight)
    };
}
```

### BFCache対応（iOS Safari重要）

Safari特有のBack-Forward Cache (BFCache)に対応するため、以下のイベントを処理:

```javascript
initPageLifecycleHandling() {
    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            this.pauseScanning();
        } else {
            setTimeout(() => this.resumeScanning(), 500);
        }
    });

    // beforeunload
    window.addEventListener('beforeunload', () => {
        this.cleanupResources();
    });

    // BFCache対応 (iOS Safari重要)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // BFCacheから復元された場合
            this.cleanupResources();
        }
    });

    // pagehide
    window.addEventListener('pagehide', () => {
        this.cleanupResources();
    });
}
```

### カメラ初期化とキャリブレーション

```javascript
async initializeCamera() {
    // 5段階フォールバック
    const constraintsList = [
        this.getOptimalConstraints(),
        { video: { facingMode: this.currentCamera, width: 1280, height: 720 } },
        { video: { facingMode: this.currentCamera, width: 640, height: 480 } },
        { video: { facingMode: this.currentCamera } },
        { video: true }
    ];

    for (let i = 0; i < constraintsList.length; i++) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
            this.video.srcObject = this.stream;
            await this.waitForVideoReady();
            await this.calibrateCamera();  // 自動キャリブレーション
            return;
        } catch (error) {
            if (i === constraintsList.length - 1) throw error;
        }
    }
}

async calibrateCamera() {
    if (this.calibrationAttempts >= this.maxCalibrationAttempts) {
        return this.startQRDetection();
    }

    this.calibrationAttempts++;
    const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000;
    await new Promise(resolve => setTimeout(resolve, calibrationDelay));

    const isReady = this.video.readyState === 4 &&
                   this.video.videoWidth > 0 &&
                   !this.video.paused;

    if (isReady) {
        setTimeout(() => this.startQRDetection(), 500);
    } else if (this.calibrationAttempts < this.maxCalibrationAttempts) {
        setTimeout(() => this.calibrateCamera(), 1000);
    }
}
```

---

## パフォーマンス最適化

### スキャンレート別CPU使用率

| レート | iOS Safari CPU使用率 | 安定性 | 推奨度 |
|--------|---------------------|--------|--------|
| **3回/秒** | 低 (15-25%) | 高い | ⭐⭐⭐⭐⭐ |
| **5回/秒** | 中 (25-40%) | 良好 | ⭐⭐⭐⭐ |
| **10回/秒** | 高 (50-70%) | 不安定 | ⭐ |
| **25回/秒** | 過大 (80%+) | 失敗多発 | ❌ |

### iOS最適化設定の効果

| 項目 | 最適化前 | 最適化後 | 改善率 |
|------|---------|----------|--------|
| **iOS Safari初回QR成功率** | ~60% | ~95% | +58% |
| **カメラ初期化安定性** | 普通 | 高い | 大幅改善 |
| **CPU負荷(フォールバック時)** | 高い | 適切 | 改善 |

### BarcodeDetector API間隔制御

```javascript
fallbackToManualDetection() {
    if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        const detectQR = async () => {
            if (this.isScanning && this.video.readyState === 4) {
                const currentTime = Date.now();
                // iOS最適化: 200ms間隔（5回/秒相当）
                if (currentTime - this.lastDetectionAttempt > 200) {
                    const barcodes = await detector.detect(this.video);
                    this.lastDetectionAttempt = currentTime;

                    if (barcodes.length > 0) {
                        this.handleQRResult(barcodes[0].rawValue);
                        return;
                    }
                }
            }

            if (this.isScanning) {
                requestAnimationFrame(detectQR);
            }
        };

        detectQR();
    }
}
```

---

## ベストプラクティス

### 1. iOS Safari向け推奨設定

```javascript
// ✅ 推奨
{
    maxScansPerSecond: 3,  // iOS最適化
    preferredCamera: 'environment',  // 背面カメラ優先
    calculateScanRegion: this.calculateScanRegion.bind(this),
    returnDetailedScanResult: true,
    highlightScanRegion: false,
    highlightCodeOutline: false
}

// ❌ 非推奨
{
    maxScansPerSecond: 10,  // CPU過負荷
    // preferredCamera 未設定 → フロントカメラになる可能性
}
```

### 2. カメラフォールバック戦略

```javascript
// ✅ 推奨: 5段階フォールバック
const strategies = [
    'HD環境カメラ',
    'HD現在カメラ',
    'SD現在カメラ',
    '最小制約カメラ',
    '任意カメラ'
];

// ❌ 非推奨: 単一設定のみ
const singleStrategy = 'HD環境カメラのみ';
```

### 3. BFCache対応

```javascript
// ✅ 推奨: 4種類のイベント対応
window.addEventListener('pageshow', handleBFCacheRestore);
window.addEventListener('pagehide', handleBFCacheStore);
window.addEventListener('freeze', handleFreeze);
window.addEventListener('resume', handleResume);

// ❌ 非推奨: イベント未対応
// → Safariでブラウザバック時にカメラが動作し続ける
```

### 4. リソースクリーンアップ

```javascript
cleanupResources() {
    // QrScannerの停止と破棄
    if (this.qrScanner) {
        this.qrScanner.stop();
        this.qrScanner.destroy();
        this.qrScanner = null;
    }

    // ストリームの停止
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }

    // ビデオ要素のクリア
    if (this.video && this.video.srcObject) {
        this.video.srcObject = null;
    }
}
```

### 5. デバッグモード実装

```javascript
// 本番環境での診断に役立つデバッグパネル
toggleDebug() {
    this.debugMode = !this.debugMode;
    const debugPanel = document.getElementById('debug-info-panel');

    if (this.debugMode) {
        debugPanel.style.display = 'block';
        this.startDebugUpdateLoop();

        // 診断情報の表示
        this.updateDebug('ios', this.deviceInfo.isIOS ? 'Yes' : 'No');
        this.updateDebug('resolution', `${this.video.videoWidth}x${this.video.videoHeight}`);
        this.updateDebug('scanrate', `${this.deviceInfo.isIOS ? 3 : 5}/sec`);
        this.updateDebug('method', this.detectionMethod);
    }
}
```

---

## トラブルシューティング

### 問題1: QRコードが認識されない

#### 症状
- カメラは起動するがQRコードを認識しない
- 読み取りに時間がかかる

#### 原因と解決策

**原因A: スキャンレート過多**
```javascript
// ❌ 問題のある設定
maxScansPerSecond: 10  // iOS Safariで失敗率高い

// ✅ 推奨設定
maxScansPerSecond: isIOS ? 3 : 5
```

**原因B: スキャン領域の問題**
```javascript
// ✅ calculateScanRegionを実装
calculateScanRegion: this.calculateScanRegion.bind(this)

// calculateScanRegionメソッドが未実装の場合、全画面スキャンになりCPU負荷が高い
```

**原因C: 照明条件**
- 明るい環境で試す（300ルクス以上推奨）
- 影がQRコードにかからないようにする
- QRコードと10-30cm程度の距離を保つ

### 問題2: カメラが起動しない

#### 症状
- カメラ許可を求められない
- エラーメッセージが表示される

#### 解決策

**HTTPS環境の確認**:
```bash
# 開発環境: localhostでアクセス
http://localhost:8080

# 本番環境: HTTPS必須
https://your-domain.com
```

**カメラ許可の確認 (iOS)**:
1. 設定 → Safari → カメラ → 「許可」
2. 設定 → プライバシーとセキュリティ → カメラ → Safari ON
3. ページを再読み込み

**フォールバック確認**:
```javascript
// コンソールログで確認
// "Trying camera constraints (attempt 1/5)..."
// "Camera stream acquired successfully with constraints X"

// 5段階すべて失敗した場合はハードウェア問題の可能性
```

### 問題3: BFCache復帰後にカメラが動作しない

#### 症状
- ブラウザバック後、カメラが表示されない
- または、カメラが黒画面のまま

#### 解決策

```javascript
// pageshow イベントで状態チェック
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        console.log('[BFCache] Restored from cache');
        this.cleanupResources();

        // 必要に応じて再初期化
        const wasActive = sessionStorage.getItem('was-scanning');
        if (wasActive === 'true') {
            sessionStorage.removeItem('was-scanning');
            this.showStatus('カメラが停止されました。再度スキャン開始してください。', 'warning');
        }
    }
});
```

### 問題4: 連続スキャンが動作しない

#### 症状
- 1つ目のQRコードは認識されるが、2つ目以降が認識されない

#### 解決策

```javascript
handleQRResult(data) {
    // スキャン成功後、再スキャンの準備
    const success = await processQRScan(data);

    const hasPending = this.qrContext?.items?.some(item => item.status === 'pending');
    if (success && hasPending) {
        // 連続スキャンに備えて少し待機してから再開
        setTimeout(async () => {
            if (this.safariScanner) {
                this.safariScanner.isScanning = true;
                await this.safariScanner.calibrateCamera();
            }
        }, 1000);
    }
}
```

### 問題5: デバッグ情報の確認方法

#### ブラウザコンソールログ

**正常動作時のログ例**:
```
[Camera] Detected 2 camera(s): [...]
[Video] Metadata loaded
[Video] Ready: {readyState: 4, size: "1280x720"}
[Video] Playback started successfully
[Video] First frame ready after 300ms
[Calibration] Waiting 4000ms for camera stabilization...
[Calibration] ✅ Success on attempt 1 - Video: 1280x720
[Scan Region] 768x768 at (256, -24) - Portrait: false
[QR] QrScanner started (iOS: true, rate: 3/sec)
[QR] Detected: QR-MAIN-PROD001
```

**エラー発生時のログ例**:
```
[Camera] Error: NotAllowedError
[Calibration] ❌ Not ready (readyState: 2, size: 0x0, paused: true)
[QR] No detection method available
```

---

## 付録

### A. 各ファイルの用途まとめ

**本番環境推奨**:
- `qr-scanner.js` - モジュール版、業務システム統合
- `qr-inspection.html` - インライン版、単独動作

**開発・テスト用**:
- `safari.html` - 実証・テスト、URL自動遷移機能
- `safari2.html` - 簡易版（非推奨）

**特殊用途**:
- `QRPOC.html` - INFOR CSI/Factory Track統合テスト

### B. 依存ライブラリ

```html
<!-- QRスキャナーライブラリ -->
<script src="https://unpkg.com/qr-scanner@1.4.2/qr-scanner.umd.min.js"></script>

<!-- UIフレームワーク (任意) -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
```

### C. ブラウザ対応状況

| ブラウザ | QrScanner | BarcodeDetector | 推奨度 |
|---------|-----------|-----------------|--------|
| iOS Safari 15+ | ✅ | ✅ (17+実験的) | ⭐⭐⭐⭐⭐ |
| Android Chrome | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Desktop Chrome | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Desktop Safari | ✅ | ✅ | ⭐⭐⭐⭐ |
| Desktop Edge | ✅ | ✅ | ⭐⭐⭐⭐ |
| Firefox | ✅ | ❌ | ⭐⭐⭐ |

---

**作成日**: 2025-11-23
**作成者**: システム統合ドキュメント自動生成
**参照ドキュメント**:
- QR_SCANNER_BRUSHUP_REPORT.md
- QR_SCANNER_COMPARISON.md
- QR_SCAN_COMPARISON_REPORT.md
- QRPOC_VS_PRODUCTION_COMPARISON.md
- その他QRスキャナー関連ドキュメント
