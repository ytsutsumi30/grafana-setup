# プロジェクト生成用プロンプトテンプレート集

このドキュメントは、現在の生産管理システムプロジェクトを再生成するために必要なプロンプトテンプレートをまとめたものです。

---

## 📋 目次

1. [基盤インフラ構築プロンプト](#1-基盤インフラ構築プロンプト)
2. [データベース設計プロンプト](#2-データベース設計プロンプト)
3. [バックエンドAPI開発プロンプト](#3-バックエンドapi開発プロンプト)
4. [フロントエンド開発プロンプト](#4-フロントエンド開発プロンプト)
5. [AWS Textract統合プロンプト](#5-aws-textract統合プロンプト)
6. [QR検品システム開発プロンプト](#6-qr検品システム開発プロンプト)
7. [デプロイ・運用プロンプト](#7-デプロイ運用プロンプト)
8. [監視・分析システムプロンプト](#8-監視分析システムプロンプト)

---

## 1. 基盤インフラ構築プロンプト

### プロンプト: Docker環境構築

```
Docker ComposeとWSL2環境で動作する生産管理システムの基盤を構築してください。

【要件】
- Docker Composeで以下のコンテナを構成:
  * nginx (alpine): リバースプロキシ、静的ファイル配信、ポート80/443
  * Node.js 18 (alpine): Express APIサーバー、ポート3000
  * PostgreSQL 15 (alpine): データベース、ポート5432
  * Grafana (latest): 監視ダッシュボード (profile: monitoring)
  * Prometheus (latest): メトリクス収集 (profile: monitoring)

- Docker Network: production-network (bridge driver)

- Volumes:
  * postgres-data: PostgreSQLデータ永続化
  * grafana-storage: Grafana設定永続化
  * prometheus-storage: Prometheusデータ永続化

- ホストマウント:
  * ./web -> nginx:/usr/share/nginx/html
  * ./api -> production-api:/app
  * ./nginx/conf.d -> nginx:/etc/nginx/conf.d
  * ./postgres/init -> postgres:/docker-entrypoint-initdb.d

- ログローテーション設定:
  * nginx: max-size=10m, max-file=3
  * production-api: max-size=10m, max-file=5
  * postgres: max-size=10m, max-file=3

- 環境変数:
  * NODE_ENV=production
  * PostgreSQL認証情報 (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
  * api/.envファイルをenv_fileとして読み込み (AWS認証情報用)

【出力ファイル】
1. docker-compose.yml
2. nginx/conf.d/default.conf (API: /api/ -> http://production-api:3000/api/)
3. .env.example (環境変数テンプレート)
4. .gitignore (api/.env, *.log等)

【制約】
- 本番環境での使用を前提としたセキュリティ設定
- コンテナの自動再起動 (restart: unless-stopped)
- PostgreSQL文字コード: UTF-8
```

---

## 2. データベース設計プロンプト

### プロンプト: PostgreSQL初期化スクリプト

```
生産管理システム向けのPostgreSQL 15データベーススキーマを設計してください。

【要件】
以下のテーブルを作成:

1. **products** (製品マスタ)
   - id (SERIAL PRIMARY KEY)
   - product_code (VARCHAR(50) UNIQUE NOT NULL)
   - product_name (VARCHAR(255) NOT NULL)
   - description (TEXT)
   - unit_price (DECIMAL(10,2))
   - category (VARCHAR(100))
   - created_at, updated_at (TIMESTAMP)

2. **product_components** (製品同梱物マスタ)
   - id (SERIAL PRIMARY KEY)
   - product_id (FK to products)
   - component_type (VARCHAR(50): main, accessory, manual, warranty)
   - component_name (VARCHAR(255))
   - qr_code (VARCHAR(255) UNIQUE)
   - is_required (BOOLEAN DEFAULT true)
   - created_at, updated_at (TIMESTAMP)

3. **shipping_locations** (出荷場所マスタ)
   - id (SERIAL PRIMARY KEY)
   - location_code (VARCHAR(20) UNIQUE)
   - location_name (VARCHAR(255))
   - address, phone, contact_person (VARCHAR)
   - created_at (TIMESTAMP)

4. **delivery_locations** (納入場所マスタ)
   - 同上 + delivery_method (VARCHAR(50): 宅配便、チャーター便、直送)

5. **shipping_instructions** (出荷指示)
   - id (SERIAL PRIMARY KEY)
   - instruction_id (VARCHAR(50) UNIQUE)
   - product_id, quantity (INTEGER)
   - shipping_date (DATE)
   - shipping_location_id, delivery_location_id (FK)
   - customer_name, priority (high/normal/low), status (pending/processing/shipped/delivered)
   - tracking_number, notes (TEXT)
   - created_at, updated_at (TIMESTAMP)

6. **qr_inspections** (QR検品記録)
   - id (SERIAL PRIMARY KEY)
   - shipping_instruction_id (FK)
   - inspector_name, product_id
   - total_components, scanned_components (INTEGER)
   - passed_quantity, current_stock_before, current_stock_after (INTEGER)
   - status (in_progress/completed/failed)
   - notes, completed_at, created_at, updated_at (TIMESTAMP)

7. **qr_inspection_details** (QR検品詳細)
   - id (SERIAL PRIMARY KEY)
   - qr_inspection_id (FK)
   - product_component_id (FK)
   - qr_code, status (scanned/error/duplicate)
   - scanned_at (TIMESTAMP)
   - error_message (TEXT)

8. **inventory** (在庫管理)
   - id (SERIAL PRIMARY KEY)
   - product_id (FK)
   - current_stock, reserved_stock (INTEGER)
   - available_stock (GENERATED ALWAYS AS (current_stock - reserved_stock))
   - location, last_updated (TIMESTAMP)

9. **shipping_inspections** (従来型検品)
   - id (SERIAL PRIMARY KEY)
   - shipping_instruction_id (FK)
   - inspector_name, inspection_date (TIMESTAMP)
   - inspected_quantity, passed_quantity, failed_quantity (INTEGER)
   - defect_details, packaging_condition (VARCHAR)
   - label_check, documentation_check, final_approval (BOOLEAN)
   - notes (TEXT)

10. **production_plans** (生産計画)
11. **production_records** (生産実績)
12. **inspections** (検品記録)

【追加要件】
- 適切なINDEX作成 (status, date, code等)
- ON DELETE CASCADE設定
- サンプルデータ挿入 (製品5件、出荷指示6件、在庫データ等)
- VIEW作成: shipping_instruction_summary (JOINした統合ビュー)
- GRANT ALL PRIVILEGES TO production_user

【出力ファイル】
1. postgres/init/01-init.sql (基本テーブル)
2. postgres/init/02-qr-inspection-tables.sql (QR検品関連)

【制約】
- PostgreSQL 15互換
- UTF-8エンコーディング
- タイムスタンプはDEFAULT CURRENT_TIMESTAMP
```

---

## 3. バックエンドAPI開発プロンプト

### プロンプト: Node.js Express APIサーバー

```
生産管理システムのRESTful APIサーバーをNode.js + Expressで実装してください。

【技術スタック】
- Node.js 18+
- Express 4
- pg (PostgreSQL client)
- cors, helmet (セキュリティ)
- express-rate-limit (レート制限)
- winston (ロギング)
- joi (バリデーション)
- dotenv (環境変数管理)

【実装すべきエンドポイント】

**製品関連**
- GET /products - 製品一覧（在庫情報含む）
- GET /products/:id - 製品詳細
- GET /products/:productId/components - 製品同梱物一覧

**出荷指示関連**
- GET /api/shipping-instructions - 出荷指示一覧（フィルタ: status, priority, location, date範囲）
- GET /api/shipping-instructions/:id - 出荷指示詳細
- GET /api/shipping-instructions/:id/components - 出荷指示の同梱物
- GET /api/shipping-instructions/summary/by-delivery-location - 納入場所別サマリー
- GET /api/shipping-instructions/detail/:deliveryLocationCode - 納入場所詳細
- PATCH /api/shipping-instructions/:id/picking - ピッキング情報更新

**QR検品関連**
- POST /api/qr-inspections - 検品開始
- POST /api/qr-inspections/:id/scan - QRコードスキャン
- PATCH /api/qr-inspections/:id/complete - 検品完了
- GET /api/qr-inspections/:id - 検品詳細

**従来型検品関連**
- GET /api/shipping-inspections?shipping_instruction_id={id}
- POST /api/shipping-inspections - 検品記録作成

**レポート関連**
- GET /api/reports/dashboard-stats - ダッシュボード統計
- GET /api/reports/shipping-summary - 出荷サマリー

**ヘルスチェック**
- GET /health - システム状態
- GET /db-test - DB接続テスト

【ミドルウェア要件】
- helmet: セキュリティヘッダー
- cors: CORS設定
- express-rate-limit: 15分100リクエスト、trustProxy対応
- winston: JSON形式ログ、error.log + combined.log
- リクエストログ: IP、User-Agent記録

【エラーハンドリング】
- 404: { error: 'Route not found' }
- 500: { error: 'Internal server error' }
- バリデーションエラー: Joi使用、400レスポンス

【データベース接続】
- pg Pool使用
- 環境変数から接続情報取得
- SSL設定: process.env.DB_SSL === 'true'で制御

【グレースフルシャットダウン】
- SIGTERM/SIGINT処理
- pool.end()でコネクション解放

【出力ファイル】
1. api/server.js (メインサーバーファイル)
2. api/package.json (依存関係定義)
3. api/.env.example (環境変数テンプレート)

【制約】
- PORT: process.env.PORT || 3001
- trust proxy: 1 (nginxリバースプロキシ対応)
- JSON limit: 10mb
```

---

## 4. フロントエンド開発プロンプト

### プロンプト: 出荷管理Webアプリケーション

```
生産管理システムのフロントエンド（HTML/CSS/JavaScript）を実装してください。

【技術スタック】
- HTML5 (セマンティックHTML)
- CSS3 + Bootstrap 5
- Vanilla JavaScript (ES6+)
- Fetch API (非同期通信)

【画面構成】

**1. メイン画面 (index.html)**
- ダッシュボード: KPI表示（出荷指示ステータス別件数、検品合格率、在庫状況）
- 出荷指示一覧テーブル: フィルタ機能（ステータス、優先度、日付範囲）
- モーダル: 出荷指示詳細表示
- ナビゲーション: 出荷管理、在庫管理、レポート

**2. QR検品画面 (qr-inspection.html)**
- 出荷指示選択
- 同梱物チェックリスト表示
- QRスキャナー統合 (html5-qrcode library)
- スキャン進捗表示（X / Y 完了）
- リアルタイムフィードバック（✓ / ❌）
- 音声フィードバック（オプション）
- 検品完了ボタン

**3. AI-OCR画面 (ocr.html)**
- 画像アップロード (File input)
- 画像プレビュー表示
- OCRエンジン選択（AWS Textract推奨）
- OCR実行ボタン
- 結果表示エリア（抽出テキスト、信頼度、テーブル/フォームデータ）
- 進捗表示（30% → 60% → 90% → 100%）

**共通機能**
- レスポンシブデザイン（モバイル対応）
- ローディング表示
- エラーハンドリング（ユーザーフレンドリーなメッセージ）
- キャッシュ無効化ヘッダー（iOS Safari対応）

【JavaScript機能】

**app.js (メインロジック)**
- API_BASE_URL: '/api'
- utils.formatDate(), utils.getStatusBadge(), utils.getPriorityBadge()
- fetchShippingInstructions(), fetchDashboardStats()
- イベントリスナー: DOMContentLoaded, フィルタ変更, モーダル表示

**qr-scanner.js (QRスキャン)**
- html5-qrcode統合
- Html5Qrcode初期化
- onScanSuccess(), onScanFailure()
- スキャン結果送信: POST /api/qr-inspections/:id/scan

**device-mode.js (デバイス対応)**
- モバイル/タブレット/デスクトップ判定
- タッチイベント対応
- カメラ権限ガイド（iOS Safari対応）

【CSS要件】
- Bootstrap 5クラス優先使用
- カスタムCSS: styles.css, mobile.css
- ステータスバッジ: 色分け（pending: 黄, processing: 青, shipped: 緑, delivered: グレー）
- 優先度バッジ: high: 赤, normal: 青, low: グレー

【出力ファイル】
1. web/index.html
2. web/qr-inspection.html
3. web/ocr.html
4. web/app.js
5. web/js/qr-scanner.js
6. web/js/device-mode.js
7. web/styles.css
8. web/css/mobile.css
9. web/manifest.json (PWA対応)

【制約】
- IE非対応（モダンブラウザのみ）
- カメラアクセス: HTTPS必須
- html5-qrcode: CDN経由読み込み
```

---

## 5. AWS Textract統合プロンプト

### プロンプト: AWS Textract OCRサービス統合

```
AWS TextractをNode.js APIに統合し、AI-OCR機能を実装してください。

【AWS SDK設定】
- パッケージ: @aws-sdk/client-textract ^3.917.0
- 認証: 環境変数 (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- リージョン: ap-northeast-1

【実装すべき機能】

**1. Textractサービスモジュール (api/services/textract.js)**

クラス: TextractService

メソッド:
- detectText(imageBuffer): 基本OCR
  * TextractClient.send(DetectDocumentTextCommand)
  * WORD/LINEブロック抽出
  * 平均信頼度計算
  * 戻り値: { text, lines, words, confidence }

- analyzeDocument(imageBuffer, featureTypes): 表・フォーム認識
  * featureTypes: ['TABLES', 'FORMS']
  * AnalyzeDocumentCommand使用
  * 戻り値: { blocks, tables, forms }

- extractTables(blocks): 表データ抽出
  * TABLEブロックから2次元配列生成
  * CELL情報をマージ
  * 戻り値: [ { title, rows: [[cell1, cell2, ...], ...], confidence } ]

- extractForms(blocks): Key-Valueペア抽出
  * KEY_VALUE_SETブロック処理
  * Key-Valueマッピング
  * 戻り値: [ { key, value, confidence } ]

- base64ToBuffer(base64String): Base64→Buffer変換
  * data:image/jpeg;base64,プレフィックス除去

- handleError(error): AWSエラーハンドリング
  * InvalidParameterException → 400
  * ThrottlingException → 429
  * AccessDeniedException → 403
  * 等9種類のエラーマッピング

**2. OCR APIルート (api/routes/ocr.js)**

エンドポイント:
- POST /api/ocr/textract
  * Body: { image: base64, documentType: "invoice|receipt|form|default" }
  * 画像サイズ制限: 10MB
  * 処理時間計測
  * 信頼度80%未満で警告
  * Response: { success, text, lines, confidence, processingTime }

- POST /api/ocr/textract/analyze
  * Body: { image: base64, features: ["TABLES", "FORMS"] }
  * featuresバリデーション
  * Response: { success, tables, forms, processingTime }

- GET /api/ocr/health
  * Textractサービス状態確認
  * Response: { success, service, textractAvailable, region, timestamp }

**3. フロントエンド統合 (web/ocr.html)**

機能:
- OCRエンジン選択: <select>でAWS Textract選択（⭐推奨マーク）
- updateOCREngine(): エンジン情報表示（色: オレンジ、説明: 表・フォーム認識対応）
- performTextractOCR(imageData): 
  * fetch POST /api/ocr/textract
  * 進捗表示: 30% → 60% → 90% → 100%
  * エラーハンドリング: 信頼度低下警告、サイズ超過エラー

【エラーハンドリング】
- 画像未選択: 400 "画像データが必要です"
- サイズ超過: 400 "画像サイズは10MB以下にしてください"
- 認証エラー: 403 "AWS認証情報を確認してください"
- スロットリング: 429 "リクエスト制限に達しました。しばらく待ってから再試行してください"

【ロギング】
- console.log: [Textract] Initialized with region: {region}
- console.log: [OCR API] Textract処理開始: documentType={type}
- logger.info: OCR処理完了: processingTime={ms}ms, confidence={percent}%

【出力ファイル】
1. api/services/textract.js (310行)
2. api/routes/ocr.js (170行)
3. api/server.js更新 (require('./routes/ocr'), app.use('/api/ocr', ocrRoutes))
4. web/ocr.html更新 (Textract選択肢、performTextractOCR関数)
5. api/.env.example (AWS認証情報テンプレート)

【制約】
- .envファイルはGit管理外 (.gitignoreに追加)
- 本番環境ではIAMロール使用推奨（AccessKey代替）
- 画像形式: JPEG, PNG対応
```

---

## 6. QR検品システム開発プロンプト

### プロンプト: html5-qrcodeライブラリ統合

```
html5-qrcodeライブラリを使用したQR検品システムを実装してください。

【要件】

**1. QRスキャナー画面 (qr-inspection.html)**

UI構成:
- 出荷指示選択ドロップダウン
- 製品情報表示エリア（製品名、数量、出荷日）
- 検品担当者入力フィールド
- 同梱物チェックリスト（component_type別アイコン）
  * main: 📦
  * accessory: 🔧
  * manual: 📖
  * warranty: 📜
- QRスキャナーコンテナ (<div id="qr-reader">)
- 進捗表示: スキャン済 X / 総数 Y
- プログレスバー: Bootstrap progress
- 検品開始/完了ボタン
- ステータス表示エリア（リアルタイムフィードバック）

**2. QRスキャナーロジック (js/qr-scanner.js)**

クラス: QRInspectionManager

初期化:
- html5-qrcode CDN読み込み
- Html5Qrcode初期化
- カメラデバイス選択（バックカメラ優先）

メソッド:
- startInspection(): 検品開始
  * POST /api/qr-inspections
  * inspection_idを保存
  * スキャナー起動

- startScanner(): カメラ起動
  * Html5Qrcode.start()
  * qrbox: { width: 250, height: 250 }
  * fps: 10
  * aspectRatio: 1.0
  * カメラ権限エラーハンドリング

- onScanSuccess(decodedText, decodedResult): スキャン成功
  * POST /api/qr-inspections/:id/scan
  * 重複チェック（クライアント側でも）
  * UIアップデート: チェックリストに✓
  * 音声フィードバック（オプション: AudioContext使用）
  * プログレスバー更新

- onScanFailure(error): スキャン失敗
  * コンソールログのみ（ユーザーに表示しない）

- completeInspection(): 検品完了
  * PATCH /api/qr-inspections/:id/complete
  * スキャナー停止 (Html5Qrcode.stop())
  * 結果表示モーダル
  * 在庫更新確認

- stopScanner(): スキャナー停止
  * Html5Qrcode.stop()
  * カメラ解放

**3. デバイス対応 (js/device-mode.js)**

機能:
- iOSデバイス判定: /iPhone|iPad|iPod/.test(navigator.userAgent)
- Android判定: /Android/.test(navigator.userAgent)
- カメラ権限ガイド表示（iOS Safari: 設定→Safari→カメラ→許可）
- HTTPS強制リダイレクト（カメラアクセス要件）

**4. バックエンドAPI (api/server.js追加)**

エンドポイント実装:
- POST /api/qr-inspections: 検品セッション作成、total_components取得
- POST /api/qr-inspections/:id/scan: QRコード検証、重複チェック、スキャン記録
- PATCH /api/qr-inspections/:id/complete: ステータス更新、在庫減算
- GET /api/qr-inspections/:id: 検品状態取得

ビジネスロジック:
- QRコード検証: product_components.qr_codeで照合
- 重複スキャンエラー: 既存レコード確認
- 在庫更新: inventory.current_stock -= passed_quantity
- トランザクション管理: BEGIN/COMMIT

【エラーハンドリング】
- カメラアクセス拒否: "カメラへのアクセスが拒否されました。ブラウザ設定を確認してください。"
- HTTPS未使用: "QRスキャンにはHTTPS接続が必要です。"
- 不正QRコード: "対象外のQRコードです"
- 重複スキャン: "既にスキャン済みです"
- 検品未完了: "すべての同梱物をスキャンしてください"

【出力ファイル】
1. web/qr-inspection.html
2. web/js/qr-scanner.js
3. web/js/device-mode.js
4. api/server.js更新（QR検品エンドポイント追加）
5. web/css/qr-scanner.css（スキャナー専用スタイル）

【制約】
- html5-qrcode: CDN https://unpkg.com/html5-qrcode
- カメラアクセス: HTTPS必須
- iOS Safari: webkit prefixes対応
- モバイルレスポンシブ: Bootstrap grid使用
```

---

## 7. デプロイ・運用プロンプト

### プロンプト: AWS EC2デプロイ自動化

```
生産管理システムをAWS EC2にデプロイする自動化スクリプトを作成してください。

【環境】
- EC2インスタンス: Amazon Linux 2023
- IP: 57.180.82.161
- SSH Key: ~/.ssh/production-management-key.pem
- ユーザー: ec2-user
- デプロイディレクトリ: /var/www/html

【要件】

**1. クイックデプロイスクリプト (quick-deploy.sh)**

機能:
- デプロイ前チェック: SSH接続確認
- rsync同期: ローカル→EC2
  * 除外: node_modules, .git, terraform, *.log
  * オプション: -avz --delete
  * 対象: web/, api/, nginx/, postgres/, docker-compose.yml
- Docker Compose再起動: 
  * ssh "cd /var/www/html && sudo docker-compose restart"
- ヘルスチェック:
  * HTTP 200確認: http://57.180.82.161/health
  * API確認: http://57.180.82.161/api/health

出力:
- 🚀 Quick Deploy to Production
- ✓ ファイル同期完了
- ✓ サービス再起動完了
- ✓ アプリケーション正常稼働中 (HTTP 200)
- ✓ API正常稼働中 (HTTP 200)

**2. EC2セットアップスクリプト (ec2-setup.sh)**

初回セットアップ:
- Docker インストール (yum)
- Docker Compose インストール
- ディレクトリ作成: /var/www/html
- 権限設定: chown ec2-user:ec2-user
- ファイアウォール設定: ポート80, 443, 3000, 5432
- Git設定（オプション）

**3. デプロイ検証スクリプト (verify-deployment.sh)**

チェック項目:
- Docker コンテナ状態: docker ps
- ログ確認: docker-compose logs --tail=50
- ディスク使用量: df -h
- メモリ使用量: free -h
- ネットワーク接続: netstat -tlnp
- API疎通: curl http://localhost:3000/health
- Database接続: docker exec postgres pg_isready

**4. 管理スクリプト (manage.sh)**

コマンド:
- ./manage.sh start: システム起動 (docker-compose up -d)
- ./manage.sh stop: システム停止 (docker-compose down)
- ./manage.sh restart: 再起動
- ./manage.sh status: 状態確認 (docker ps, curl health)
- ./manage.sh logs: ログ表示 (docker-compose logs -f)
- ./manage.sh backup: DBバックアップ (pg_dump)
- ./manage.sh clean: 完全削除 (docker-compose down -v)

【環境変数管理】

**api/.env (本番環境)**
```
PORT=3000
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=production_pass
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIAVMNN5F7FQOZ6WMYU
AWS_SECRET_ACCESS_KEY=***
CORS_ORIGIN=*
```

転送方法:
- scp -i ~/.ssh/production-management-key.pem api/.env ec2-user@57.180.82.161:/var/www/html/api/.env
- 権限: chmod 600 api/.env
- Git管理外: .gitignore追加

【SSL/TLS設定 (オプション)】

スクリプト: setup-ssl.sh
- 自己署名証明書生成: openssl req
- 証明書配置: ssl/server.crt, ssl/server.key
- nginx設定更新: listen 443 ssl

【出力ファイル】
1. quick-deploy.sh
2. ec2-setup.sh
3. verify-deployment.sh
4. manage.sh
5. setup-ssl.sh (オプション)
6. .rsyncignore (rsync除外リスト)

【制約】
- SSH接続: パスワードレス認証（秘密鍵使用）
- sudo権限: ec2-userがsudo可能
- 実行権限: chmod +x *.sh
```

---

## 8. 監視・分析システムプロンプト

### プロンプト: Grafana + Prometheus統合

```
Grafana + Prometheusによる監視・分析システムを構築してください。

【要件】

**1. Prometheus設定 (prometheus/prometheus.yml)**

スクレイピング設定:
- job_name: 'production-api'
  * targets: ['production-api:3000']
  * interval: 15s
  * metrics_path: /metrics

- job_name: 'postgres'
  * targets: ['production-postgres:5432']
  * interval: 30s

- job_name: 'nginx'
  * targets: ['production-nginx:80']
  * interval: 15s

**2. Grafana データソース設定 (grafana/provisioning/datasources/)**

datasources.yml:
- name: PostgreSQL
  * type: postgres
  * url: postgres:5432
  * database: production_db
  * user: production_user
  * sslmode: disable

- name: Prometheus
  * type: prometheus
  * url: http://prometheus:9090
  * access: proxy

**3. Grafanaダッシュボード構成**

ダッシュボード1: 生産管理KPI
- 出荷指示ステータス別件数（円グラフ）
- 検品合格率（ゲージ）
- 在庫推移（時系列グラフ）
- 日別出荷数（棒グラフ）

SQL例:
```sql
SELECT status, COUNT(*) as count 
FROM shipping_instructions 
GROUP BY status;
```

ダッシュボード2: システム監視
- APIレスポンスタイム（時系列）
- エラー率（パーセンテージ）
- データベース接続数（ゲージ）
- メモリ使用量（時系列）

ダッシュボード3: ビジネス分析
- 顧客別出荷数（テーブル）
- 製品別出荷数（棒グラフ）
- 納入場所別配送状況（地図）
- 優先度別処理時間（ヒートマップ）

**4. アラート設定 (Prometheus Alertmanager)**

アラートルール:
- 在庫低下: inventory.available_stock < 10
- API応答遅延: response_time > 1000ms
- エラー率上昇: error_rate > 5%
- データベース接続失敗: db_connection_failed

通知先:
- Email
- Slack (Webhook)
- PagerDuty (クリティカルのみ)

**5. ログ集約 (オプション: Loki)**

Lokiインストール:
- docker-compose.ymlに追加
- Promtailでログ収集
- Grafanaで可視化

【出力ファイル】
1. prometheus/prometheus.yml
2. grafana/provisioning/datasources/datasources.yml
3. grafana/provisioning/dashboards/ (JSON定義)
4. docker-compose.yml更新（Grafana/Prometheus追加）

【制約】
- Grafana管理者: admin/admin123 (初回ログイン時変更)
- profile: monitoring (デフォルト無効、./manage.sh monitoring start で有効化)
- データ保持期間: Prometheus 200h
```

---

## 9. 追加機能プロンプト

### プロンプト: モバイル最適化

```
生産管理システムをモバイルデバイス（スマホ/タブレット）向けに最適化してください。

【要件】
- レスポンシブデザイン: Bootstrap 5 breakpoints
- タッチ操作対応: タップ、スワイプ、ピンチズーム
- PWA対応: manifest.json、service worker
- オフライン機能: IndexedDB使用
- カメラ最適化: QRスキャン、写真撮影
- 通知: Push Notification API

【出力ファイル】
1. web/css/mobile.css
2. web/manifest.json
3. web/service-worker.js
4. web/js/offline-storage.js
```

### プロンプト: セキュリティ強化

```
生産管理システムのセキュリティを強化してください。

【要件】
- JWT認証: ログイン、トークン検証
- RBAC: ロールベースアクセス制御（管理者、作業者、閲覧者）
- HTTPS強制: nginx設定、HSTS
- CSRF対策: csurf middleware
- SQLインジェクション対策: パラメータ化クエリ
- XSS対策: helmet、Content-Security-Policy
- レート制限強化: IP単位、エンドポイント別
- 監査ログ: ユーザー操作記録

【出力ファイル】
1. api/middleware/auth.js
2. api/middleware/rbac.js
3. api/routes/auth.js (login, logout, refresh)
4. nginx/conf.d/ssl.conf
```

---

## 使用例

### 基本的な使い方

1. **新規プロジェクト作成時**
   - セクション1（基盤インフラ）から順に実行
   - 各プロンプトをAIアシスタントにコピー&ペースト
   - 生成されたコードを指定されたファイルに配置

2. **既存プロジェクトへの機能追加時**
   - 該当するセクションのプロンプトを使用
   - 例: AWS Textract追加 → セクション5のプロンプト使用

3. **カスタマイズ**
   - プロンプト内の要件を追加/削除
   - 出力ファイルパスを環境に合わせて調整
   - 技術スタックのバージョンを更新

### プロンプトチェーン例

```
1. プロンプト1（基盤インフラ） → docker-compose.yml生成
2. プロンプト2（データベース） → SQLスクリプト生成
3. プロンプト3（バックエンド） → API server.js生成
4. プロンプト4（フロントエンド） → HTML/CSS/JS生成
5. プロンプト7（デプロイ） → デプロイスクリプト生成
```

---

## 注意事項

### 環境変数・認証情報
- プロンプト内のAWS_ACCESS_KEY_ID等は**サンプル値**です
- 本番環境では実際の認証情報に置き換えてください
- .envファイルは**絶対にGitにコミットしない**でください

### バージョン管理
- 依存パッケージのバージョンは最新を確認してください
- セキュリティアップデートは定期的に適用してください

### 本番環境デプロイ前
1. セキュリティ監査実施
2. 負荷テスト実施
3. バックアップ体制確立
4. 監視・アラート設定

---

## ライセンス

このプロンプトテンプレート集はMITライセンスで提供されます。
