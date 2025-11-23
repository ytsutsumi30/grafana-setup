# QRスキャン機能比較: safari2.html vs qr-inspection2.html

**作成日**: 2025-10-18  
**目的**: safari2.htmlの改善機能がqr-inspection2.htmlに正しく適用されているか確認

---

## 📊 比較サマリー

| 機能 | safari2.html | qr-inspection2.html | 状態 |
|------|--------------|---------------------|------|
| キャッシュ対策 meta tags | ✅ あり | ✅ あり | 🟢 **同等** |
| waitForFirstFrame() | ✅ あり (50回, 5秒) | ✅ あり (50回, 5秒) | 🟢 **同等** |
| calibrateCamera() 初回4秒 | ✅ あり | ✅ あり | 🟢 **同等** |
| iOS最適化 (3回/秒) | ✅ あり | ✅ あり | 🟢 **同等** |
| calculateScanRegion() | ✅ あり | ✅ あり | 🟢 **同等** |
| BarcodeDetector fallback | ✅ 強化版 | ✅ 強化版 | 🟢 **同等** |
| BFCache対応 | ✅ 完全対応 | ✅ 完全対応 | 🟢 **同等** |
| デバッグ情報強化 | ✅ あり | ✅ あり | 🟢 **同等** |
| Safari属性設定 | ✅ あり | ✅ あり | 🟢 **同等** |
| 複数カメラ対応 | ✅ あり | ✅ あり | 🟢 **同等** |

---

## 🔍 詳細比較

### 1. キャッシュ対策 Meta Tags

#### safari2.html
```html
<!-- キャッシュ対策 -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

#### qr-inspection2.html
```html
<!-- キャッシュ対策 -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

**結果**: 🟢 **完全一致**

---

### 2. waitForFirstFrame() 関数

#### safari2.html
```javascript
async waitForFirstFrame() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間試行

        const checkFrame = () => {
            attempts++;
            
            // videoWidth/Heightが有効で、readyStateが4（完全準備完了）
            if (this.video.readyState === 4 && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                console.log(`[Video] First frame ready after ${attempts * 100}ms`);
                // さらに安定を待つ
                setTimeout(resolve, 500);
            } else if (attempts >= maxAttempts) {
                console.warn('[Video] First frame timeout, proceeding anyway');
                resolve(); // タイムアウトしても続行
            } else {
                setTimeout(checkFrame, 100);
            }
        };

        setTimeout(checkFrame, 100);
    });
}
```

#### qr-inspection2.html
```javascript
async waitForFirstFrame() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間試行

        const checkFrame = () => {
            attempts++;
            
            // videoWidth/Heightが有効で、readyStateが4（完全準備完了）
            if (this.video.readyState === 4 && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                console.log(`[Video] First frame ready after ${attempts * 100}ms`);
                // さらに安定を待つ
                setTimeout(resolve, 500);
            } else if (attempts >= maxAttempts) {
                console.warn('[Video] First frame timeout, proceeding anyway');
                resolve(); // タイムアウトしても続行
            } else {
                setTimeout(checkFrame, 100);
            }
        };

        setTimeout(checkFrame, 100);
    });
}
```

**結果**: 🟢 **完全一致**  
**待機時間**: 最大5秒 (50回 × 100ms) + 500ms安定化 = 5.5秒

---

### 3. calibrateCamera() 関数

#### safari2.html
```javascript
async calibrateCamera() {
    if (this.isCalibrating || this.calibrationAttempts >= this.maxCalibrationAttempts) {
        return this.startQRDetection();
    }
    
    this.isCalibrating = true;
    this.calibrationAttempts++;
    
    this.calibrationIndicator.classList.remove('hidden');
    this.updateStatus(`キャリブレーション中... (${this.calibrationAttempts}/${this.maxCalibrationAttempts})`);
    
    // キャリブレーション期間を延長（Safari最適化: 初回起動の安定性向上）
    const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000; // 初回は4秒
    console.log(`[Calibration] Waiting ${calibrationDelay}ms for camera stabilization...`);
    await new Promise(resolve => setTimeout(resolve, calibrationDelay));
    
    // ビデオストリームが完全に安定しているか確認
    const isFullyReady = this.video.readyState === 4 && 
                        this.video.videoWidth > 0 && 
                        this.video.videoHeight > 0 &&
                        !this.video.paused;
    
    this.calibrationIndicator.classList.add('hidden');
    this.isCalibrating = false;
    
    if (isFullyReady) {
        console.log(`[Calibration] ✅ Success on attempt ${this.calibrationAttempts} - Video: ${this.video.videoWidth}x${this.video.videoHeight}`);
        // さらに少し待機してから検出開始（安定性向上）
        setTimeout(() => this.startQRDetection(), 500);
    } else {
        // ビデオがまだ準備できていない場合は再キャリブレーション
        console.warn(`[Calibration] ❌ Not ready (readyState: ${this.video.readyState}, size: ${this.video.videoWidth}x${this.video.videoHeight}, paused: ${this.video.paused})`);
        if (this.calibrationAttempts < this.maxCalibrationAttempts) {
            setTimeout(() => this.calibrateCamera(), 1000);
        } else {
            // 最大試行回数に達した場合でもQR検出を開始
            console.warn('[Calibration] ⚠️ Max attempts reached, starting detection anyway');
            this.startQRDetection();
        }
    }
}
```

#### qr-inspection2.html
```javascript
async calibrateCamera() {
    if (this.isCalibrating || this.calibrationAttempts >= this.maxCalibrationAttempts) {
        return this.startQRDetection();
    }
    
    this.isCalibrating = true;
    this.calibrationAttempts++;
    
    this.calibrationOverlay.style.display = 'flex';
    this.updateCameraStatus(`キャリブレーション中... (${this.calibrationAttempts}/${this.maxCalibrationAttempts})`);
    
    // キャリブレーション期間を延長（Safari最適化: 初回起動の安定性向上）
    const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000; // 初回は4秒
    console.log(`[Calibration] Waiting ${calibrationDelay}ms for camera stabilization...`);
    await new Promise(resolve => setTimeout(resolve, calibrationDelay));
    
    // ビデオストリームが完全に安定しているか確認
    const isFullyReady = this.video.readyState === 4 && 
                        this.video.videoWidth > 0 && 
                        this.video.videoHeight > 0 &&
                        !this.video.paused;
    
    this.calibrationOverlay.style.display = 'none';
    this.isCalibrating = false;
    
    if (isFullyReady) {
        console.log(`[Calibration] ✅ Success on attempt ${this.calibrationAttempts} - Video: ${this.video.videoWidth}x${this.video.videoHeight}`);
        // さらに少し待機してから検出開始（安定性向上）
        setTimeout(() => this.startQRDetection(), 500);
    } else {
        // ビデオがまだ準備できていない場合は再キャリブレーション
        console.warn(`[Calibration] ❌ Not ready (readyState: ${this.video.readyState}, size: ${this.video.videoWidth}x${this.video.videoHeight}, paused: ${this.video.paused})`);
        if (this.calibrationAttempts < this.maxCalibrationAttempts) {
            setTimeout(() => this.calibrateCamera(), 1000);
        } else {
            // 最大試行回数に達した場合でもQR検出を開始
            console.warn('[Calibration] ⚠️ Max attempts reached, starting detection anyway');
            this.startQRDetection();
        }
    }
}
```

**結果**: 🟢 **ロジック完全一致** (UI要素名のみ微妙に異なる)
- safari2: `calibrationIndicator.classList` (Tailwind CSS)
- qr-inspection2: `calibrationOverlay.style.display` (カスタムCSS)

**待機時間**: 
- 初回: 4秒 + 500ms = 4.5秒
- 2回目以降: 2秒 + 500ms = 2.5秒

---

### 4. iOS最適化 - スキャンレート調整

#### safari2.html & qr-inspection2.html (共通)
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

this.qrScanner = new QrScanner(
    this.video,
    result => this.handleQRResult(result.data),
    {
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: isIOS ? 3 : 5,  // iOS: 3回/秒、その他: 5回/秒
        preferredCamera: 'environment',  // 背面カメラ優先
        calculateScanRegion: this.calculateScanRegion.bind(this)
    }
);
```

**結果**: 🟢 **完全一致**

---

### 5. calculateScanRegion() - 動的スキャン領域計算

#### safari2.html & qr-inspection2.html (共通)
```javascript
calculateScanRegion(video) {
    const { videoWidth, videoHeight } = video;
    const isPortrait = videoHeight > videoWidth;
    const baseSize = Math.min(videoWidth, videoHeight);
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

**結果**: 🟢 **完全一致**

---

### 6. BarcodeDetector フォールバック

#### safari2.html & qr-inspection2.html (共通)
```javascript
fallbackToManualDetection() {
    if ('BarcodeDetector' in window) {
        this.detectionMethod = 'BarcodeDetector';
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        
        const detectQR = async () => {
            if (this.isScanning && this.video.readyState === 4) {
                try {
                    const currentTime = Date.now();
                    // iOS最適化: 200ms間隔（5回/秒相当）
                    if (currentTime - this.lastDetectionAttempt > 200) {
                        const barcodes = await detector.detect(this.video);
                        this.lastDetectionAttempt = currentTime;
                        
                        if (barcodes.length > 0) {
                            console.log('[QR] Detected via BarcodeDetector:', barcodes[0].rawValue);
                            this.handleQRResult(barcodes[0].rawValue);
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('BarcodeDetector error:', error);
                }
            }
            
            if (this.isScanning) {
                requestAnimationFrame(detectQR);
            }
        };
        
        detectQR();
        this.updateDebug('detection', 'BarcodeDetector active');
        this.updateDebug('method', 'BarcodeDetector');
        console.log('[QR] Fallback to BarcodeDetector');
    } else {
        this.detectionMethod = 'none';
        this.updateDebug('method', 'None (Error)');
        console.error('[QR] No detection method available');
        this.handleError(new Error('QRコード検出機能がサポートされていません。最新のブラウザをご利用ください。'));
    }
}
```

**結果**: 🟢 **完全一致**

---

### 7. BFCache完全対応

#### safari2.html & qr-inspection2.html (共通)
```javascript
// pagehide イベント
window.addEventListener('pagehide', (event) => {
    console.log('[BFCache] pagehide - persisted:', event.persisted);
    this.cleanupResources();
    if (this.isScanning) {
        sessionStorage.setItem('qr-scanner-was-active', 'true');
    }
});

// pageshow イベント
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        console.log('[BFCache] pageshow - restored from cache');
        this.cleanupResources();
        const wasActive = sessionStorage.getItem('qr-scanner-was-active');
        if (wasActive === 'true') {
            sessionStorage.removeItem('qr-scanner-was-active');
            this.showScreen('start');
        }
    }
});

// freeze/resume イベント
window.addEventListener('freeze', () => {
    console.log('[BFCache] freeze');
    this.cleanupResources();
});

window.addEventListener('resume', () => {
    console.log('[BFCache] resume');
    if (this.isScanning) this.calibrateCamera();
});
```

**結果**: 🟢 **完全一致**

---

### 8. Safari最適化属性

#### safari2.html & qr-inspection2.html (共通)
```javascript
this.video.setAttribute('playsinline', true);
this.video.setAttribute('webkit-playsinline', true);
this.video.muted = true;
```

**結果**: 🟢 **完全一致**

---

### 9. デバッグ情報強化

#### safari2.html & qr-inspection2.html (共通)
```javascript
updateDebug(type, value) {
    const element = document.getElementById(`debug-${type}`);
    if (element) element.textContent = value;
}

// 使用例:
this.updateDebug('camera', `${this.cameras.length} camera(s)`);
this.updateDebug('detection', 'QrScanner active');
this.updateDebug('method', 'QrScanner');
this.updateDebug('resolution', `${this.video.videoWidth}x${this.video.videoHeight}`);
this.updateDebug('stream', 'Connected');
```

**結果**: 🟢 **完全一致**

---

### 10. 複数カメラ対応

#### safari2.html & qr-inspection2.html (共通)
```javascript
async detectCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.cameras = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`[Camera] Detected ${this.cameras.length} camera(s):`, this.cameras);
        this.updateDebug('camera', `${this.cameras.length} camera(s)`);
        this.updateDebug('detection', `${this.cameras.length} cameras found`);
        
        // 背面カメラを優先的に選択
        const backCameraIndex = this.cameras.findIndex(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
        );
        
        if (backCameraIndex !== -1) {
            this.cameraIndex = backCameraIndex;
            console.log(`[Camera] Found back camera at index ${backCameraIndex}`);
        }
    } catch (error) {
        console.warn('カメラ検出エラー:', error);
        this.updateDebug('detection', 'Camera detection failed');
    }
}

async switchCamera() {
    if (this.cameras.length <= 1) {
        this.showStatus('切り替え可能なカメラがありません', 'info');
        return;
    }
    
    this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
    
    const wasScanning = this.isScanning;
    this.cleanupResources();
    
    if (wasScanning) {
        setTimeout(async () => {
            try {
                await this.initializeCamera();
                this.showStatus(`カメラ ${this.cameraIndex + 1}/${this.cameras.length} に切り替えました`, 'success');
            } catch (error) {
                console.error('Camera switch error:', error);
            }
        }, 500);
    }
}
```

**結果**: 🟢 **完全一致**

---

## 📈 タイミング比較

### 初回起動時の待機時間

| フェーズ | safari2.html | qr-inspection2.html | 状態 |
|---------|--------------|---------------------|------|
| waitForVideoReady | 最大15秒 | 最大15秒 | 🟢 同等 |
| waitForFirstFrame | 5秒 + 500ms | 5秒 + 500ms | 🟢 同等 |
| calibrateCamera (初回) | 4秒 + 500ms | 4秒 + 500ms | 🟢 同等 |
| **合計時間** | **約10秒** | **約10秒** | 🟢 同等 |

### 2回目以降の待機時間

| フェーズ | safari2.html | qr-inspection2.html | 状態 |
|---------|--------------|---------------------|------|
| calibrateCamera (2回目) | 2秒 + 500ms | 2秒 + 500ms | 🟢 同等 |
| calibrateCamera (3回目) | 2秒 + 500ms | 2秒 + 500ms | 🟢 同等 |

---

## 🎯 主な違い

### UI要素の実装方法

| 要素 | safari2.html | qr-inspection2.html |
|------|--------------|---------------------|
| フレームワーク | Tailwind CSS | カスタムCSS |
| キャリブレーション表示 | `calibrationIndicator.classList` | `calibrationOverlay.style.display` |
| ステータス更新 | `updateStatus()` | `updateCameraStatus()` |
| 画面遷移 | `showScreen('screen-name')` | `showScreen('screen-name')` |

**これらはUI実装の違いであり、QRスキャンロジックには影響しません。**

---

## ✅ 結論

### 🎉 safari2.htmlの改善がqr-inspection2.htmlに完全適用済み

**適用された改善項目 (10/10):**
1. ✅ キャッシュ対策 meta tags
2. ✅ waitForFirstFrame() 関数
3. ✅ calibrateCamera() 初回4秒待機
4. ✅ iOS最適化 (スキャンレート 3回/秒)
5. ✅ calculateScanRegion() 動的領域計算
6. ✅ BarcodeDetector 強化版フォールバック
7. ✅ BFCache完全対応
8. ✅ Safari最適化属性設定
9. ✅ デバッグ情報強化
10. ✅ 複数カメラ対応

### 📊 機能同等性: 100%

**qr-inspection2.htmlは、safari2.htmlのQRスキャン機能をすべて継承しています。**

### 🚀 期待される動作

両ファイルとも以下の動作が期待されます:
- ✅ iOS Safariで初回起動からQRコード読み取り成功
- ✅ カメラ初期化の安定性向上
- ✅ キャッシュ問題の解消
- ✅ BFCache復帰時の適切なリソース管理
- ✅ 複数カメラデバイスでの柔軟な切り替え
- ✅ フォールバック検出方式の自動切り替え

---

**作成者**: GitHub Copilot  
**最終更新**: 2025-10-18
