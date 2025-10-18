# Safari.html QRスキャン機能リスト（URL自動遷移機能除く）

## 🏗️ コア QR スキャン機能

### 1. **カメラ初期化・管理**
```javascript
// 段階的カメラ制約フォールバック（5レベル）
async initializeCamera() {
    const constraintsList = [
        // レベル1: 最適設定（1920x1080）
        // レベル2: 標準HD（1280x720）
        // レベル3: 標準SD（640x480）
        // レベル4: 最小制約（facingMode のみ）
        // レベル5: 完全フォールバック（video: true）
    ];
}

// iOS デバイス判定
isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// カメラ検出
async detectCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.cameras = devices.filter(device => device.kind === 'videoinput');
}
```

### 2. **Safari最適化ビデオ準備**
```javascript
// iPhone/iPad 特別属性設定
this.video.setAttribute('playsinline', true);
this.video.setAttribute('webkit-playsinline', true);
this.video.setAttribute('autoplay', true);
this.video.muted = true;
this.video.playsInline = true;
this.video.style.objectFit = 'cover';
this.video.style.transform = 'scaleX(-1)'; // ミラー表示

// 確実なビデオ準備待機（200回チェック、30秒タイムアウト）
async waitForVideoReady() {
    // readyState >= 2 で続行
    // iOS向け2秒追加待機
}
```

### 3. **キャリブレーション機能**
```javascript
// iPhone/iPad向け長時間キャリブレーション
async calibrateCamera() {
    const calibrationTime = this.isIOSDevice() ? 3000 : 2000;
    // 最大3回試行
    // readyState >= 1 で最低限続行
}
```

### 4. **QR検出エンジン**
```javascript
// プライマリ検出：QrScanner ライブラリ
async startQRDetection() {
    this.qrScanner = new QrScanner(this.video, result => this.handleQRResult(result.data || result), {
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: this.isIOSDevice() ? 3 : 5, // iOS最適化
        calculateScanRegion: this.calculateScanRegion.bind(this),
        preferredCamera: 'environment'
    });
}

// フォールバック検出：BarcodeDetector API
fallbackToManualDetection() {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const detectionInterval = this.isIOSDevice() ? 500 : 300; // iOS最適化間隔
}
```

### 5. **スキャン領域計算**
```javascript
calculateScanRegion(video) {
    const { videoWidth, videoHeight } = video;
    const size = Math.min(videoWidth, videoHeight) * 0.6;
    return {
        x: Math.round((videoWidth - size) / 2),
        y: Math.round((videoHeight - size) / 2),
        width: Math.round(size),
        height: Math.round(size)
    };
}
```

## 🎯 結果処理機能

### 1. **データタイプ判定**
```javascript
handleNonUrlResult(data) {
    let dataTypeText = 'テキストデータ';
    if (data.includes('@') && data.includes('.')) {
        dataTypeText = 'メールアドレスの可能性';
    } else if (/^\d+$/.test(data)) {
        dataTypeText = '数値データ';
    } else if (data.startsWith('tel:')) {
        dataTypeText = '電話番号';
    } else if (data.startsWith('mailto:')) {
        dataTypeText = 'メールリンク';
    }
}
```

### 2. **結果表示・操作**
```javascript
// クリップボードコピー
async copyToClipboard() {
    await navigator.clipboard.writeText(this.scanResult.textContent);
}

// 結果共有（Web Share API）
async shareResult() {
    if (navigator.share) {
        await navigator.share({
            title: 'QRコード読み取り結果',
            text: text
        });
    }
}
```

## 🔄 ライフサイクル管理

### 1. **ページライフサイクル対応**
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

    // Safari専用イベント
    window.addEventListener('pagehide', () => this.cleanupResources());
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) this.resetAndStart();
    });
}
```

### 2. **スキャン制御**
```javascript
// 一時停止・再開
pauseScanning() {
    if (this.qrScanner) this.qrScanner.stop();
}

async resumeScanning() {
    if (this.qrScanner && this.isScanning) {
        await this.qrScanner.start();
    }
}

// 完全停止・リソース解放
cleanupResources() {
    if (this.qrScanner) {
        this.qrScanner.stop();
        this.qrScanner.destroy();
    }
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.video) {
        this.video.srcObject = null;
    }
}
```

## 🐛 デバッグ・監視機能

### 1. **デバッグ情報表示**
```javascript
updateDebug(type, value) {
    if (this.debugElements[type]) {
        this.debugElements[type].textContent = value;
    }
}

// デバッグモード切り替え
toggleDebug() {
    this.debugMode = !this.debugMode;
    this.debugInfo.classList.toggle('hidden', !this.debugMode);
}
```

### 2. **フレームカウンター**
```javascript
startFrameCounter() {
    const countFrames = () => {
        if (this.isScanning) {
            this.frameCount++;
            requestAnimationFrame(countFrames);
        }
    };
    countFrames();
}
```

## 🚨 エラーハンドリング

### 1. **iOS専用エラー対応**
```javascript
showNotSupportedError() {
    this.errorMessage.innerHTML = `
        <div class="mb-4">
            <strong>iOS Safariでは、このQR検出機能がサポートされていません。</strong>
        </div>
        <div class="text-sm space-y-2">
            <p>🔧 <strong>推奨解決方法:</strong></p>
            <ul class="list-disc list-inside space-y-1 text-left">
                <li>iOSを最新バージョンに更新</li>
                <li>Chrome for iOSやEdgeアプリを使用</li>
                <li>カメラアプリの標準QRスキャナーを使用</li>
            </ul>
        </div>
    `;
}
```

### 2. **包括的エラー処理**
```javascript
handleError(error) {
    // エラータイプ別メッセージ
    switch (error.name) {
        case 'NotAllowedError': // カメラ拒否
        case 'NotFoundError':   // カメラなし
        case 'NotSupportedError': // 非対応
        case 'NotReadableError': // 使用中
        case 'SecurityError':   // セキュリティ
        case 'AbortError':      // 中断
    }
    
    // iOS特化ガイダンス
    if (this.isIOSDevice()) {
        // iOS専用のHTML形式エラーメッセージ
    }
}
```

## 🎨 UI・UX機能

### 1. **画面遷移システム**
```javascript
showScreen(screenName) {
    ['initial-screen', 'camera-screen', 'result-screen', 'error-screen']
        .forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(screenName).classList.remove('hidden');
}
```

### 2. **ステータス更新**
```javascript
updateStatus(message) {
    this.scanStatus.textContent = message;
}
```

### 3. **視覚効果**
```javascript
// スキャンアニメーション
this.scanningAnimation.classList.remove('hidden');

// キャリブレーション表示
this.calibrationIndicator.classList.remove('hidden');
```

## 📱 iOS Safari 特化最適化

### 1. **制約レベル判定**
- iOS 18以降: 1920x1080 対応
- iPad: アスペクト比 16:9 優先
- iPhone: フレーム頻度削減（3fps）

### 2. **検出間隔調整**
- iOS: 500ms 間隔
- その他: 300ms 間隔

### 3. **キャリブレーション時間**
- iOS: 3000ms
- その他: 2000ms

### 4. **ビデオ準備**
- iOS: 2000ms 追加待機
- その他: 1000ms 追加待機

## 🔗 統合可能機能

これらの機能は `qr-scanner.js` と組み合わせることで、さらに強力なQRスキャナーライブラリを構築可能：

1. **履歴管理機能** (qr-scanner.js)
2. **連続スキャンモード** (qr-scanner.js)
3. **結果検証システム** (qr-scanner.js)
4. **統計機能** (qr-scanner.js)
5. **手動入力機能** (qr-scanner.js)

---

**合計機能数: 30+ 個の独立したQRスキャン関連機能**

URL自動遷移機能を除外しても、safari.htmlは非常に包括的なQRスキャン機能セットを提供しています。