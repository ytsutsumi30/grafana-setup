#!/bin/bash

# iPhone Safari QRスキャン動作確認スクリプト

echo "=========================================="
echo "iPhone Safari QRスキャン動作確認"
echo "=========================================="
echo ""

# 1. コンテナ稼働確認
echo "📦 1. コンテナ稼働状況チェック..."
CONTAINERS=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
if [ "$CONTAINERS" -ge 3 ]; then
    echo "✅ すべてのコンテナが稼働中"
else
    echo "❌ 一部のコンテナが停止しています"
    docker-compose ps
    exit 1
fi
echo ""

# 2. APIヘルスチェック
echo "🏥 2. APIサーバーのヘルスチェック..."
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$HEALTH" | grep -q "OK"; then
    echo "✅ APIサーバーが正常に応答"
else
    echo "❌ APIサーバーが応答していません"
    exit 1
fi
echo ""

# 3. QR検品用エンドポイント確認
echo "🔍 3. QR検品エンドポイントの確認..."

# 製品同梱物取得テスト
echo "   - 製品同梱物データ取得テスト (出荷指示ID: 1)..."
COMPONENTS=$(curl -s http://localhost:3001/shipping-instructions/1/components 2>/dev/null)
if echo "$COMPONENTS" | grep -q "qr_code"; then
    COUNT=$(echo "$COMPONENTS" | grep -o "qr_code" | wc -l)
    echo "✅ 同梱物データ取得成功 (${COUNT}件の同梱物)"
    echo "$COMPONENTS" | jq -r '.[] | "      - \(.component_name): \(.qr_code)"' 2>/dev/null || echo "$COMPONENTS" | head -3
else
    echo "❌ 同梱物データの取得に失敗"
    echo "$COMPONENTS"
fi
echo ""

# 4. データベース接続確認
echo "🗄️  4. データベース接続確認..."
DB_TIME=$(curl -s http://localhost:3001/db-test 2>/dev/null)
if echo "$DB_TIME" | grep -q "Database connected"; then
    echo "✅ データベース接続正常"
else
    echo "❌ データベース接続エラー"
fi
echo ""

# 5. Web画面アクセス確認
echo "🌐 5. Web画面のアクセス確認..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$WEB_STATUS" = "200" ]; then
    echo "✅ Web画面が正常に表示されます"
else
    echo "⚠️  Web画面のステータスコード: $WEB_STATUS"
fi
echo ""

# 6. QRスキャンに必要なJSファイル確認
echo "📄 6. QRスキャン関連ファイルの確認..."
if [ -f "web/js/qr-scanner.js" ]; then
    echo "✅ qr-scanner.js が存在"
else
    echo "❌ qr-scanner.js が見つかりません"
fi

if [ -f "web/js/index-app.js" ]; then
    echo "✅ index-app.js が存在"
else
    echo "❌ index-app.js が見つかりません"
fi
echo ""

# 7. テストデータ確認
echo "📊 7. テストデータの確認..."
echo "   - 出荷指示データ..."
SHIPMENTS=$(curl -s http://localhost:3001/shipping-instructions?status=pending 2>/dev/null | grep -o '"instruction_id"' | wc -l)
echo "✅ 検品待ち出荷指示: ${SHIPMENTS}件"

echo "   - 製品同梱物マスタ..."
PROD1_COMPONENTS=$(curl -s http://localhost:3001/products/1/components 2>/dev/null | grep -o '"qr_code"' | wc -l)
echo "✅ 製品A (PROD001) の同梱物: ${PROD1_COMPONENTS}件"
echo ""

# 8. iPhone Safari対応チェック
echo "📱 8. iPhone Safari対応機能チェック..."
if grep -q "playsinline" web/index.html; then
    echo "✅ playsinline属性が設定済み"
else
    echo "❌ playsinline属性が見つかりません"
fi

if grep -q "SafariOptimizedQRScanner" web/js/qr-scanner.js; then
    echo "✅ Safari最適化スキャナーが実装済み"
else
    echo "❌ Safari最適化スキャナーが見つかりません"
fi

if grep -q "calculateScanRegion" web/js/qr-scanner.js; then
    echo "✅ スキャン領域最適化が実装済み"
else
    echo "❌ スキャン領域最適化が見つかりません"
fi
echo ""

# 結果サマリー
echo "=========================================="
echo "✅ 動作確認完了"
echo "=========================================="
echo ""
echo "📱 iPhoneでのアクセス方法:"
echo "   1. iPhoneのSafariで以下のURLにアクセス:"
echo "      http://$(hostname -I | awk '{print $1}')"
echo "      または"
echo "      http://localhost （Mac上で確認する場合）"
echo ""
echo "   2. 出荷指示カードの「QR検品」ボタンをタップ"
echo "   3. 検品者名を入力"
echo "   4. 「QRスキャン開始」ボタンをタップ"
echo "   5. カメラ許可を承認"
echo "   6. QRコードをスキャン"
echo ""
echo "🔧 トラブルシューティング:"
echo "   - カメラが起動しない → iPhone設定 → Safari → カメラ → 許可"
echo "   - QRが認識されない → 照明を明るくして10〜30cm離れた位置から"
echo "   - テストモード → 「テストスキャン」ボタンでシミュレーション可能"
echo ""
echo "📖 詳細はドキュメントを参照:"
echo "   web/QR_SCAN_IPHONE_GUIDE.md"
echo ""
