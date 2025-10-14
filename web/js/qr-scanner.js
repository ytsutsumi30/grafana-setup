/**
 * Safari最適化QRスキャナー v2.0
 * iPad/iPhone Safari 18.6+ 対応版
 */

export class SafariOptimizedQRScanner {
    constructor(options = {}) {
        this.video = null;
        this.stream = null;
        this.isScanning = false;
        this.qrScanner = null;
        this.currentCamera = 'environment';
        this.cameras = [];
        this.calibrationAttempts = 0;
        this.maxCalibrationAttempts = 3;
        this.frameCount = 0;
        this.lastDetectionAttempt = 0;
        this.isCalibrating = false;
        this.debugMode = false;
        
        // 新機能: 連続スキャンモードとスキャン履歴
        this.continuousMode = options.continuousMode || false;
        this.scanHistory = [];
        this.maxHistorySize = options.maxHistorySize || 10;
        this.duplicateThreshold = options.duplicateThreshold || 2000; // 2秒
        
        // iPad/iPhone最適化: デバイス情報
        this.deviceInfo = this.detectDevice();
        
        // コールバック関数
        this.onResult = options.onResult || (() => {});
        this.onError = options.onError || (() => {});
        this.onStatusUpdate = options.onStatusUpdate || (() => {});
        this.onValidate = options.onValidate || null; // 結果検証用コールバック
        
        this.initPageLifecycleHandling();
        this.detectCameras();
    }

    // デバイス検出（iPad/iPhone判定強化）
    detectDevice() {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isIPad = /iPad/.test(ua);
        const isIPhone = /iPhone/.test(ua);
        
        // iOS バージョン検出
        let iosVersion = null;
        const match = ua.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
        if (match) {
            iosVersion = {
                major: parseInt(match[1]),
                minor: parseInt(match[2]),
                patch: match[3] ? parseInt(match[3]) : 0
            };
        }
        
        return {
            isIOS,
            isIPad,
            isIPhone,
            iosVersion,
            userAgent: ua,
            supportsImageCapture: 'ImageCapture' in window,
            supportsBarcodeDetector: 'BarcodeDetector' in window
        };
    }

    // ページライフサイクルイベントの処理（Safari最適化）
    initPageLifecycleHandling() {
        // Page Visibility API
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isScanning) {
                    this.log('Page hidden - pausing scan');
                    this.pauseScanning();
                }
            } else {
                if (this.isScanning) {
                    this.log('Page visible - resuming scan');
                    setTimeout(() => this.resumeScanning(), 500);
                }
            }
        });

        // Safari用のbeforeunload対策
        window.addEventListener('beforeunload', () => {
            this.log('Page unloading - cleaning up');
            this.cleanupResources();
        });

        // Safari用のpagehide/pageshowイベント
        window.addEventListener('pagehide', () => {
            this.log('Page hiding - cleaning up');
            this.cleanupResources();
        });

        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                this.log('Page restored from BFCache');
            }
        });
    }

    // ログ出力（デバッグモード対応）
    log(...args) {
        if (this.debugMode) {
            console.log('[QRScanner]', ...args);
        }
    }

    async detectCameras() {
        try {
            // iOS Safari: カメラ許可後にラベルが取得可能
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            
            this.log(`Detected ${this.cameras.length} cameras`, this.cameras);
            
            // デバイス情報をログ
            if (this.debugMode) {
                this.cameras.forEach((cam, idx) => {
                    this.log(`Camera ${idx + 1}:`, {
                        label: cam.label || '(未許可)',
                        deviceId: cam.deviceId ? cam.deviceId.substring(0, 8) + '...' : 'N/A'
                    });
                });
            }
        } catch (error) {
            this.log('Camera detection error:', error);
        }
    }

    // Safari最適化: 段階的なカメラ初期化
    async startScan(videoElement) {
        try {
            this.video = videoElement;
            this.calibrationAttempts = 0;
            this.frameCount = 0;
            
            this.log('Starting scan...', {
                device: this.deviceInfo.isIPad ? 'iPad' : 
                        this.deviceInfo.isIPhone ? 'iPhone' : 'Other',
                iosVersion: this.deviceInfo.iosVersion
            });
            
            this.onStatusUpdate('カメラにアクセス中...');
            
            await this.initializeCamera();
            
        } catch (error) {
            this.handleError(error);
        }
    }

    // iPad/iPhone Safari最適化: カメラ制約の自動選択
    getOptimalConstraints() {
        const baseConstraints = {
            video: {
                facingMode: this.currentCamera,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        };
        
        // iPad/iPhone 特有の最適化
        if (this.deviceInfo.isIOS) {
            // iOS 18以降は高解像度対応
            if (this.deviceInfo.iosVersion && this.deviceInfo.iosVersion.major >= 18) {
                baseConstraints.video.width = { ideal: 1920 };
                baseConstraints.video.height = { ideal: 1080 };
            }
            
            // iPadは大画面なので解像度を上げる
            if (this.deviceInfo.isIPad) {
                baseConstraints.video.aspectRatio = { ideal: 16/9 };
            }
        }
        
        return baseConstraints;
    }

    async initializeCamera() {
        // iPad/iPhone Safari向けに最適化された制約リスト
        const constraintsList = [
            // レベル1: 最適設定（iOS 18+向け）
            this.getOptimalConstraints(),
            
            // レベル2: 標準HD
            {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            
            // レベル3: 標準SD
            {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            },
            
            // レベル4: 最小制約
            {
                video: { facingMode: this.currentCamera }
            },
            
            // レベル5: 完全フォールバック
            { video: true }
        ];

        let lastError = null;
        for (let i = 0; i < constraintsList.length; i++) {
            try {
                this.log(`Attempting constraints level ${i + 1}/${constraintsList.length}`);
                
                this.stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
                
                // ストリーム取得成功
                const track = this.stream.getVideoTracks()[0];
                const settings = track.getSettings();
                
                this.log(`Camera acquired successfully:`, {
                    level: i + 1,
                    resolution: `${settings.width}x${settings.height}`,
                    fps: settings.frameRate,
                    facingMode: settings.facingMode
                });
                
                break;
            } catch (error) {
                this.log(`Constraints level ${i + 1} failed:`, error.name);
                lastError = error;
                
                if (i === constraintsList.length - 1) {
                    throw lastError;
                }
            }
        }

        if (!this.stream) {
            throw new Error('カメラストリームの取得に失敗しました');
        }

        // iPad/iPhone Safari向けの特別な属性設定
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.setAttribute('autoplay', '');
        this.video.muted = true;
        this.video.playsInline = true;
        
        // ストリームを割り当て
        this.video.srcObject = this.stream;

        // ビデオ準備待機
        await this.waitForVideoReady();
        
        this.isScanning = true;
        
        // キャリブレーション実行
        await this.calibrateCamera();
    }

    // Safari最適化: より確実なビデオ準備待機
    async waitForVideoReady() {
        return new Promise((resolve, reject) => {
            let checkCount = 0;
            const maxChecks = 150;
            
            const timeout = setTimeout(() => {
                this.log('Video initialization timeout', {
                    readyState: this.video.readyState,
                    videoWidth: this.video.videoWidth,
                    videoHeight: this.video.videoHeight,
                    streamActive: this.stream?.active,
                    checks: checkCount
                });
                
                // readyState >= 2 なら続行を試みる
                if (this.video.readyState >= 2) {
                    this.log('Timeout but video ready, continuing...');
                    resolve();
                } else {
                    reject(new Error('ビデオ初期化タイムアウト'));
                }
            }, 30000);

            const checkReady = () => {
                checkCount++;
                
                // ストリーム状態確認
                if (!this.stream || !this.stream.active) {
                    clearTimeout(timeout);
                    reject(new Error('カメラストリームが無効です'));
                    return;
                }
                
                if (this.debugMode && checkCount % 10 === 0) {
                    this.log(`Video check ${checkCount}:`, {
                        readyState: this.video.readyState,
                        size: `${this.video.videoWidth}x${this.video.videoHeight}`
                    });
                }
                
                // メタデータ読み込み完了 & 映像データあり
                if (this.video.readyState >= 2 && 
                    this.video.videoWidth > 0 && 
                    this.video.videoHeight > 0) {
                    
                    clearTimeout(timeout);
                    
                    // 再生開始
                    this.video.play()
                        .then(() => {
                            this.log('Video playback started', {
                                size: `${this.video.videoWidth}x${this.video.videoHeight}`,
                                readyState: this.video.readyState
                            });
                            
                            // iPad/iPhone向けの追加待機
                            const waitTime = this.deviceInfo.isIOS ? 1500 : 1000;
                            setTimeout(resolve, waitTime);
                        })
                        .catch((error) => {
                            this.log('Video play failed:', error);
                            
                            // autoplayが効いている場合は続行
                            if (this.video.readyState >= 2) {
                                this.log('Play failed but continuing...');
                                setTimeout(resolve, 1000);
                            } else {
                                clearTimeout(timeout);
                                reject(error);
                            }
                        });
                } else if (checkCount >= maxChecks) {
                    clearTimeout(timeout);
                    reject(new Error('ビデオが準備できません'));
                } else {
                    setTimeout(checkReady, 100);
                }
            };

            this.video.onloadedmetadata = () => {
                this.log('Video metadata loaded');
                checkReady();
            };
            
            this.video.onerror = (error) => {
                this.log('Video element error:', error);
                clearTimeout(timeout);
                reject(new Error('ビデオ要素エラー'));
            };
            
            setTimeout(checkReady, 100);
        });
    }

    // キャリブレーション機能（Safari最適化の核心）
    async calibrateCamera() {
        try {
            if (this.isCalibrating || this.calibrationAttempts >= this.maxCalibrationAttempts) {
                return this.startQRDetection();
            }

            this.isCalibrating = true;
            this.calibrationAttempts++;
            
            this.onStatusUpdate(`キャリブレーション中... (${this.calibrationAttempts}/${this.maxCalibrationAttempts})`);
            this.log(`Calibration attempt ${this.calibrationAttempts}`);

            // カメラストリームの状態確認
            if (!this.stream || !this.stream.active) {
                throw new Error('カメラストリームが無効です');
            }

            if (!this.video || !this.video.srcObject) {
                throw new Error('ビデオ要素が初期化されていません');
            }

            // iPad/iPhone向けのキャリブレーション期間
            const calibrationTime = this.deviceInfo.isIOS ? 2500 : 2000;
            await new Promise(resolve => setTimeout(resolve, calibrationTime));

            this.isCalibrating = false;

            // カメラ準備完了確認
            if (this.video.readyState >= 2 && 
                this.video.videoWidth > 0 && 
                this.video.videoHeight > 0) {
                
                this.log('Calibration successful', {
                    size: `${this.video.videoWidth}x${this.video.videoHeight}`,
                    readyState: this.video.readyState
                });
                
                this.startQRDetection();
            } else if (this.calibrationAttempts < this.maxCalibrationAttempts) {
                this.log('Calibration incomplete, retrying...');
                setTimeout(() => this.calibrateCamera(), 1000);
            } else {
                // 最大試行回数到達
                if (this.video.readyState >= 2) {
                    this.log('Max attempts but continuing...');
                    this.startQRDetection();
                } else {
                    throw new Error('カメラのキャリブレーションに失敗しました');
                }
            }
        } catch (error) {
            this.log('Calibration error:', error);
            this.isCalibrating = false;
            this.handleError('キャリブレーションエラー', error);
        }
    }

    async startQRDetection() {
        this.onStatusUpdate('QRコードをスキャン中...');
        
        // QR Scannerライブラリを使用
        if (typeof QrScanner !== 'undefined') {
            try {
                console.log('Initializing QR Scanner with library...');
                this.qrScanner = new QrScanner(
                    this.video,
                    result => this.handleQRResult(result.data),
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: false,
                        highlightCodeOutline: false,
                        // Safari最適化設定
                        maxScansPerSecond: 5, // iPhone Safari向けにさらに頻度を下げる
                        calculateScanRegion: this.calculateScanRegion.bind(this),
                        // iPhone Safari向けの追加設定
                        preferredCamera: 'environment'
                    }
                );
                
                await this.qrScanner.start();
                console.log('QR Scanner started successfully');
                
                // フレームカウンター開始
                this.startFrameCounter();
                
            } catch (error) {
                console.warn('QR Scanner library failed, using fallback:', error);
                this.fallbackToManualDetection();
            }
        } else {
            console.log('QR Scanner library not available, using fallback');
            this.fallbackToManualDetection();
        }
    }

    // Safari最適化: スキャン領域の計算
    calculateScanRegion(video) {
        const { videoWidth, videoHeight } = video;
        const size = Math.min(videoWidth, videoHeight) * 0.6;
        const x = (videoWidth - size) / 2;
        const y = (videoHeight - size) / 2;
        
        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(size),
            height: Math.round(size)
        };
    }

    // フレームカウンター（デバッグ用）
    startFrameCounter() {
        const countFrames = () => {
            if (this.isScanning) {
                this.frameCount++;
                requestAnimationFrame(countFrames);
            }
        };
        countFrames();
    }

    fallbackToManualDetection() {
        console.log('Attempting fallback detection methods...');
        
        if ('BarcodeDetector' in window) {
            console.log('Using BarcodeDetector API');
            
            BarcodeDetector.getSupportedFormats().then(formats => {
                console.log('Supported barcode formats:', formats);
            });
            
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            
            const detectQR = async () => {
                if (this.isScanning && this.video.readyState >= 2) {
                    try {
                        const currentTime = Date.now();
                        if (currentTime - this.lastDetectionAttempt > 300) { // 300ms間隔（iPhone Safari向けに調整）
                            const barcodes = await detector.detect(this.video);
                            this.lastDetectionAttempt = currentTime;
                            
                            if (barcodes.length > 0) {
                                console.log('QR code detected via BarcodeDetector:', barcodes[0].rawValue);
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
            this.onStatusUpdate('QRコードをスキャン中... (フォールバックモード)');
            console.log('BarcodeDetector fallback active');
        } else {
            console.error('No QR detection method available');
            this.onStatusUpdate('このブラウザではQRコード検出がサポートされていません');
            
            // iOS Safariの場合は、ユーザーに具体的な対処方法を案内
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                this.handleError(
                    'iOS SafariがネイティブのQR検出APIを提供していません。iOSを最新バージョンに更新するか、Chrome/Edgeなど他のブラウザ、またはアプリ版をご利用ください。',
                    new Error('BarcodeDetector API unavailable on iOS Safari')
                );
            } else {
                this.handleError('このブラウザではQRコード検出機能がサポートされていません。最新のSafari、Chrome、またはEdgeをご利用ください。',
                    new Error('No QR detection API available'));
            }
        }
    }

    handleQRResult(data) {
        // スキャン中でない場合は無視
        if (!this.isScanning) return;
        
        // 重複スキャンチェック
        const lastScan = this.scanHistory[this.scanHistory.length - 1];
        if (lastScan && lastScan.data === data && 
            (Date.now() - lastScan.timestamp) < this.duplicateThreshold) {
            console.log('Duplicate scan ignored:', data);
            return; // 重複スキャンを無視
        }
        
        console.log('QR detected:', data);
        
        // 結果検証（オプション）
        if (this.onValidate && typeof this.onValidate === 'function') {
            const validationResult = this.onValidate(data);
            if (validationResult === false) {
                console.warn('QR validation failed:', data);
                this.onStatusUpdate('QRコードの検証に失敗しました');
                
                // 連続モードの場合は次のスキャンを待つ
                if (!this.continuousMode) {
                    this.stopScan();
                }
                return;
            }
        }
        
        // スキャン履歴に追加
        this.scanHistory.push({
            data: data,
            timestamp: Date.now()
        });
        
        // 履歴サイズ制限
        if (this.scanHistory.length > this.maxHistorySize) {
            this.scanHistory.shift();
        }
        
        // 連続スキャンモードでない場合はスキャン停止
        if (!this.continuousMode) {
            this.stopScan();
        }
        
        // 結果をコールバックで返す
        this.onResult(data);
    }

    // Safari最適化: スキャン一時停止/再開
    pauseScanning() {
        if (this.qrScanner) {
            this.qrScanner.stop();
        }
        this.onStatusUpdate('一時停止中...');
    }

    async resumeScanning() {
        if (this.qrScanner && this.isScanning) {
            try {
                await this.qrScanner.start();
                this.onStatusUpdate('QRコードをスキャン中...');
            } catch (error) {
                console.warn('Resume scanning failed:', error);
                this.calibrateCamera();
            }
        }
    }

    stopScan() {
        this.isScanning = false;
        this.isCalibrating = false;
        this.cleanupResources();
    }

    cleanupResources() {
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.qrScanner.destroy();
            this.qrScanner = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
    }

    handleError(messageOrError, error) {
        this.stopScan();
        
        let message = 'カメラにアクセスできませんでした。';
        let actualError = error;
        
        // 引数が1つの場合（Errorオブジェクトのみ）
        if (messageOrError instanceof Error && !error) {
            actualError = messageOrError;
        } else if (typeof messageOrError === 'string') {
            message = messageOrError;
        }
        
        // エラータイプに応じたメッセージ
        if (actualError) {
            console.error('QR Scanner Error:', actualError);
            
            switch (actualError.name) {
                case 'NotAllowedError':
                    message = 'カメラの使用が拒否されました。ブラウザの設定からカメラの許可を有効にしてください。';
                    break;
                case 'NotFoundError':
                    message = 'カメラが見つかりませんでした。デバイスにカメラが接続されているか確認してください。';
                    break;
                case 'NotSupportedError':
                    message = 'このブラウザではカメラ機能がサポートされていません。最新のSafari、Chrome、またはEdgeをお試しください。';
                    break;
                case 'NotReadableError':
                    message = 'カメラが他のアプリケーションで使用中です。他のアプリを閉じてから再試行してください。';
                    break;
                case 'SecurityError':
                    message = 'セキュリティ制限によりカメラにアクセスできません。HTTPS環境が必要です。';
                    break;
                default:
                    // カスタムエラーメッセージがある場合
                    if (actualError.message && !message.includes(actualError.message)) {
                        message = `${message}\n詳細: ${actualError.message}`;
                    }
            }
        }

        console.error('Final error message:', message);
        this.onError(message, actualError);
    }

    // 手動キャリブレーション
    async recalibrate() {
        this.calibrationAttempts = 0;
        await this.calibrateCamera();
    }

    // デバッグモード切り替え
    toggleDebug() {
        this.debugMode = !this.debugMode;
        return this.debugMode;
    }

    // ステータス情報取得
    getStatus() {
        return {
            isScanning: this.isScanning,
            isCalibrating: this.isCalibrating,
            calibrationAttempts: this.calibrationAttempts,
            frameCount: this.frameCount,
            cameraCount: this.cameras.length,
            videoReady: this.video ? this.video.readyState : 0,
            continuousMode: this.continuousMode,
            scanHistoryCount: this.scanHistory.length
        };
    }

    // 新機能: 手動入力
    async manualInput(promptMessage = 'QRコードの内容を手入力してください:') {
        return new Promise((resolve, reject) => {
            try {
                const input = prompt(promptMessage);
                if (input && input.trim()) {
                    const trimmedInput = input.trim();
                    
                    // 結果検証（オプション）
                    if (this.onValidate && typeof this.onValidate === 'function') {
                        const validationResult = this.onValidate(trimmedInput);
                        if (validationResult === false) {
                            reject(new Error('入力されたデータの検証に失敗しました'));
                            return;
                        }
                    }
                    
                    // スキャン履歴に追加
                    this.scanHistory.push({
                        data: trimmedInput,
                        timestamp: Date.now(),
                        manual: true
                    });
                    
                    // 履歴サイズ制限
                    if (this.scanHistory.length > this.maxHistorySize) {
                        this.scanHistory.shift();
                    }
                    
                    // 結果をコールバックで返す
                    this.onResult(trimmedInput);
                    resolve(trimmedInput);
                } else {
                    reject(new Error('入力がキャンセルされました'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // 新機能: 連続スキャンモードの切り替え
    setContinuousMode(enabled) {
        this.continuousMode = enabled;
        console.log('Continuous scan mode:', enabled ? 'enabled' : 'disabled');
        return this.continuousMode;
    }

    // 新機能: スキャン履歴の取得
    getScanHistory() {
        return [...this.scanHistory]; // コピーを返す
    }

    // 新機能: スキャン履歴のクリア
    clearScanHistory() {
        this.scanHistory = [];
        console.log('Scan history cleared');
    }

    // 新機能: 最後のスキャン結果を取得
    getLastScan() {
        return this.scanHistory.length > 0 
            ? this.scanHistory[this.scanHistory.length - 1] 
            : null;
    }

    // 新機能: スキャン統計情報
    getStatistics() {
        const now = Date.now();
        const recentScans = this.scanHistory.filter(
            scan => (now - scan.timestamp) < 60000 // 直近1分間
        );
        
        return {
            totalScans: this.scanHistory.length,
            recentScans: recentScans.length,
            manualScans: this.scanHistory.filter(scan => scan.manual).length,
            autoScans: this.scanHistory.filter(scan => !scan.manual).length,
            oldestScan: this.scanHistory.length > 0 
                ? new Date(this.scanHistory[0].timestamp) 
                : null,
            newestScan: this.scanHistory.length > 0 
                ? new Date(this.scanHistory[this.scanHistory.length - 1].timestamp) 
                : null
        };
    }
}

export default SafariOptimizedQRScanner;