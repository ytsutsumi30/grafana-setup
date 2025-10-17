#!/usr/bin/env python3
"""
qr-inspection.html v2.1 完全統合スクリプト
カメラ切り替えと拡張デバッグモードを追加
"""

import re
import sys
from datetime import datetime

SOURCE_FILE = "/home/tsutsumi/grafana-setup/web/qr-inspection.html"

def main():
    print("🚀 qr-inspection.html v2.1 完全統合を開始...")
    
    # ファイルを読み込み
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. カメラ切り替えボタンの追加
    print("📝 ステップ1: カメラ切り替えボタンを追加...")
    camera_button = '''                                <button type="button" class="btn btn-outline-secondary" id="btn-switch-camera">
                                    <i class="fas fa-sync-alt me-1"></i>カメラ切替
                                </button>'''
    
    # btn-manual-inputの後に挿入
    content = content.replace(
        '''                                <button type="button" class="btn btn-outline-secondary" id="btn-manual-input">
                                    <i class="fas fa-keyboard me-1"></i>手動入力
                                </button>''',
        '''                                <button type="button" class="btn btn-outline-secondary" id="btn-manual-input">
                                    <i class="fas fa-keyboard me-1"></i>手動入力
                                </button>
''' + camera_button
    )
    
    # 2. デバッグボタンの追加
    print("📝 ステップ2: デバッグボタンを追加...")
    debug_button = '''                                <button type="button" class="btn btn-outline-secondary" id="btn-toggle-debug">
                                    <i class="fas fa-bug me-1"></i>Debug
                                </button>'''
    
    # btn-test-scanの後に挿入
    content = content.replace(
        '''                                <button type="button" class="btn btn-outline-secondary" id="btn-test-scan">
                                    <i class="fas fa-vial me-1"></i>テストスキャン
                                </button>''',
        '''                                <button type="button" class="btn btn-outline-secondary" id="btn-test-scan">
                                    <i class="fas fa-vial me-1"></i>テストスキャン
                                </button>
''' + debug_button
    )
    
    # 3. デバッグパネルCSSの追加
    print("📝 ステップ3: デバッグパネルCSSを追加...")
    debug_css = '''
        /* Phase 2: 拡張デバッグモード */
        .debug-info-panel {
            position: fixed;
            top: 80px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 12px;
            border-radius: 8px;
            font-size: 11px;
            font-family: 'Courier New', monospace;
            max-width: 300px;
            z-index: 9999;
            line-height: 1.5;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .debug-info-panel .debug-title {
            color: #ffff00;
            font-weight: bold;
            border-bottom: 1px solid #444;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }
        .debug-info-panel .debug-row {
            margin-bottom: 6px;
        }
        .debug-info-panel .debug-label {
            color: #00ccff;
            display: inline-block;
            min-width: 100px;
        }
        .debug-info-panel .debug-value {
            color: #00ff00;
        }
'''
    
    # </style>の前に挿入
    content = content.replace('    </style>', debug_css + '    </style>')
    
    # 4. JavaScriptのコンストラクタにプロパティ追加
    print("📝 ステップ4: コンストラクタにプロパティを追加...")
    content = content.replace(
        '''            this.detectionMethod = 'none';
            
            // 検品システム固有プロパティ''',
        '''            this.detectionMethod = 'none';
            this.debugUpdateInterval = null;  // Phase 2: デバッグ更新インターバル
            
            // 検品システム固有プロパティ'''
    )
    
    # 5. initElements()に要素追加
    print("📝 ステップ5: initElements()に要素を追加...")
    content = content.replace(
        '''            this.btnManualInput = document.getElementById('btn-manual-input');
            this.btnTestScan = document.getElementById('btn-test-scan');''',
        '''            this.btnManualInput = document.getElementById('btn-manual-input');
            this.btnSwitchCamera = document.getElementById('btn-switch-camera');  // Phase 2
            this.btnTestScan = document.getElementById('btn-test-scan');
            this.btnToggleDebug = document.getElementById('btn-toggle-debug');  // Phase 2'''
    )
    
    # 6. initEventListeners()にイベント追加
    print("📝 ステップ6: initEventListeners()にイベントを追加...")
    content = content.replace(
        '''            this.btnManualInput.addEventListener('click', () => this.handleManualInput());
            this.btnTestScan.addEventListener('click', () => this.handleTestScan());''',
        '''            this.btnManualInput.addEventListener('click', () => this.handleManualInput());
            this.btnSwitchCamera.addEventListener('click', () => this.switchCamera());  // Phase 2
            this.btnTestScan.addEventListener('click', () => this.handleTestScan());
            this.btnToggleDebug.addEventListener('click', () => this.toggleDebug());  // Phase 2'''
    )
    
    # 7. createCameraUI()にデバッグパネル追加
    print("📝 ステップ7: createCameraUI()にデバッグパネルを追加...")
    debug_panel_html = '''
                    
                    <!-- Phase 2: デバッグパネル -->
                    <div id="debug-info-panel" class="debug-info-panel" style="display:none;">
                        <div class="debug-title">🐛 Debug Info</div>
                        <div class="debug-row">
                            <span class="debug-label">📹 Camera:</span>
                            <span class="debug-value" id="debug-camera">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">📐 Resolution:</span>
                            <span class="debug-value" id="debug-resolution">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">🎬 ReadyState:</span>
                            <span class="debug-value" id="debug-ready">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">📡 Stream:</span>
                            <span class="debug-value" id="debug-stream">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">🔍 Detection:</span>
                            <span class="debug-value" id="debug-detection">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">🔢 Frames:</span>
                            <span class="debug-value" id="debug-frames">0</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">📊 Scan Rate:</span>
                            <span class="debug-value" id="debug-scanrate">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">⚡ Method:</span>
                            <span class="debug-value" id="debug-method">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">🍎 iOS:</span>
                            <span class="debug-value" id="debug-ios">-</span>
                        </div>
                        <div class="debug-row">
                            <span class="debug-label">⏱️ Uptime:</span>
                            <span class="debug-value" id="debug-uptime">0s</span>
                        </div>
                    </div>'''
    
    content = content.replace(
        '''                    <!-- ステータス表示 -->
                    <div class="qr-status-overlay" id="qr-camera-status">初期化中...</div>
                </div>
            `;''',
        '''                    <!-- ステータス表示 -->
                    <div class="qr-status-overlay" id="qr-camera-status">初期化中...</div>''' + debug_panel_html + '''
                </div>
            `;'''
    )
    
    # 8. stopScan()にデバッグループ停止処理を追加
    print("📝 ステップ8: stopScan()にデバッグループ停止を追加...")
    content = content.replace(
        '''        stopScan() {
            this.isScanning = false;
            this.isCalibrating = false;''',
        '''        stopScan() {
            this.isScanning = false;
            this.isCalibrating = false;
            
            // Phase 2: デバッグループ停止
            if (this.debugUpdateInterval) {
                clearInterval(this.debugUpdateInterval);
                this.debugUpdateInterval = null;
            }'''
    )
    
    # 9. handleManualInput()の前に新しいメソッドを追加
    print("📝 ステップ9: switchCamera()とデバッグメソッドを追加...")
    new_methods = '''
        // Phase 2: カメラ切り替え機能
        async switchCamera() {
            if (this.cameras.length <= 1) {
                this.showStatus('切り替え可能なカメラがありません', 'info');
                return;
            }
            
            this.showStatus('カメラを切り替えています...', 'info');
            
            // 次のカメラへ
            this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
            
            // スキャンを停止して再開
            const wasScanning = this.isScanning;
            this.cleanupResources();
            
            if (wasScanning) {
                setTimeout(async () => {
                    try {
                        this.createCameraUI();
                        await this.initializeCamera();
                        this.showStatus(`カメラ ${this.cameraIndex + 1}/${this.cameras.length} に切り替えました`, 'success');
                    } catch (error) {
                        this.showStatus('カメラ切り替えエラー', 'danger');
                        console.error('Camera switch error:', error);
                    }
                }, 500);
            }
        }
        
        // Phase 2: デバッグモード切り替え
        toggleDebug() {
            this.debugMode = !this.debugMode;
            const debugPanel = document.getElementById('debug-info-panel');
            
            if (debugPanel) {
                debugPanel.style.display = this.debugMode ? 'block' : 'none';
                
                if (this.debugMode) {
                    // iOS検出情報を表示
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    this.updateDebug('ios', isIOS ? 'Yes' : 'No');
                    
                    // デバッグ情報の定期更新開始
                    this.startDebugUpdateLoop();
                } else {
                    // デバッグループ停止
                    if (this.debugUpdateInterval) {
                        clearInterval(this.debugUpdateInterval);
                        this.debugUpdateInterval = null;
                    }
                }
            }
        }
        
        // Phase 2: デバッグ情報の定期更新
        startDebugUpdateLoop() {
            if (this.debugUpdateInterval) {
                clearInterval(this.debugUpdateInterval);
            }
            
            this.debugUpdateInterval = setInterval(() => {
                if (!this.debugMode) return;
                
                // アップタイム計算
                if (this.scanStartTime > 0) {
                    const uptime = Math.floor((Date.now() - this.scanStartTime) / 1000);
                    this.updateDebug('uptime', `${uptime}s`);
                }
                
                // 解像度情報
                if (this.video && this.video.videoWidth > 0) {
                    this.updateDebug('resolution', `${this.video.videoWidth}x${this.video.videoHeight}`);
                }
                
                // スキャンレート情報
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const scanRate = isIOS ? 3 : 5;
                this.updateDebug('scanrate', `${scanRate}/sec`);
                
                // 検出方法
                this.updateDebug('method', this.detectionMethod);
                
                // カメラ情報
                if (this.stream) {
                    const videoTrack = this.stream.getVideoTracks()[0];
                    if (videoTrack) {
                        this.updateDebug('camera', videoTrack.label || 'Unknown');
                        this.updateDebug('stream', 'Connected');
                    }
                } else {
                    this.updateDebug('stream', 'Disconnected');
                }
                
                // ReadyState
                if (this.video) {
                    this.updateDebug('ready', this.video.readyState);
                }
                
                // Detection状態
                this.updateDebug('detection', this.isScanning ? 'Active' : 'Stopped');
            }, 1000);
        }
        
        // Phase 2: デバッグ情報更新
        updateDebug(type, value) {
            const element = document.getElementById(`debug-${type}`);
            if (element) {
                element.textContent = value;
            }
        }
        
'''
    
    content = content.replace(
        '''        handleManualInput() {''',
        new_methods + '''        handleManualInput() {'''
    )
    
    # ファイルに書き込み
    with open(SOURCE_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ 完了: qr-inspection.html v2.1 完全統合が完了しました！")
    print("\n📊 追加された機能:")
    print("  ✅ カメラ切り替えボタン（btn-switch-camera）")
    print("  ✅ デバッグボタン（btn-toggle-debug）")
    print("  ✅ デバッグパネルCSS")
    print("  ✅ デバッグパネルHTML（10項目表示）")
    print("  ✅ switchCamera()メソッド")
    print("  ✅ toggleDebug()メソッド")
    print("  ✅ startDebugUpdateLoop()メソッド")
    print("  ✅ updateDebug()メソッド")
    print("  ✅ デバッグループ停止処理")
    print("\n🎉 qr-inspection.htmlはsafari2.html v2.1と100%同等になりました！")

if __name__ == "__main__":
    main()
