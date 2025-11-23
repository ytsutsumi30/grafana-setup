# ソースファイル一覧レポート

**プロジェクト名**: 生産管理システム（出荷検品・QRスキャン統合プラットフォーム）
**レポート作成日**: 2025-11-21
**対象ブランチ**: claude/list-source-files-01Mm6MeERY8rVeG1vDERyqx3

---

## 📋 エグゼクティブサマリー

本レポートは、生産管理システムプロジェクトにおける全ソースファイル（マークダウン、HTML、JavaScript、Terraform）の完全な一覧と分析結果を提供します。

### 主要統計

| ファイル種別 | ファイル数 | 総行数 | 平均行数 |
|------------|----------:|-------:|---------:|
| **マークダウン (.md)** | 83 | 30,665 | 369 |
| **HTML** | 51 | 40,386 | 792 |
| **JavaScript (.js)** | 30 | 14,841 | 495 |
| **Terraform (.tf/.tfvars)** | 20 | 1,506 | 75 |
| **合計** | **184** | **87,398** | **475** |

### プロジェクトの特徴

1. **QRスキャン・検品機能が中心**: 全体の約40%がQR関連機能（スキャナー最適化、検品フロー、iOS Safari対応）
2. **モバイルファースト設計**: iPad/iPhone Safari向けの広範な最適化とテスト
3. **AWS統合**: Terraformによるインフラ管理とコスト最適化（月額$19-24）
4. **OCR/AI機能**: Tesseract.js、AWS Textractを活用した伝票読み取りシステム
5. **包括的なドキュメント**: 83個のマークダウンファイルで詳細な技術文書を管理

---

## 🏗️ プロジェクト概要

### システム構成

```
├── フロントエンド (HTML + Vanilla JS)
│   ├── 出荷検品システム (index.html)
│   ├── QRスキャナー (safari*.html, qr-inspection*.html)
│   ├── 受注・ピッキング (order.html, ItemPicking.html)
│   ├── マスタ管理 (products.html, shipping-*.html)
│   └── OCR伝票読取 (ocr*.html)
│
├── バックエンド (Node.js/Express)
│   ├── APIサーバー (api/server.js - 5,033行)
│   ├── OCRサービス (api/routes/ocr*.js)
│   └── AWS Textract連携 (api/services/textract.js)
│
├── データベース
│   └── PostgreSQL 15 (RDS on AWS)
│
└── インフラ (Terraform)
    ├── VPC/EC2/RDS/ALB モジュール
    ├── EventBridge スケジューラー（自動起動停止）
    └── Route53 + ACM（ドメイン・SSL管理）
```

### 技術スタック

- **フロントエンド**: Vanilla JavaScript (ES6+), Bootstrap 5, Leaflet.js, jsQR
- **バックエンド**: Node.js 18+, Express, PostgreSQL Driver
- **データベース**: PostgreSQL 15
- **インフラ**: AWS (EC2/RDS/ALB/Route53), Terraform, Docker Compose
- **QRスキャン**: BarcodeDetector API, jsQR Library
- **OCR**: Tesseract.js, AWS Textract

---

## 📊 統計分析

### ファイル種別分布

```
JavaScript (30ファイル, 17%)  ████████
HTML (51ファイル, 28%)        ██████████████
Markdown (83ファイル, 45%)    ██████████████████████
Terraform (20ファイル, 11%)   █████
```

### コード規模分布

```
JavaScript (14,841行, 17%)    ████████
HTML (40,386行, 46%)          ███████████████████████
Markdown (30,665行, 35%)     █████████████████
Terraform (1,506行, 2%)       █
```

### 最大ファイルTop 5

| ファイル | 行数 | 種別 |
|---------|-----:|------|
| api/server.js | 5,033 | JavaScript |
| shipping-instruction-mockup2.html | 2,398 | HTML |
| web/shipping-instruction-mockup2.html | 2,398 | HTML |
| web/js/app.js | 1,725 | JavaScript |
| web/js/index-app.js | 1,697 | JavaScript |

---

## 📄 マークダウンファイル一覧 (83ファイル)

### カテゴリ別分類

**QRスキャン・検品関連 (45ファイル - 54%)**
- Safari/iOS最適化レポート: 15ファイル
- QR検品システムレポート: 20ファイル
- モバイル最適化ガイド: 10ファイル

**AWS/Terraformデプロイ (15ファイル - 18%)**
- AWSデプロイガイド: 6ファイル
- Terraformドキュメント: 4ファイル
- インフラ設定レポート: 5ファイル

**システム仕様・設計 (10ファイル - 12%)**
- データベース設計: 2ファイル
- API統合ドキュメント: 3ファイル
- システム仕様書: 5ファイル

**運用・操作ガイド (13ファイル - 16%)**
- 操作マニュアル: 5ファイル
- トラブルシューティング: 4ファイル
- OCR使い方ガイド: 4ファイル

### トップレベル設定ファイル (4ファイル)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| CLAUDE.md | 190 | Claude Code向けプロジェクト開発ガイド |
| copilot-instructions.md | 263 | GitHub Copilot向け統合プラットフォーム指示書 |
| claude-skills-presentation.md | 417 | Claude Skillsプレゼンテーション資料 |
| github-pages-qr-test/README.md | 191 | iPhone Safari QRスキャンテストデモページ |

### docs/ ディレクトリ (4ファイル)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| docs/DATABASE_DESIGN.md | 741 | PostgreSQLデータベース設計書 v2.2.0 |
| docs/QR_INSPECTION_API_INTEGRATION.md | 563 | QR検品システムAPI統合ドキュメント v4.0.0 |
| docs/HARDCODED_DATA_ANALYSIS.md | 969 | ハードコードデータ分析レポート |
| docs/AWS_TEXTRACT_SETUP.md | 159 | AWS Textract OCRセットアップガイド |

### doc/ ディレクトリ (14ファイル)

**基本README (3ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| doc/README.md | 327 | 統合環境概要と出荷検品機能 |
| doc/README2.md | 312 | WSL上Docker環境システム概要 |
| doc/README3.md | 1,066 | 設計資料・チェックリスト・作業ログ |

**AWSデプロイ (6ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| doc/aws/AWS_DEPLOYMENT.md | 774 | デプロイメントガイド完全版 |
| doc/aws/AWS_DEPLOYMENT_GUIDE.md | 726 | aws-startup.sh使用方法 |
| doc/aws/AWS_STARTUP_GUIDE.md | 587 | AWS上での稼働手順 |
| doc/aws/AWS_README.md | 267 | 提供ファイルと使用目的 |
| doc/aws/AWS_QUICKSTART.md | 110 | 5分でAWS起動ガイド |
| doc/aws/QUICKSTART_AWS.md | 92 | 10分で稼働開始5ステップ |

**運用ガイド (3ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| doc/guides/OPERATION_MANUAL.md | 732 | 操作手順書 |
| doc/guides/PROMPT_TEMPLATES.md | 877 | プロジェクト生成プロンプト集 |
| doc/guides/FLYER_PROMPT.md | 322 | チラシ作成用照会文 |

**OCR (2ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| doc/ocr/OCR_USAGE_GUIDE.md | 411 | AI-OCR強化版使い方ガイド |
| doc/ocr/OCR_IMPROVEMENT_ROADMAP.md | 273 | AI-OCR精度向上ロードマップ |

### md/ ディレクトリ (58ファイル)

**QR検品・スキャナー関連 (37ファイル)**

主要なレポートファイル:

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| md/QR_SCANNER_BRUSHUP_REPORT.md | 623 | QRスキャナーブラッシュアップ（+26%改善） |
| md/QR_INSPECTION_VERSION_COMPARISON.md | 621 | QR検品HTMLバージョン比較（v2.1 vs 旧） |
| md/QR_COMPARISON_ANALYSIS.md | 576 | ItemPicking vs qr-scanner比較分析 |
| md/QR_SCANNER_COMPARISON.md | 516 | safari2 vs qr-inspection2機能比較 |
| md/IPAD_SAFARI_OPTIMIZATION_DEPLOY.md | 473 | iPad/iPhone Safari 18.6+最適化デプロイ |
| md/SAFARI_INTEGRATION_COMPLETE.md | 420 | Safari QRスキャン機能統合完了 |
| md/IOS_CACHE_CLEAR_GUIDE.md | 429 | iOS Safariキャッシュクリア完全ガイド |
| md/IOS_QRSCANNER_FIX.md | 425 | iOS Safari QRスキャナーエラー修正 |

**デプロイ・インフラ (11ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| md/DEPLOYMENT_AWS.md | 624 | AWS TerraformデプロイガイドTerraform完全ガイド |
| md/SCHEDULER_ANALYSIS_REPORT.md | 355 | EC2自動起動停止分析レポート |
| md/DEPLOYMENT_GUIDE.md | 307 | EC2デプロイメントガイド |
| md/HTTPS_SETUP_COMPLETE.md | 163 | HTTPS設定完了レポート |
| md/RDS_SSL_FIX_REPORT.md | 179 | RDS SSL接続修正レポート |

**システム仕様 (4ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| md/SYSTEM_SPECIFICATION.md | 1,422 | 完全システム仕様書 v1.2.0 |
| md/DATABASE_SCHEMA.md | 686 | PostgreSQLスキーマ仕様書 |
| md/CAMERA_API_ERROR_GUIDE.md | 356 | カメラAPIエラー解決ガイド |
| md/README2.md | 312 | システム統合環境概要 |

**md/web/ サブディレクトリ (11ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| md/web/SAFARI2_PHASE1_PHASE2_REPORT.md | 722 | safari2.html Phase 1&2完全実装 v2.1 |
| md/web/ITEMQR_QRSCAN_ANALYSIS.md | 611 | itemqr.html QRスキャン機能分析 |
| md/web/QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md | 561 | qr-inspection Safari最適化統合 |
| md/web/QR_INSPECTION_V21_COMPLETE_REPORT.md | 472 | qr-inspection v2.1完全統合 |
| md/web/DEVICE_MODE_GUIDE.md | 471 | デバイスモード選択機能実装ガイド |

**md/terraform/ サブディレクトリ (3ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| md/terraform/DEPLOY_GUIDE.md | 394 | Terraform Deploy Script修正概要 |
| md/terraform/COST_OPTIMIZATION.md | 318 | コスト最適化ガイド（月額$19-24） |
| md/terraform/QUICK_START.md | 69 | 3ステップAWSデプロイガイド |

### terraform/ ディレクトリ (1ファイル)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/README.md | 373 | POC環境向けコスト最適化AWSインフラ構成 |

---

## 🌐 HTMLファイル一覧 (51ファイル)

### カテゴリ別分類

**メインページ (3ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/index.html | 601 | 出荷検品システム品質管理画面（検品待ち一覧、実績、QRコード生成） |
| web/index-original.html | 1,500 | 出荷指示管理システム拡張版（3画面切替、QRスキャン、Safari最適化） |
| web/index-org.html | 501 | 出荷指示管理システムメイン画面（デバイスモード選択、ピッキング） |

**QRスキャナー (16ファイル)**

主要なスキャナーページ:

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/android.html | 1,208 | Android/Chrome最適化QRスキャナー（高速スキャン、BFCache対応） |
| web/safari.html | 1,296 | Safari最適化QRスキャナー（URL自動遷移、iOS対応最新版） |
| web/safari3.html | 1,219 | Safari最適化＋URL自動遷移（スキャン結果自動ナビゲーション） |
| web/safari2.html | 1,201 | Safari最適化QRスキャナー（iOS環境安定動作特化版） |
| web/qr-ins-android.html | 1,280 | QR同梱物検品Android版（Android最適化QRスキャナー） |
| web/qr-inspection2.html | 1,263 | QR同梱物検品システム版2（複数商品検品対応） |
| web/qr-inspection-v2.1.html | 1,054 | QR同梱物検品システムv2.1（スキャン中アニメーション改善） |
| web/qr-inspection.html | 1,019 | QR同梱物検品システム標準版（QRコード読み取り検品フロー） |
| web/itemqr.html | 1,008 | ピッキング作業画面（QRスキャン対応アイテムピッキング支援） |
| web/ItemPicking.html | 1,009 | ピッキング作業管理画面（品目情報表示、マッチング機能） |

その他のQRスキャナー:

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/safari31.html | 724 | Safari最適化QRスキャナー（iOSブラウザ向け最適化） |
| web/qr-ins.html | 641 | 出荷検品システム用QRスキャナー（スキャン中アニメーション） |
| web/qr-inspection3.html | 601 | 出荷検品システム向けQRスキャナーv3（Safari統合） |
| web/safari4.html | 230 | シンプルなバーコード・QRスキャナーページ |
| web/qr.html | 133 | シンプルなWebベースQRコード読み取りツール（jsQR使用） |
| web/qr-inspection-backup-20251017-040209.html | 1,054 | QR同梱物検品システムバックアップ（2025/10/17版） |

**出荷管理 (5ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| shipping-instruction-mockup2.html | 2,398 | Leaflet地図統合QRスキャナー式出荷指示管理（配送ルート表示） |
| web/shipping-instruction-mockup2.html | 2,398 | 地図統合QR対応出荷指示管理モックアップ（納品実績管理） |
| web/shipping-inspection-mockup.html | 1,064 | 出荷検品システムモックアップ（商品検査フローUI） |
| web/shipping-instructions.html | 594 | 出荷指示管理主要ページ（一覧表示、複雑なフィルタリング） |
| web/shipping-instruction-maintenance.html | 331 | 出荷指示マスタメンテナンス（マスタデータ作成・編集） |

**受注・オーダー (3ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/order.html | 1,605 | 受注オーダー出荷画面（在庫数量表示、ピッキング・出荷処理） |
| order-picking-list3.html | 1,199 | Tesseract.js OCR機能搭載受注オーダー出荷（画像認識伝票読取） |
| order-picking-list_org.html | 930 | 受注オーダー出荷オリジナル版（在庫数量、ピッキングリスト） |

**OCR・AI (4ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/ocr.html | 1,230 | AI伝票読み取りシステム（Tesseract.js画像テキスト認識） |
| web/ocr-v2-enhanced.html | 811 | 製品別伝票チェックシステムOCR v2（製品別フィルタ機能） |
| web/ocr-enhanced-demo.html | 380 | AI-OCR強化版デモページ（インタラクティブデモ） |
| web/ocr-enhanced.html | 332 | AI-OCR強化版（ハイブリッドOCR、AI補正、学習機能） |

**マスタ管理 (8ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/products.html | 734 | 製品マスタ管理画面（製品一覧、現在庫、マスタデータ管理） |
| web/production-plans.html | 494 | 生産計画管理画面（生産計画作成・管理、進捗管理） |
| web/product-components.html | 493 | 製品構成部品管理（部品とQRコード対応マッピング） |
| web/inspectors.html | 487 | 検品者マスタ管理（検品者情報の登録・編集・削除） |
| web/inventory.html | 453 | 在庫管理画面（製品在庫の確認・調整・分析） |
| web/delivery-locations.html | 449 | 配送先拠点管理（顧客拠点情報のCRUD画面） |
| web/shipping-locations.html | 433 | 出荷元拠点管理（倉庫・工場の拠点マスタデータ管理） |
| web/system-config.html | 389 | システム設定画面（POC/本番モード切替、構成管理） |

**品質管理・分析 (2ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/qc-dashboard.html | 466 | QC七つ道具ダッシュボード（品質管理統計分析ツール統合） |
| web/qc-analysis.html | 425 | 新QC七つ道具分析ツール（親和図法・連関図法等の可視化） |

**システム管理 (4ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/maintenance.html | 471 | システムメンテナンス画面（管理・保守機能統合ページ） |
| web/database.html | 463 | データベース管理画面（バックアップ・復元機能WebUI） |
| web/logs.html | 419 | システムログ表示画面（ログファイル一覧・内容閲覧） |
| web/monitoring.html | 409 | 生産モニタリングダッシュボード（統計・分析情報表示） |

**その他・特殊用途 (6ファイル)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| aws-system-diagram.html | 1,454 | Terraform管理AWSシステム構成図（複数タブでインフラ可視化） |
| web/exhibition-flyer.html | 763 | 展示会用A4両面チラシ（システム紹介、機能カード、技術スタック） |
| web/QRPOC.html | 449 | Infor CSI/Factory Track統合用QRコード読取画面（Mongoose API連携） |
| web/camera-test.html | 387 | カメラAPI診断ツール（環境情報、mediaDevices対応確認） |
| github-pages-qr-test/index.html | 262 | GitHub Pages用QRスキャンテスト（HTTPS自動有効化テスト） |

---

## 💻 JavaScriptファイル一覧 (30ファイル)

### カテゴリ別分類

**APIサーバー (5ファイル - 5,960行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| api/server.js | 5,033 | Express.js APIサーバーメイン。出荷指示、商品、QR検品、OCRルート、レポート、DB統合 |
| api/services/textract.js | 293 | AWS Textractサービス。テキスト抽出、フォーム分析、表データ抽出、信頼度計算 |
| api/routes/ocr-feedback.js | 318 | OCRフィードバックAPIルート。修正データ蓄積、学習DB、統計情報取得 |
| api/routes/ocr.js | 183 | OCR APIルート。AWS Textract連携、テキスト抽出、ドキュメント類型処理 |
| api/routes/ocr-enhance.js | 158 | OCR後処理ルート。LLM統合補正（OpenAI/Claude/Gemini対応、現在ルールベース実装） |
| api/routes/ocr-ai.js | 273 | OCR AI補正ルート。文脈ベース補正、期待フィールド検証、言語別対応（日/英） |

**フロントエンドメインアプリ (5ファイル - 5,442行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/app.js | 667 | 生産管理システムメインアプリ。ダッシュボード、出荷、検品、在庫管理の統合管理とAPI連携 |
| web/js/app.js | 1,725 | メインアプリケーション制御。ShippingAppクラス、モジュール統合初期化、イベント管理 |
| web/js/index-app.js | 1,697 | Safari最適化QRスキャナーアプリメイン。バージョン管理、スキャナー初期化、結果表示 |
| web/js/app-backup.js | 712 | メインアプリのバックアップ。初期化フロー、モジュール管理、イベントハンドリング |
| github-pages-qr-test/app.js | 371 | GitHub Pages用QRスキャンテスト。iPhone Safari対応QR読み取り、スキャン履歴管理 |
| web/js/device-mode.js | 279 | デバイスモード管理。iPad MiniとiPhone 6モード切替、ビューポート設定、LocalStorage |

**QRスキャナー (4ファイル - 2,692行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/js/qr-scanner.js | 1,287 | Safari最適化QRスキャナーv2（強化版）。iOS最適化制約、キャリブレーション、デバッグ |
| web/modules/qr-scanner.js | 690 | Safari最適化QRスキャナーESモジュール。カメラ制約段階的トライ、キャリブレーション |
| web/js/qr-inspection-app.js | 670 | QR検品アプリ。出荷指示IDベース検品、スキャン結果集計、検品完了処理、リアルタイム検証 |
| web/js/qr-scanner-worker.min.js | 98 | QRコード検出ワーカー（minified）。jsQRライブラリベースの二値化・QRデコード処理 |
| web/js/modules/qr-scanner.js | 17 | QRスキャナーモジュール。シンプルスタブ実装、スキャナー破棄機能 |

**OCR機能 (5ファイル - 1,965行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/js/image-preprocessing.js | 461 | 画像前処理パイプライン。アップスケーリング、シャープニング、モルフォロジー操作 |
| web/js/image-preprocessor.js | 459 | 画像前処理モジュール。グレースケール変換、ノイズ除去、コントラスト調整、傾き補正、二値化 |
| web/js/ocr-engine-enhanced.js | 453 | OCRエンジン強化版。Tesseract最適化、ハイブリッドOCR、精度評価メトリクス実装 |
| web/js/ocr-module.js | 394 | OCR統合モジュール。複数エンジン、前処理、AI補正、フィードバック学習統合 |
| web/js/universal-ocr.js | 224 | 再利用可能OCRモジュール。複数エンジン対応、画像前処理、バッチ処理、フィールド抽出 |

**ダッシュボード・分析 (3ファイル - 2,068行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/js/new-qc-analysis.js | 1,046 | 新QC七つ道具。プロジェクト管理、特性要因図、ヒストグラム、散布図、管理図作成 |
| web/js/qc-dashboard.js | 521 | QC分析ダッシュボード。パレート図、管理図、ヒストグラム、散布図、データ生成 |
| web/js/monitoring-dashboard.js | 501 | リアルタイムモニタリングダッシュボード。出荷統計、製品ランキング、在庫ヘルス、アラート |

**業務モジュール (3ファイル - 1,320行)**

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| web/modules/inventory-manager.js | 495 | 在庫管理モジュール。出荷指示、ピッキング、照合機能、SyteLineIDO連携、オフライン同期 |
| web/js/shipping-instruction-maintenance.js | 427 | 出荷指示マスタメンテナンス画面。CRUD操作、検索フィルタリング、モーダルダイアログ |
| web/modules/delivery-map.js | 384 | Leafletベース配送地図管理。営業所マーカー表示、マーカー選択、ポップアップ表示 |
| web/js/modules/delivery-map.js | 24 | 配送マップモジュール。Leaflet.js統合、マーカー管理、地図初期化 |
| web/js/modules/inventory-manager.js | 14 | インベントリマネージャーモジュール。シンプルスタブ実装、在庫管理基本構造 |

### 統計情報

- **総行数**: 14,841行
- **総ファイル数**: 30ファイル
- **平均行数**: 495行/ファイル
- **最大ファイル**: api/server.js (5,033行 - 全体の34%)
- **最小ファイル**: web/js/modules/inventory-manager.js (14行)

### 機能分布

```
APIサーバー (5ファイル, 40%)        ████████████████████
フロントエンドメイン (6ファイル, 37%)  ██████████████████
QRスキャナー (5ファイル, 18%)       █████████
OCR機能 (5ファイル, 13%)           ██████
ダッシュボード (3ファイル, 14%)     ███████
業務モジュール (5ファイル, 9%)     ████
```

---

## 🏗️ Terraformファイル一覧 (20ファイル)

### 構成概要

Terraformコードは**モジュール構造**で整理され、5つの主要モジュール（VPC、EC2、RDS、ALB、Scheduler）で構成されています。

### ルートモジュール (4ファイル - 471行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/main.tf | 152 | AWS Provider設定、VPC/EC2/RDS/Scheduler モジュール呼び出し、Route53ホストゾーン、ALB条件付き構成 |
| terraform/variables.tf | 153 | AWS リージョン、EC2/RDS インスタンスタイプ、VPC CIDR、DB認証情報、スケジューラ設定、ドメイン設定の入力変数 |
| terraform/outputs.tf | 100 | VPC ID、EC2インスタンスID/パブリックIP、RDS エンドポイント、アプリURL、SSHコマンド、スケジューラ時刻、月額コスト |
| terraform/terraform.tfvars | 66 | AWSリージョン、環境、ネットワークCIDR、EC2/RDS設定、ドメイン設定、スケジューラ有効化フラグの設定値 |

### VPCモジュール (3ファイル - 103行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/modules/vpc/main.tf | 57 | VPC、インターネットゲートウェイ、パブリックサブネット（単一AZまたはALB用マルチAZ）、ルートテーブル |
| terraform/modules/vpc/variables.tf | 26 | 環境名、VPC CIDR、パブリックサブネットCIDR、AZ、ALB有効化フラグの入力変数 |
| terraform/modules/vpc/outputs.tf | 20 | VPC ID、パブリックサブネットID（単数/複数）、VPC CIDRブロック |

### EC2モジュール (3ファイル - 243行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/modules/ec2/main.tf | 166 | Amazon Linux 2023 EC2インスタンス（t3.micro、30GB EBS）、セキュリティグループ（HTTP/HTTPS/SSH）、IAMロール、Elastic IP、ユーザーデータスクリプト |
| terraform/modules/ec2/variables.tf | 57 | 環境名、VPC/サブネットID、EC2インスタンスタイプ、SSH キー名、DB接続情報、Grafana有効化フラグ |
| terraform/modules/ec2/outputs.tf | 20 | EC2インスタンスID、パブリックIP（Elastic IP）、セキュリティグループID、インスタンス状態 |

### RDSモジュール (3ファイル - 228行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/modules/rds/main.tf | 162 | PostgreSQL 15 RDSインスタンス（db.t3.micro、20GB）、DBサブネットグループ、セキュリティグループ、パラメータグループ、IAM監視ロール |
| terraform/modules/rds/variables.tf | 46 | 環境名、VPC ID、サブネットID、EC2セキュリティグループID、RDSインスタンスクラス、DB認証情報 |
| terraform/modules/rds/outputs.tf | 20 | RDSインスタンスID、エンドポイント（ポート付き/なし）、ARN |

### ALBモジュール (3ファイル - 232行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/modules/alb/main.tf | 166 | Application Load Balancer、ターゲットグループ、HTTP→HTTPSリダイレクトリスナー、ACM証明書（DNS検証）、Route53 Aレコード（ALBエイリアス） |
| terraform/modules/alb/variables.tf | 36 | 環境名、VPC/パブリックサブネットID、EC2インスタンスID、ドメイン名、Route53 Zone ID、許可CIDRブロック |
| terraform/modules/alb/outputs.tf | 30 | ALB DNS名、ARN、Zone ID、ターゲットグループARN、セキュリティグループID、ACM証明書ARN |

### Schedulerモジュール (3ファイル - 264行)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| terraform/modules/scheduler/main.tf | 214 | EventBridge SchedulerによるEC2/RDSの自動開始停止、IAMロール/ポリシー定義、CloudWatch警報（Cronスケジュール対応） |
| terraform/modules/scheduler/variables.tf | 35 | 環境名、EC2/RDSインスタンスID、開始/停止スケジュール、タイムゾーン、スケジューラ有効化フラグ |
| terraform/modules/scheduler/outputs.tf | 15 | EventBridge スケジューラーIAMロールARN、開始/停止スケジュールARN |

### バックアップファイル (1ファイル)

| ファイル | 行数 | 内容概要 |
|---------|-----:|---------|
| backup-20251104-232606/terraform.tfvars | 165 | バックアップ設定。ALB/SSL設定例、ハイブリッドOCR設定（AWS Textract + GCP Document AI）、スケジューラー、マルチAZ |

### 統計情報

- **総行数**: 1,506行
- **総ファイル数**: 20ファイル
- **平均行数**: 75行/ファイル
- **モジュール数**: 5モジュール（VPC、EC2、RDS、ALB、Scheduler）

### アーキテクチャ構成

**インフラストラクチャ:**
- **VPC**: 単一AZデフォルト、ALB有効時は2AZ対応
- **EC2**: Amazon Linux 2023、t3.micro、30GB EBS、Docker Composeホスト
- **RDS**: PostgreSQL 15、db.t3.micro、20GB、バックアップ7日保持
- **ALB**: ドメイン管理、ACM自動証明書（DNS検証）、HTTP→HTTPSリダイレクト
- **Scheduler**: EventBridgeによる自動開始停止（9:00-19:00 JST、平日のみ）

**コスト最適化:**
- スケジューラ有効時: 月額 $19-24
- POC環境向けt3.micro/db.t3.micro構成
- 夜間・週末の自動停止によるコスト削減

---

## 🔍 分析と推奨事項

### プロジェクトの強み

1. **包括的なドキュメント**: 83個のマークダウンファイルで詳細な技術文書を管理
2. **モバイル最適化**: iOS Safari向けの徹底的な最適化とテスト
3. **モジュール化**: JavaScript、Terraformともに適切にモジュール化
4. **コスト意識**: AWS環境でスケジューラを活用した月額$19-24の低コスト運用
5. **実装の多様性**: 複数バージョンのQRスキャナー実装で最適解を追求

### 改善提案

#### 1. コードの整理

**重複ファイルの統合:**
- QRスキャナー実装が16個存在（safari*.html、qr-inspection*.html など）
- バックアップファイルが散在（app-backup.js、qr-inspection-backup-*.html など）
- 推奨: 最新版のみを残し、旧バージョンはgitログで管理

**ディレクトリ構造の整理:**
```
推奨構造:
web/
├── pages/          # HTMLファイル（機能別）
│   ├── qr/         # QRスキャナー関連
│   ├── shipping/   # 出荷管理関連
│   ├── master/     # マスタ管理関連
│   └── ocr/        # OCR関連
├── js/
│   ├── core/       # コアモジュール（app.js、api.js）
│   ├── modules/    # 機能モジュール
│   └── workers/    # Webワーカー
└── assets/         # 静的リソース
```

#### 2. ドキュメントの整理

**マークダウンファイルの統合:**
- QR関連レポートが45ファイル → 主要な5-10ファイルにまとめる
- デプロイガイドが重複 → 1つの包括的なガイドに統合
- リリースノートを時系列で一元管理（CHANGELOG.md）

**推奨統合:**
```
docs/
├── ARCHITECTURE.md      # システム全体アーキテクチャ
├── DATABASE.md          # データベース設計（統合版）
├── QR_SCANNER.md        # QRスキャナー完全ガイド（統合版）
├── DEPLOYMENT.md        # デプロイメント完全ガイド
├── OPERATIONS.md        # 運用マニュアル
├── CHANGELOG.md         # バージョン履歴・リリースノート
└── api/                 # API仕様
```

#### 3. 開発効率の向上

**コードの共通化:**
- QRスキャナーロジックを1つのモジュールに統合
  - 現在: qr-scanner.js（1,287行）+ modules/qr-scanner.js（690行）
  - 推奨: 1つのqr-scanner.jsに統合し、設定で挙動を切り替え

**テストの追加:**
- 現在、テストファイルが見当たらない
- 推奨: Jest + Testing Libraryでユニット・統合テストを追加
  ```
  tests/
  ├── unit/           # ユニットテスト
  ├── integration/    # 統合テスト
  └── e2e/            # E2Eテスト（Playwright推奨）
  ```

#### 4. CI/CDパイプライン

**GitHub Actionsの活用:**
```yaml
推奨ワークフロー:
- lint: ESLint、Prettier
- test: Jest、Playwright
- build: HTMLバリデーション、JSバンドル
- deploy: rsync または AWS S3/CloudFront
- terraform: terraform plan/apply（PRコメントに結果表示）
```

#### 5. セキュリティ

**セキュリティスキャン:**
- Dependabot有効化（npm依存関係の自動アップデート）
- npm audit定期実行
- TerraformのTfSecスキャン
- OWASP ZAPによる脆弱性スキャン

### 優先度付き実施計画

**フェーズ1: クリーンアップ（1-2週間）**
1. 重複ファイルの削除・統合
2. バックアップファイルの削除（gitログで管理）
3. ディレクトリ構造の整理

**フェーズ2: ドキュメント整備（1週間）**
1. マークダウンファイルの統合
2. CHANGELOG.mdの作成
3. READMEの更新

**フェーズ3: 品質向上（2-3週間）**
1. ESLint/Prettier導入
2. ユニットテスト追加（カバレッジ目標: 60%）
3. E2Eテスト追加（主要フロー）

**フェーズ4: 自動化（1-2週間）**
1. GitHub Actions CI/CD構築
2. 自動デプロイ設定
3. Terraform自動化

---

## 📈 プロジェクトメトリクス

### コードベース規模

| メトリクス | 値 |
|-----------|---:|
| 総ファイル数 | 184 |
| 総行数 | 87,398 |
| ドキュメント率 | 45%（83/184ファイル） |
| HTMLファイル率 | 28%（51/184ファイル） |
| JSファイル率 | 16%（30/184ファイル） |
| IaCファイル率 | 11%（20/184ファイル） |

### 複雑度推定

| 項目 | 評価 |
|------|------|
| フロントエンド複雑度 | **高**（51HTML + 30JS、モノリシック構造） |
| バックエンド複雑度 | **中**（1つの5,033行server.js） |
| インフラ複雑度 | **低**（モジュール化されたTerraform） |
| ドキュメント充実度 | **高**（83マークダウンファイル） |
| テストカバレッジ | **低**（テストファイル未検出） |

### 技術的負債

| 項目 | リスク | 推奨アクション |
|------|--------|--------------|
| 重複コード | 中 | QRスキャナー実装の統合 |
| 巨大ファイル | 中 | server.js（5,033行）の分割 |
| テスト不足 | 高 | テストフレームワーク導入 |
| ドキュメント分散 | 中 | 主要ドキュメントへの統合 |
| バックアップファイル | 低 | 削除（gitで管理） |

---

## 🎯 結論

本プロジェクトは、**87,398行のコード**と**184ファイル**で構成される中規模の生産管理システムです。

**主要な特徴:**
- QRスキャン・検品機能に特化した包括的な実装
- モバイルデバイス（特にiOS Safari）向けの徹底的な最適化
- AWS上での低コスト運用（月額$19-24）を実現するTerraform構成
- 詳細な技術ドキュメント（83マークダウンファイル）

**改善の方向性:**
1. コードの統合と整理（重複排除）
2. テスト追加（品質保証）
3. CI/CD導入（開発効率化）
4. ドキュメント統合（保守性向上）

適切なリファクタリングとプロセス改善により、さらに保守性と拡張性の高いシステムに進化させることが可能です。

---

**レポート作成者**: Claude Code
**レポートバージョン**: 1.0
**最終更新**: 2025-11-21
