#!/bin/bash

# qr-inspection.html v2.1 完全統合スクリプト
# カメラ切り替えと拡張デバッグモードを追加

SOURCE="/home/tsutsumi/grafana-setup/web/qr-inspection.html"
TEMP="/tmp/qr-inspection-temp.html"

echo "🚀 qr-inspection.html v2.1 完全統合を開始..."

# 1. カメラ切り替えボタンの追加（行258の後に挿入）
echo "📝 ステップ1: カメラ切り替えボタンを追加..."
sed -i '258 a\                                <button type="button" class="btn btn-outline-secondary" id="btn-switch-camera">\n                                    <i class="fas fa-sync-alt me-1"></i>カメラ切替\n                                </button>' "$SOURCE"

# 2. デバッグボタンの追加（btn-test-scanの後に挿入）
echo "📝 ステップ2: デバッグボタンを追加..."
sed -i '261 a\                                <button type="button" class="btn btn-outline-secondary" id="btn-toggle-debug">\n                                    <i class="fas fa-bug me-1"></i>Debug\n                                </button>' "$SOURCE"

# 3. デバッグパネルCSSの追加（</style>の前に挿入）
echo "📝 ステップ3: デバッグパネルCSSを追加..."
LINE_NUM=$(grep -n "</style>" "$SOURCE" | head -1 | cut -d: -f1)
sed -i "${LINE_NUM}i\\
        /* Phase 2: 拡張デバッグモード */\\
        .debug-info-panel {\\
            position: fixed;\\
            top: 80px;\\
            right: 10px;\\
            background: rgba(0, 0, 0, 0.9);\\
            color: #00ff00;\\
            padding: 12px;\\
            border-radius: 8px;\\
            font-size: 11px;\\
            font-family: 'Courier New', monospace;\\
            max-width: 300px;\\
            z-index: 9999;\\
            line-height: 1.5;\\
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);\\
        }\\
        .debug-info-panel .debug-title {\\
            color: #ffff00;\\
            font-weight: bold;\\
            border-bottom: 1px solid #444;\\
            padding-bottom: 6px;\\
            margin-bottom: 8px;\\
        }\\
        .debug-info-panel .debug-row {\\
            margin-bottom: 6px;\\
        }\\
        .debug-info-panel .debug-label {\\
            color: #00ccff;\\
            display: inline-block;\\
            min-width: 100px;\\
        }\\
        .debug-info-panel .debug-value {\\
            color: #00ff00;\\
        }" "$SOURCE"

echo "✅ 完了: qr-inspection.html v2.1 HTML/CSS追加完了"
echo ""
echo "⚠️  次のステップ:"
echo "   JavaScriptコードを手動で追加する必要があります："
echo "   1. コンストラクタにプロパティ追加"
echo "   2. initElements()に要素追加"
echo "   3. initEventListeners()にイベント追加"
echo "   4. switchCamera()メソッド追加"
echo "   5. toggleDebug()メソッド追加"
echo "   6. startDebugUpdateLoop()メソッド追加"
echo "   7. updateDebug()メソッド追加"
echo "   8. createCameraUI()にデバッグパネル追加"
echo ""
echo "📄 詳細は QR_INSPECTION_V21_UPGRADE_GUIDE.md を参照"
