/**
 * GitHub Pages QRスキャンテスト
 * iPhone Safari対応版
 */

let qrScanner = null;
let scanHistory = [];
let isScanning = false;

// DOM要素
const videoElement = document.getElementById('qr-video');
const videoWrapper = document.getElementById('qr-video-wrapper');
const placeholder = document.getElementById('qr-placeholder');
const statusOverlay = document.getElementById('qr-status');
const scanLine = document.getElementById('qr-scan-line');
const startButton = document.getElementById('btn-start');
const stopButton = document.getElementById('btn-stop');
const resultContainer = document.getElementById('result-container');
const resultContent = document.getElementById('result-content');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    checkEnvironment();
    setupEventListeners();
});

/**
 * 環境チェック
 */
function checkEnvironment() {
    // プロトコルチェック
    const protocol = window.location.protocol;
    const protocolBadge = document.getElementById('protocol-badge');
    
    if (protocol === 'https:') {
        protocolBadge.textContent = 'プロトコル: HTTPS ✓';
        protocolBadge.className = 'info-badge badge-https';
    } else {
        protocolBadge.textContent = 'プロトコル: HTTP ✗';
        protocolBadge.className = 'info-badge badge-http';
    }

    // カメラAPI対応チェック
    const cameraBadge = document.getElementById('camera-badge');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        cameraBadge.textContent = 'カメラAPI: 対応 ✓';
        cameraBadge.className = 'info-badge badge-https';
    } else {
        cameraBadge.textContent = 'カメラAPI: 非対応 ✗';
        cameraBadge.className = 'info-badge badge-http';
        startButton.disabled = true;
        startButton.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>カメラAPI非対応';
    }

    // User Agent表示
    const userAgentElement = document.getElementById('user-agent');
    userAgentElement.textContent = `User Agent: ${navigator.userAgent}`;

    console.log('Environment Check:', {
        protocol: protocol,
        isSecureContext: window.isSecureContext,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        userAgent: navigator.userAgent
    });
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    startButton.addEventListener('click', startScanning);
    stopButton.addEventListener('click', stopScanning);
}

/**
 * スキャン開始
 */
async function startScanning() {
    if (isScanning) return;

    try {
        startButton.disabled = true;
        updateStatus('カメラを起動しています...', 'info');

        // UIの切り替え
        placeholder.style.display = 'none';
        videoWrapper.style.display = 'block';
        scanLine.style.display = 'block';

        // QRスキャナーの初期化
        if (!qrScanner) {
            qrScanner = new QrScanner(
                videoElement,
                result => handleScanResult(result),
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 5,
                    calculateScanRegion: (video) => {
                        const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
                        const scanRegionSize = Math.round(smallestDimension * 0.6);
                        return {
                            x: Math.round((video.videoWidth - scanRegionSize) / 2),
                            y: Math.round((video.videoHeight - scanRegionSize) / 2),
                            width: scanRegionSize,
                            height: scanRegionSize,
                            downScaledWidth: 400,
                            downScaledHeight: 400
                        };
                    }
                }
            );
        }

        // カメラ起動（iPhone Safari対応の制約設定）
        await qrScanner.start();
        
        isScanning = true;
        updateStatus('QRコードをスキャン中...', 'success');
        
        // ボタン切り替え
        startButton.style.display = 'none';
        stopButton.style.display = 'block';

        console.log('QR Scanner started successfully');

    } catch (error) {
        console.error('Scanner start error:', error);
        handleScanError(error);
        resetUI();
    }
}

/**
 * スキャン停止
 */
function stopScanning() {
    if (qrScanner) {
        qrScanner.stop();
    }
    
    isScanning = false;
    resetUI();
    updateStatus('スキャンを停止しました', 'info');
    
    console.log('QR Scanner stopped');
}

/**
 * スキャン結果処理
 */
function handleScanResult(result) {
    console.log('QR Code detected:', result);

    const data = result.data || result;
    
    // 結果表示
    resultContainer.style.display = 'block';
    resultContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <strong class="text-success"><i class="fas fa-check-circle me-2"></i>読み取り成功</strong>
            <span class="badge bg-success">${new Date().toLocaleTimeString('ja-JP')}</span>
        </div>
        <div class="text-dark">
            <strong>データ:</strong><br>
            <code style="word-break: break-all;">${escapeHtml(data)}</code>
        </div>
    `;

    // 履歴に追加
    addToHistory(data);

    // ビープ音（オプション）
    playBeep();

    // 一時停止して再開（連続スキャン防止）
    if (qrScanner) {
        qrScanner.stop();
        updateStatus('読み取り成功！ 再スキャン準備中...', 'success');
        
        setTimeout(async () => {
            if (isScanning && qrScanner) {
                await qrScanner.start();
                updateStatus('QRコードをスキャン中...', 'success');
            }
        }, 1500);
    }
}

/**
 * エラー処理
 */
function handleScanError(error) {
    console.error('Scan error:', error);

    let errorMessage = 'スキャンエラーが発生しました';
    let errorDetail = error.message;

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'カメラ権限が拒否されました';
        errorDetail = 'ブラウザの設定でカメラの使用を許可してください。';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'カメラが見つかりません';
        errorDetail = 'デバイスにカメラが接続されているか確認してください。';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'カメラを起動できません';
        errorDetail = '他のアプリがカメラを使用している可能性があります。';
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'カメラの制約エラー';
        errorDetail = 'リクエストされたカメラ設定がサポートされていません。';
    }

    resultContainer.style.display = 'block';
    resultContent.className = 'scan-result error';
    resultContent.innerHTML = `
        <div class="mb-2">
            <strong class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}</strong>
        </div>
        <div class="text-dark">
            <small>${errorDetail}</small><br>
            <small class="text-muted">エラー詳細: ${error.name}</small>
        </div>
    `;

    updateStatus(errorMessage, 'error');
}

/**
 * ステータス更新
 */
function updateStatus(message, type = 'info') {
    if (!statusOverlay) return;

    statusOverlay.textContent = message;
    
    // 色の変更
    if (type === 'success') {
        statusOverlay.style.background = 'rgba(40, 167, 69, 0.9)';
    } else if (type === 'error') {
        statusOverlay.style.background = 'rgba(220, 53, 69, 0.9)';
    } else {
        statusOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
    }
}

/**
 * UI リセット
 */
function resetUI() {
    videoWrapper.style.display = 'none';
    placeholder.style.display = 'block';
    scanLine.style.display = 'none';
    
    startButton.style.display = 'block';
    startButton.disabled = false;
    stopButton.style.display = 'none';
}

/**
 * 履歴に追加
 */
function addToHistory(data) {
    const timestamp = new Date().toLocaleString('ja-JP');
    
    scanHistory.unshift({
        data: data,
        timestamp: timestamp
    });

    // 最大20件まで保持
    if (scanHistory.length > 20) {
        scanHistory = scanHistory.slice(0, 20);
    }

    updateHistoryDisplay();
}

/**
 * 履歴表示更新
 */
function updateHistoryDisplay() {
    historyCount.textContent = scanHistory.length;

    if (scanHistory.length === 0) {
        historyList.innerHTML = '<p class="text-muted text-center">まだスキャンされていません</p>';
        return;
    }

    historyList.innerHTML = scanHistory.map((item, index) => `
        <div class="history-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <span class="badge bg-primary me-2">#${scanHistory.length - index}</span>
                    <small class="text-muted">${item.timestamp}</small>
                    <div class="mt-2">
                        <code style="word-break: break-all; font-size: 0.9em;">${escapeHtml(item.data)}</code>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="copyToClipboard('${escapeHtml(item.data)}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * クリップボードにコピー
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('クリップボードにコピーしました');
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('コピーに失敗しました');
    });
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ビープ音再生（オプション）
 */
function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('Beep sound failed:', error);
    }
}

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (qrScanner) {
        qrScanner.stop();
    }
});

// ページ非表示時の処理
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isScanning && qrScanner) {
        qrScanner.stop();
        isScanning = false;
        resetUI();
    }
});
