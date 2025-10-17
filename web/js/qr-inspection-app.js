import SafariOptimizedQRScanner from './qr-scanner.js';

const API_BASE_URL = '/api';

// URLパラメータから出荷指示IDを取得
const urlParams = new URLSearchParams(window.location.search);
const shippingInstructionId = urlParams.get('id');

let qrContext = null;
let qrInspectionRecord = null;
let safariScanner = null;
let qrVideoElement = null;
let qrStatusBadge = null;
let qrResultContainer = null;
let qrProgressLabel = null;
let qrPassedQuantity = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    if (!shippingInstructionId) {
        showToast('出荷指示IDが指定されていません。', 'danger');
        document.getElementById('qr-items-list').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                出荷指示IDが指定されていません。メイン画面から開き直してください。
            </div>
        `;
        return;
    }

    // イベントリスナーの設定
    document.getElementById('btn-start-qr-scan').addEventListener('click', startQRScanner);
    document.getElementById('btn-complete-qr-inspection').addEventListener('click', completeQRInspection);
    document.getElementById('btn-manual-input').addEventListener('click', manualInputQRCode);
    document.getElementById('btn-test-scan').addEventListener('click', simulateQRScan);

    // QR検品データの読み込み
    await loadQRInspectionData();
});

// QR検品データの読み込み
async function loadQRInspectionData() {
    try {
        // 🔴 緊急対応: モックデータで動作確認（APIサーバー未起動のため）
        // TODO: API実装後に削除すること
        const USE_MOCK_DATA = true; // 本番前にfalseに変更
        
        if (USE_MOCK_DATA) {
            console.warn('⚠️ モックデータを使用しています（開発用）');
            
            // モックデータ: QR検品対象
            qrContext = {
                shippingInstructionId: shippingInstructionId,
                instructionCode: `SHIP${String(shippingInstructionId).padStart(3, '0')}`,
                expectedItems: [
                    {
                        component_id: 'COMP001',
                        component_name: '製品マニュアル',
                        qr_code_value: 'QR-MANUAL-001',
                        required_quantity: 1,
                        is_mandatory: true
                    },
                    {
                        component_id: 'COMP002',
                        component_name: '保証書',
                        qr_code_value: 'QR-WARRANTY-001',
                        required_quantity: 1,
                        is_mandatory: true
                    },
                    {
                        component_id: 'COMP003',
                        component_name: 'パーツリスト',
                        qr_code_value: 'QR-PARTS-001',
                        required_quantity: 1,
                        is_mandatory: false
                    },
                    {
                        component_id: 'COMP004',
                        component_name: 'クイックスタートガイド',
                        qr_code_value: 'QR-QUICK-001',
                        required_quantity: 1,
                        is_mandatory: true
                    }
                ]
            };
            
            console.log('📦 モックデータをロードしました:', qrContext);
            
            // UIの描画
            renderQRInspectionContent(qrContext);
            showToast('テストデータを読み込みました（モックモード）', 'info');
            return;
        }
        
        // 本番用: APIからデータ取得
        const response = await fetch(`${API_BASE_URL}/shipping-instructions/${shippingInstructionId}`);
        if (!response.ok) {
            throw new Error('出荷指示データの取得に失敗しました');
        }

        const detail = await response.json();
        
        // QRコンテキストの構築
        qrContext = {
            shippingInstructionId: detail.id,
            instructionCode: detail.instruction_id,
            expectedItems: detail.qr_items || []
        };

        // 検品UIの描画
        renderQRInspectionContent(qrContext);
        
    } catch (error) {
        console.error('QR inspection data load error:', error);
        showToast(`データの読み込みに失敗しました: ${error.message}`, 'danger');
        
        // エラー時の詳細表示
        const itemsList = document.getElementById('qr-items-list');
        if (itemsList) {
            itemsList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>データ読み込みエラー</strong>
                    <p class="mt-2 mb-0">${error.message}</p>
                    <hr>
                    <small>APIサーバーが起動していない可能性があります。</small>
                </div>
            `;
        }
    }
}

// QR検品UIの描画
function renderQRInspectionContent(context) {
    const content = document.getElementById('qr-inspection-content');
    const itemsList = document.getElementById('qr-items-list');

    // スキャナーUIの構築
    content.innerHTML = `
        <div class="qr-scanner-area" id="qr-scanner-container">
            <div id="qr-initial-message" class="text-center text-white">
                <i class="fas fa-qrcode fa-3x mb-3"></i>
                <h5>QRコードスキャン準備完了</h5>
                <p class="mb-0">「QRスキャン開始」ボタンを押してください</p>
            </div>
            <div id="qr-video-wrapper" class="qr-video-container" style="display: none;">
                <video id="qr-scanner-video" playsinline autoplay muted></video>
                <div class="qr-scan-overlay">
                    <div class="qr-scan-corner tl"></div>
                    <div class="qr-scan-corner tr"></div>
                    <div class="qr-scan-corner bl"></div>
                    <div class="qr-scan-corner br"></div>
                </div>
                <div id="qr-scan-line" class="qr-scan-line" style="display: none;"></div>
                <div id="qr-status-overlay" class="qr-status-overlay">スキャン準備中...</div>
            </div>
        </div>
    `;

    // グローバル参照の保存
    qrVideoElement = document.getElementById('qr-scanner-video');
    qrStatusBadge = document.getElementById('qr-status-overlay');
    qrResultContainer = document.getElementById('qr-result-container');
    qrProgressLabel = document.getElementById('qr-progress-label');

    // UI要素への参照を保存
    window.qrUIElements = {
        initialMessage: document.getElementById('qr-initial-message'),
        videoWrapper: document.getElementById('qr-video-wrapper'),
        statusOverlay: document.getElementById('qr-status-overlay'),
        scanLine: document.getElementById('qr-scan-line')
    };

    // 検品アイテムリストの描画
    if (!context.expectedItems || context.expectedItems.length === 0) {
        itemsList.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                この出荷指示にはQR検品対象の同梱物が登録されていません。
            </div>
        `;
        return;
    }

    itemsList.innerHTML = context.expectedItems.map(item => `
        <div class="card qr-item-card" id="qr-item-${item.component_id}">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <i class="fas fa-circle qr-pending qr-status-icon"></i>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${item.component_name}</h6>
                        <small class="text-muted">数量: ${item.required_quantity}</small>
                    </div>
                    <span class="badge bg-warning" id="qr-status-${item.component_id}">未スキャン</span>
                </div>
                <div class="mt-2 small text-muted">
                    QRコード: <code>${item.qr_code_value}</code>
                </div>
            </div>
        </div>
    `).join('');

    // 進捗の更新
    updateQRProgress(0, context.expectedItems.length);
}

// QRスキャナー開始
async function startQRScanner() {
    const inspectorInput = document.getElementById('qr-inspector-name');
    const inspectorName = inspectorInput?.value.trim();

    if (!inspectorName) {
        showToast('検品者名を入力してください。', 'warning');
        inspectorInput?.focus();
        return;
    }

    if (!qrContext) {
        showToast('QR検品情報が初期化されていません。', 'warning');
        return;
    }

    try {
        toggleQRControls({ scanning: true });

        // QR検品レコードの作成
        if (!qrInspectionRecord) {
            const response = await fetch(`${API_BASE_URL}/qr-inspections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_instruction_id: qrContext.shippingInstructionId,
                    inspector_name: inspectorName
                })
            });

            if (!response.ok) {
                const message = await extractErrorMessage(response);
                throw new Error(message);
            }

            qrInspectionRecord = await response.json();
        }

        // スキャナーの初期化
        if (!safariScanner) {
            safariScanner = new SafariOptimizedQRScanner({
                onResult: handleQRScanResult,
                onError: handleQRScannerError,
                onStatusUpdate: updateQRStatusMessage
            });
        }

        if (qrVideoElement) {
            // UIの切り替え
            if (window.qrUIElements) {
                if (window.qrUIElements.initialMessage) {
                    window.qrUIElements.initialMessage.style.display = 'none';
                }
                if (window.qrUIElements.videoWrapper) {
                    window.qrUIElements.videoWrapper.style.display = 'block';
                }
                if (window.qrUIElements.statusOverlay) {
                    window.qrUIElements.statusOverlay.textContent = 'カメラを起動しています...';
                }
            }

            await safariScanner.startScan(qrVideoElement);
            
            // スキャンライン表示
            if (window.qrUIElements && window.qrUIElements.scanLine) {
                window.qrUIElements.scanLine.style.display = 'block';
            }
            if (window.qrUIElements && window.qrUIElements.statusOverlay) {
                window.qrUIElements.statusOverlay.textContent = 'QRコードを枠内に収めてください';
            }
            
            updateQRStatusMessage('カメラを起動しました。QRコードを枠内に収めてください。');
            showStatusAlert('QRスキャンを開始しました', 'success');
        }
    } catch (error) {
        console.error('startQRScanner error:', error);
        
        // エラー時はビデオコンテナを非表示
        if (window.qrUIElements) {
            if (window.qrUIElements.videoWrapper) {
                window.qrUIElements.videoWrapper.style.display = 'none';
            }
            if (window.qrUIElements.initialMessage) {
                window.qrUIElements.initialMessage.style.display = 'block';
            }
        }
        
        showToast(`QRスキャナーの起動に失敗しました: ${error.message}`, 'danger');
        updateQRStatusMessage('スキャナー起動に失敗しました。');
        toggleQRControls({ scanning: false });
    }
}

// QRスキャン結果の処理
async function handleQRScanResult(qrCode) {
    console.log('QR Code scanned:', qrCode);
    
    try {
        // 最後にスキャンしたQRコードを表示
        displayLastScannedQR(qrCode);
        
        // QRコードの検証と処理
        await processQRScan(qrCode);
        
    } catch (error) {
        console.error('QR scan result handling error:', error);
        showToast(`QRコード処理エラー: ${error.message}`, 'danger');
    }
}

// QRコード処理
async function processQRScan(qrCode) {
    if (!qrContext || !qrContext.expectedItems) {
        showToast('検品データが正しく読み込まれていません。', 'warning');
        return;
    }

    // 期待されるQRコードか確認
    const matchedItem = qrContext.expectedItems.find(item => item.qr_code_value === qrCode);
    
    if (!matchedItem) {
        showToast('このQRコードは検品対象ではありません。', 'warning');
        showQRResult(`QRコード不一致: ${qrCode}`, 'warning');
        return;
    }

    // 既にスキャン済みか確認
    const itemCard = document.getElementById(`qr-item-${matchedItem.component_id}`);
    if (itemCard && itemCard.classList.contains('scanned')) {
        showToast(`${matchedItem.component_name} は既にスキャン済みです。`, 'info');
        return;
    }

    try {
        // APIにスキャン結果を送信
        const response = await fetch(`${API_BASE_URL}/qr-inspections/${qrInspectionRecord.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                component_id: matchedItem.component_id,
                qr_code_value: qrCode,
                scanned_quantity: matchedItem.required_quantity
            })
        });

        if (!response.ok) {
            const message = await extractErrorMessage(response);
            throw new Error(message);
        }

        // UIの更新
        updateQRItemState(matchedItem.component_id, 'スキャン完了');
        showQRResult(`✓ ${matchedItem.component_name}`, 'success');
        showToast(`${matchedItem.component_name} をスキャンしました`, 'success', 2000);

        // 進捗の更新
        const scannedCount = document.querySelectorAll('.qr-item-card.scanned').length;
        updateQRProgress(scannedCount, qrContext.expectedItems.length);

        // 全て完了したか確認
        if (scannedCount === qrContext.expectedItems.length) {
            showToast('全ての同梱物をスキャンしました！', 'success');
            showStatusAlert('検品完了！「検品完了」ボタンを押してください', 'success');
        }

    } catch (error) {
        console.error('QR scan process error:', error);
        showToast(`スキャン登録エラー: ${error.message}`, 'danger');
    }
}

// QRアイテムの状態更新
function updateQRItemState(componentId, statusText) {
    const itemCard = document.getElementById(`qr-item-${componentId}`);
    const statusBadge = document.getElementById(`qr-status-${componentId}`);
    const statusIcon = itemCard?.querySelector('.qr-status-icon');

    if (itemCard) {
        itemCard.classList.add('scanned');
    }
    if (statusBadge) {
        statusBadge.textContent = statusText;
        statusBadge.classList.remove('bg-warning');
        statusBadge.classList.add('bg-success');
    }
    if (statusIcon) {
        statusIcon.classList.remove('fa-circle', 'qr-pending');
        statusIcon.classList.add('fa-check-circle', 'qr-scanned');
    }
}

// 進捗更新
function updateQRProgress(scanned, total) {
    const progressBar = document.getElementById('qr-progress-bar');
    const progressBadge = document.getElementById('qr-progress-badge');
    const progressLabel = document.getElementById('qr-progress-label');

    const percentage = total > 0 ? Math.round((scanned / total) * 100) : 0;

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${percentage}%`;
        
        if (percentage === 100) {
            progressBar.classList.remove('progress-bar-animated');
            progressBar.classList.add('bg-success');
        }
    }

    if (progressBadge) {
        progressBadge.textContent = `${scanned} / ${total}`;
    }

    if (progressLabel) {
        if (percentage === 100) {
            progressLabel.textContent = '検品完了！';
        } else {
            progressLabel.textContent = `残り ${total - scanned} 件`;
        }
    }
}

// 最後にスキャンしたQRコードを表示
function displayLastScannedQR(qrCode) {
    const container = document.getElementById('qr-result-container');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show">
                <strong><i class="fas fa-qrcode me-2"></i>スキャン結果:</strong>
                <code class="ms-2">${qrCode}</code>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

// 結果表示
function showQRResult(message, type = 'info') {
    const container = document.getElementById('qr-result-container');
    if (container) {
        container.style.display = 'block';
        const alertClass = `alert-${type}`;
        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        setTimeout(() => {
            container.style.display = 'none';
        }, 5000);
    }
}

// ステータスメッセージ更新
function updateQRStatusMessage(message) {
    const statusElement = document.getElementById('qr-status-text');
    const statusContainer = document.getElementById('qr-status-message');
    
    if (statusElement) {
        statusElement.textContent = message;
    }
    if (statusContainer) {
        statusContainer.style.display = 'block';
    }
}

// ステータスアラート表示
function showStatusAlert(message, type = 'info') {
    const statusContainer = document.getElementById('qr-status-message');
    if (statusContainer) {
        statusContainer.className = `alert alert-${type}`;
        statusContainer.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
        statusContainer.style.display = 'block';
    }
}

// エラーハンドラー
function handleQRScannerError(message, error) {
    console.error('QR Scanner error:', message, error);
    showToast(message, 'danger');
    updateQRStatusMessage('エラーが発生しました');
}

// コントロールボタンの切り替え
function toggleQRControls({ scanning }) {
    const startButton = document.getElementById('btn-start-qr-scan');
    const manualButton = document.getElementById('btn-manual-input');
    const testButton = document.getElementById('btn-test-scan');

    if (startButton) {
        startButton.disabled = scanning;
    }
    if (manualButton) {
        manualButton.disabled = scanning;
    }
    if (testButton) {
        testButton.disabled = scanning;
    }
}

// 手動入力
async function manualInputQRCode() {
    const qrCode = prompt('QRコードの値を入力してください:');
    
    if (qrCode && qrCode.trim()) {
        try {
            await processQRScan(qrCode.trim());
            displayLastScannedQR(qrCode.trim());
        } catch (error) {
            console.error('Manual input error:', error);
            showToast(`手動入力エラー: ${error.message}`, 'danger');
        }
    }
}

// テストスキャン（シミュレーション）
async function simulateQRScan() {
    if (!qrContext || !qrContext.expectedItems || qrContext.expectedItems.length === 0) {
        showToast('検品対象がありません。', 'warning');
        return;
    }

    // 未スキャンのアイテムを探す
    const unscannedItem = qrContext.expectedItems.find(item => {
        const itemCard = document.getElementById(`qr-item-${item.component_id}`);
        return itemCard && !itemCard.classList.contains('scanned');
    });

    if (unscannedItem) {
        await processQRScan(unscannedItem.qr_code_value);
        displayLastScannedQR(unscannedItem.qr_code_value);
    } else {
        showToast('全てのアイテムがスキャン済みです。', 'info');
    }
}

// 検品完了
async function completeQRInspection() {
    if (!qrInspectionRecord) {
        showToast('QR検品が開始されていません。', 'warning');
        return;
    }

    if (!qrContext || !qrContext.expectedItems) {
        showToast('検品データが読み込まれていません。', 'warning');
        return;
    }

    const scannedCount = document.querySelectorAll('.qr-item-card.scanned').length;
    const totalCount = qrContext.expectedItems.length;

    if (scannedCount < totalCount) {
        const confirmed = confirm(`まだ${totalCount - scannedCount}件がスキャンされていません。\n検品を完了しますか？`);
        if (!confirmed) {
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/qr-inspections/${qrInspectionRecord.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scanned_count: scannedCount,
                total_count: totalCount
            })
        });

        if (!response.ok) {
            const message = await extractErrorMessage(response);
            throw new Error(message);
        }

        showToast('QR検品が完了しました！', 'success');
        
        // 親ウィンドウに通知（オプション）
        if (window.opener) {
            window.opener.postMessage({ type: 'qr-inspection-complete', data: { scannedCount, totalCount } }, '*');
        }

        // 3秒後にウィンドウを閉じる
        setTimeout(() => {
            window.close();
        }, 3000);

    } catch (error) {
        console.error('Complete QR inspection error:', error);
        showToast(`検品完了エラー: ${error.message}`, 'danger');
    }
}

// エラーメッセージ抽出
async function extractErrorMessage(response) {
    try {
        const data = await response.json();
        return data.message || data.error || 'エラーが発生しました';
    } catch {
        return `HTTPエラー: ${response.status} ${response.statusText}`;
    }
}

// トースト表示
function showToast(message, type = 'info', duration = 4000) {
    // 既存のトーストを削除
    const existingToasts = document.querySelectorAll('.toast-container .toast');
    existingToasts.forEach(toast => toast.remove());

    // トーストコンテナの作成
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toastId = `toast-${Date.now()}`;
    const iconMap = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    const icon = iconMap[type] || 'info-circle';

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${icon} me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}
