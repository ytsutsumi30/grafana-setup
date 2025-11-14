# 生産管理システム 設計資料

## 📋 作業チェックリスト

- [x] **プロジェクト概要把握** - README.md、server.js、SQLスクリプトから主要機能を確認
- [x] **技術スタック確認** - Docker Compose、Node.js、PostgreSQL、nginx、AWS Textractの構成確認
- [x] **データベーススキーマ分析** - テーブル構造、リレーション、ビューを把握
- [x] **API設計確認** - RESTエンドポイント、ルーティング、ミドルウェアを確認
- [x] **フロントエンド構造把握** - HTML/CSS/JSの構成とUI機能を確認
- [x] **AWS連携確認** - Textract OCRサービスの統合状況を確認
- [x] **デプロイ構成確認** - Docker環境、nginx設定、ログローテーションを確認

全体像を把握しましたので、各図を順次作成します。

---

## 1. システム関連図 (System Diagram)

**説明**: 生産管理システムの全体構成と主要コンポーネント間の関係を示します。

```mermaid
graph TB
    subgraph "外部ユーザー"
        U1[生産担当者]
        U2[検品担当者]
        U3[出荷担当者]
        U4[管理者]
    end
    
    subgraph "フロントエンド層"
        WEB[Webアプリケーション<br/>HTML/CSS/JavaScript]
        QR[QRスキャナーUI]
        OCR[AI-OCR画面<br/>AWS Textract]
        DASH[ダッシュボード]
    end
    
    subgraph "リバースプロキシ層"
        NGINX[nginx<br/>ポート80/443]
    end
    
    subgraph "アプリケーション層"
        API[Node.js API Server<br/>Express<br/>ポート3000]
        OCR_SVC[OCR Service<br/>AWS Textract SDK]
    end
    
    subgraph "データ層"
        DB[(PostgreSQL 15<br/>生産管理DB)]
    end
    
    subgraph "監視層"
        GRAF[Grafana<br/>分析ダッシュボード]
        PROM[Prometheus<br/>メトリクス収集]
    end
    
    subgraph "外部サービス"
        AWS[AWS Textract<br/>OCR Service]
    end
    
    U1 & U2 & U3 & U4 --> NGINX
    NGINX --> WEB & QR & OCR & DASH
    NGINX --> API
    NGINX --> GRAF
    
    WEB & QR & OCR & DASH --> API
    API --> DB
    API --> OCR_SVC
    OCR_SVC --> AWS
    
    GRAF --> DB
    PROM --> API
    
    style WEB fill:#e1f5ff
    style API fill:#fff3e0
    style DB fill:#f3e5f5
    style AWS fill:#fff9c4
```

---

## 2. アーキテクチャ図 (Architecture Diagram)

**説明**: システムの3層アーキテクチャとDocker コンテナ構成を示します。

```mermaid
graph TB
    subgraph "Docker Host / AWS EC2"
        subgraph "Docker Network: production-network"
            
            subgraph "コンテナ1: nginx"
                NGINX[nginx:alpine<br/>リバースプロキシ<br/>静的ファイル配信]
                NGINX_VOL[/web/]
                NGINX_CONF[/nginx/conf.d/]
            end
            
            subgraph "コンテナ2: production-api"
                API[node:18-alpine<br/>Express API Server]
                API_CODE[/app/<br/>Node.js Code]
                API_ENV[.env<br/>AWS認証情報]
            end
            
            subgraph "コンテナ3: postgres"
                DB[(PostgreSQL 15-alpine<br/>production_db)]
                DB_VOL[(postgres-data volume)]
            end
            
            subgraph "コンテナ4: grafana (optional)"
                GRAF[Grafana<br/>分析ダッシュボード]
                GRAF_VOL[(grafana-storage volume)]
            end
            
            subgraph "コンテナ5: prometheus (optional)"
                PROM[Prometheus<br/>メトリクス収集]
                PROM_VOL[(prometheus-storage volume)]
            end
        end
        
        subgraph "ホストマウント"
            HOST_WEB[/web/]
            HOST_API[/api/]
            HOST_DB[/postgres/init/]
        end
    end
    
    subgraph "外部"
        CLIENT[クライアント<br/>ブラウザ]
        AWS_TEXTRACT[AWS Textract<br/>OCR API]
    end
    
    CLIENT -->|HTTP/HTTPS<br/>Port 80/443| NGINX
    NGINX -->|Port 3000| API
    API -->|Port 5432| DB
    API -->|HTTPS| AWS_TEXTRACT
    
    GRAF -->|Query| DB
    PROM -->|Scrape| API
    
    HOST_WEB -.->|Mount| NGINX_VOL
    HOST_API -.->|Mount| API_CODE
    HOST_DB -.->|Init SQL| DB_VOL
    
    style NGINX fill:#64b5f6
    style API fill:#ffb74d
    style DB fill:#ba68c8
    style GRAF fill:#4db6ac
    style PROM fill:#ff8a65
```

---

## 3. シーケンス図（機能） (Sequence Diagram for Functional Flow)

**説明**: 出荷指示から検品完了までの主要な機能フローを示します。

```mermaid
sequenceDiagram
    participant U as 出荷担当者
    participant W as Webフロントエンド
    participant N as nginx
    participant A as Node.js API
    participant D as PostgreSQL DB
    participant Q as QRスキャナー
    participant O as AWS Textract

    Note over U,D: 1. 出荷指示照会
    U->>W: 出荷指示一覧画面表示
    W->>N: GET /api/shipping-instructions?status=pending
    N->>A: プロキシ転送
    A->>D: SELECT from shipping_instructions
    D-->>A: 出荷指示データ
    A-->>N: JSON Response
    N-->>W: データ返却
    W-->>U: 出荷指示一覧表示

    Note over U,D: 2. 製品同梱物確認
    U->>W: 出荷指示詳細選択
    W->>A: GET /api/shipping-instructions/{id}/components
    A->>D: SELECT from product_components
    D-->>A: 同梱物リスト
    A-->>W: 同梱物データ
    W-->>U: 検品チェックリスト表示

    Note over U,O: 3. QR検品実施
    U->>Q: QR検品開始
    Q->>A: POST /api/qr-inspections
    A->>D: INSERT INTO qr_inspections
    D-->>A: inspection_id
    A-->>Q: 検品セッション作成
    
    loop 各同梱物をスキャン
        U->>Q: QRコードスキャン
        Q->>A: POST /api/qr-inspections/{id}/scan
        A->>D: SELECT component + INSERT detail
        D-->>A: スキャン結果
        A-->>Q: スキャン成功/エラー
        Q-->>U: リアルタイムフィードバック
    end
    
    U->>Q: 検品完了ボタン
    Q->>A: PATCH /api/qr-inspections/{id}/complete
    A->>D: UPDATE qr_inspections + inventory
    D-->>A: 完了確認
    A-->>Q: 検品結果
    Q-->>U: 検品完了通知

    Note over U,O: 4. OCR機能（オプション）
    U->>W: AI-OCR画面
    W->>W: 画像アップロード
    W->>A: POST /api/ocr/textract (base64画像)
    A->>O: DetectDocumentText / AnalyzeDocument
    O-->>A: 抽出テキスト + 信頼度
    A-->>W: OCR結果 + テーブル/フォーム
    W-->>U: テキスト表示
```

---

## 4. シーケンス図（ユーザー操作） (Sequence Diagram for User Operations)

**説明**: ユーザーが実行する典型的な操作フローを示します。

```mermaid
sequenceDiagram
    participant 担当者 as 検品担当者
    participant Browser as ブラウザ
    participant UI as UI Components
    participant API as REST API
    participant DB as Database

    Note over 担当者,DB: ログイン・初期画面表示
    担当者->>Browser: システムURL入力
    Browser->>UI: index.html読み込み
    UI->>API: GET /api/health
    API-->>UI: システム状態OK
    UI->>API: GET /reports/dashboard-stats
    API->>DB: 統計データ取得
    DB-->>API: KPIデータ
    API-->>UI: ダッシュボードデータ
    UI-->>担当者: ダッシュボード表示

    Note over 担当者,DB: 出荷指示検索・選択
    担当者->>UI: 出荷指示メニュー選択
    UI->>API: GET /api/shipping-instructions
    API->>DB: WHERE status='pending'
    DB-->>API: 未処理出荷指示リスト
    API-->>UI: 出荷指示配列
    UI-->>担当者: 一覧テーブル表示
    
    担当者->>UI: 特定の出荷指示をクリック
    UI->>API: GET /api/shipping-instructions/{id}
    API->>DB: 詳細情報取得
    DB-->>API: 出荷指示詳細
    API-->>UI: 詳細データ
    UI-->>担当者: モーダルで詳細表示

    Note over 担当者,DB: QR検品実行
    担当者->>UI: QR検品画面遷移
    UI->>API: GET /api/shipping-instructions/{id}/components
    API->>DB: 同梱物マスタ取得
    DB-->>API: 必須同梱物リスト
    API-->>UI: チェックリストデータ
    UI-->>担当者: 検品チェックリスト表示
    
    担当者->>UI: 検品開始ボタン
    UI->>API: POST /api/qr-inspections
    API->>DB: INSERT検品レコード
    DB-->>API: inspection_id
    API-->>UI: 検品セッション開始
    
    loop 同梱物スキャン
        担当者->>UI: QRコードをカメラでスキャン
        UI->>UI: html5-qrcodeライブラリ処理
        UI->>API: POST /api/qr-inspections/{id}/scan
        API->>DB: スキャン記録保存
        DB-->>API: OK/NG
        alt 正常スキャン
            API-->>UI: status: success
            UI-->>担当者: ✓チェック表示 + 音声フィードバック
        else エラー
            API-->>UI: status: error
            UI-->>担当者: ❌エラーメッセージ表示
        end
    end
    
    担当者->>UI: 検品完了ボタン
    UI->>API: PATCH /api/qr-inspections/{id}/complete
    API->>DB: UPDATE status + inventory
    DB-->>API: 完了
    API-->>UI: 検品結果
    UI-->>担当者: 完了画面 + 次の出荷指示候補

    Note over 担当者,DB: OCR機能利用
    担当者->>UI: OCR画面
    担当者->>Browser: 伝票画像アップロード
    Browser->>UI: File input処理
    UI->>UI: 画像プレビュー表示
    担当者->>UI: OCRエンジン選択（Textract推奨）
    担当者->>UI: OCR実行ボタン
    UI->>API: POST /api/ocr/textract (base64画像)
    API->>API: AWS SDK初期化
    API->>外部: AWS Textract DetectDocumentText
    外部-->>API: テキストブロック + 信頼度
    API-->>UI: 抽出結果JSON
    UI-->>担当者: テキスト表示 + 信頼度表示
```

---

## 5. クラス図 (Class Diagram)

**説明**: システムの主要エンティティとその関係を示します。

※情報が足りないため一部想定で記載

```mermaid
classDiagram
    class Product {
        +int id
        +string product_code
        +string product_name
        +string description
        +decimal unit_price
        +string category
        +timestamp created_at
        +timestamp updated_at
        +getComponents() ProductComponent[]
        +getCurrentStock() int
    }
    
    class ProductComponent {
        +int id
        +int product_id
        +string component_type
        +string component_name
        +string qr_code
        +boolean is_required
        +timestamp created_at
        +validateQRCode(code) boolean
    }
    
    class ShippingInstruction {
        +int id
        +string instruction_id
        +int product_id
        +int quantity
        +date shipping_date
        +int shipping_location_id
        +int delivery_location_id
        +string customer_name
        +string priority
        +string status
        +string tracking_number
        +string notes
        +timestamp created_at
        +updateStatus(status) void
        +getComponents() ProductComponent[]
    }
    
    class ShippingLocation {
        +int id
        +string location_code
        +string location_name
        +string address
        +string phone
        +string contact_person
    }
    
    class DeliveryLocation {
        +int id
        +string location_code
        +string location_name
        +string address
        +string phone
        +string contact_person
        +string delivery_method
    }
    
    class QRInspection {
        +int id
        +int shipping_instruction_id
        +string inspector_name
        +int product_id
        +int total_components
        +int scanned_components
        +int passed_quantity
        +int current_stock_before
        +int current_stock_after
        +string status
        +string notes
        +timestamp completed_at
        +startInspection() void
        +scanQRCode(qr_code) boolean
        +complete() void
    }
    
    class QRInspectionDetail {
        +int id
        +int qr_inspection_id
        +int product_component_id
        +string qr_code
        +timestamp scanned_at
        +string status
        +string error_message
        +validate() boolean
    }
    
    class Inventory {
        +int id
        +int product_id
        +int current_stock
        +int reserved_stock
        +int available_stock
        +string location
        +timestamp last_updated
        +updateStock(quantity) void
        +reserveStock(quantity) boolean
        +releaseStock(quantity) void
    }
    
    class ShippingInspection {
        +int id
        +int shipping_instruction_id
        +string inspector_name
        +timestamp inspection_date
        +int inspected_quantity
        +int passed_quantity
        +int failed_quantity
        +string defect_details
        +string packaging_condition
        +boolean label_check
        +boolean documentation_check
        +boolean final_approval
        +string notes
        +approve() void
    }
    
    class ProductionPlan {
        +int id
        +string plan_id
        +int product_id
        +int planned_quantity
        +date planned_start_date
        +date planned_end_date
        +string status
        +updateProgress() void
    }
    
    class ProductionRecord {
        +int id
        +int plan_id
        +int product_id
        +int produced_quantity
        +date production_date
        +string worker_name
        +string shift
        +string quality_grade
        +string notes
        +recordProduction() void
    }
    
    %% リレーション
    Product "1" --> "*" ProductComponent : has
    Product "1" --> "*" ShippingInstruction : ordered in
    Product "1" --> "1" Inventory : tracks
    Product "1" --> "*" ProductionPlan : planned
    Product "1" --> "*" ProductionRecord : produced
    
    ShippingInstruction "*" --> "1" ShippingLocation : ships from
    ShippingInstruction "*" --> "1" DeliveryLocation : delivers to
    ShippingInstruction "1" --> "*" QRInspection : inspected by
    ShippingInstruction "1" --> "*" ShippingInspection : inspected
    
    QRInspection "1" --> "*" QRInspectionDetail : contains
    QRInspectionDetail "*" --> "1" ProductComponent : scans
    
    ProductionPlan "1" --> "*" ProductionRecord : executed
```

---

## 6. コンポーネント関連図 (Component Diagram)

**説明**: システムのソフトウェアコンポーネントとその依存関係を示します。

```mermaid
graph TB
    subgraph "Frontend Components"
        HTML_INDEX["index.html<br/>メイン画面"]
        QR_HTML_INSPECTION["qr-inspection.html<br/>QR検品画面"]
        OCR_HTML_AI["ocr.html<br/>AI-OCR画面"]
        APP_JS_MAIN["app.js<br/>メインロジック"]
        QR_JS_SCANNER["qr-scanner.js<br/>QRスキャナー<br/>html5-qrcode"]
        DEVICE_JS_MODE["device-mode.js<br/>デバイス対応"]
        MAP_JS_DELIVERY["delivery-map.js<br/>配送マップ"]
        INV_JS_MANAGER["inventory-manager.js<br/>在庫管理"]
        CSS_STYLES["styles.css<br/>スタイルシート"]
    end

    subgraph "Backend Components"
        SERVER_JS_ENTRY["server.js<br/>Expressサーバー<br/>エントリポイント"]

        subgraph "Routes"
            OCR_ROUTE_API["routes/ocr.js<br/>OCR APIルート"]
        end

        subgraph "Services"
            TEXTRACT_SERVICE["services/textract.js<br/>AWS Textract Service"]
        end

        subgraph "Middleware"
            HELMET_MW["helmet<br/>セキュリティ"]
            CORS_MW["cors<br/>CORS設定"]
            RATE_LIMIT_MW["rate-limit<br/>レート制限"]
            LOGGER_MW["winston<br/>ロギング"]
        end
    end

    subgraph "Database Layer"
        PG_POOL_DB["pg Pool<br/>コネクションプール"]
        DB_SCHEMA_PROD["Database Schema<br/>products, shipping_instructions<br/>qr_inspections, inventory"]
    end

    subgraph "External Dependencies"
        AWS_SDK_CLIENT["@aws-sdk/client-textract<br/>AWS SDK"]
        EXPRESS_FW["Express Framework"]
        JOI_VALIDATION["Joi Validation"]
        HTML5_QR_LIB["html5-qrcode Library"]
    end

    HTML_INDEX --> APP_JS_MAIN
    QR_HTML_INSPECTION --> QR_JS_SCANNER
    OCR_HTML_AI --> APP_JS_MAIN
    APP_JS_MAIN --> MAP_JS_DELIVERY
    APP_JS_MAIN --> INV_JS_MANAGER
    APP_JS_MAIN --> DEVICE_JS_MODE
    QR_JS_SCANNER --> HTML5_QR_LIB

    APP_JS_MAIN --> SERVER_JS_ENTRY
    QR_JS_SCANNER --> SERVER_JS_ENTRY
    SERVER_JS_ENTRY --> HELMET_MW
    SERVER_JS_ENTRY --> CORS_MW
    SERVER_JS_ENTRY --> RATE_LIMIT_MW
    SERVER_JS_ENTRY --> LOGGER_MW
    SERVER_JS_ENTRY --> OCR_ROUTE_API
    SERVER_JS_ENTRY --> PG_POOL_DB
    OCR_ROUTE_API --> TEXTRACT_SERVICE
    TEXTRACT_SERVICE --> AWS_SDK_CLIENT
    SERVER_JS_ENTRY --> EXPRESS_FW
    SERVER_JS_ENTRY --> JOI_VALIDATION
    PG_POOL_DB --> DB_SCHEMA_PROD

    style HTML_INDEX fill:#e3f2fd
    style SERVER_JS_ENTRY fill:#fff3e0
    style PG_POOL_DB fill:#f3e5f5
    style AWS_SDK_CLIENT fill:#fff9c4
```

---

## 7. データフロー図 (Data Flow Diagram)

**説明**: システム内のデータの流れと変換を示します。

```mermaid
graph LR
    subgraph "入力"
        USER[ユーザー入力]
        QR_SCAN[QRコードスキャン]
        IMAGE[画像アップロード]
    end
    
    subgraph "処理層1: フロントエンド"
        UI[UI Components]
        VALIDATE[入力バリデーション]
        FORMAT[データフォーマット]
    end
    
    subgraph "処理層2: API Gateway"
        NGINX_PROC[nginx<br/>ルーティング<br/>ロードバランシング]
    end
    
    subgraph "処理層3: アプリケーションロジック"
        AUTH[認証・認可<br/>※未実装想定]
        BUSINESS[ビジネスロジック<br/>検品処理<br/>在庫更新<br/>ステータス管理]
        OCR_PROC[OCR処理<br/>画像→テキスト変換]
        QR_PROC[QR検品処理<br/>スキャン記録<br/>同梱物照合]
    end
    
    subgraph "処理層4: データアクセス"
        QUERY[SQLクエリ生成]
        TRANSACTION[トランザクション管理]
    end
    
    subgraph "データストア"
        DB_READ[(読み取り<br/>products<br/>shipping_instructions<br/>product_components)]
        DB_WRITE[(書き込み<br/>qr_inspections<br/>qr_inspection_details<br/>inventory)]
    end
    
    subgraph "外部システム"
        AWS_API[AWS Textract API]
    end
    
    subgraph "出力"
        RESPONSE[APIレスポンス]
        UI_UPDATE[UI更新]
        NOTIFICATION[通知<br/>アラート]
    end
    
    USER --> UI
    QR_SCAN --> UI
    IMAGE --> UI
    
    UI --> VALIDATE --> FORMAT
    FORMAT --> NGINX_PROC
    
    NGINX_PROC --> AUTH
    AUTH --> BUSINESS
    AUTH --> OCR_PROC
    AUTH --> QR_PROC
    
    BUSINESS --> QUERY
    OCR_PROC --> |base64 image| AWS_API
    QR_PROC --> QUERY
    
    AWS_API --> |extracted text| OCR_PROC
    
    QUERY --> TRANSACTION
    TRANSACTION --> DB_READ
    TRANSACTION --> DB_WRITE
    
    DB_READ --> QUERY
    DB_WRITE --> TRANSACTION
    
    TRANSACTION --> BUSINESS
    BUSINESS --> RESPONSE
    OCR_PROC --> RESPONSE
    QR_PROC --> RESPONSE
    
    RESPONSE --> NGINX_PROC
    NGINX_PROC --> UI_UPDATE
    UI_UPDATE --> NOTIFICATION
    
    style USER fill:#e1f5ff
    style DB_READ fill:#f3e5f5
    style DB_WRITE fill:#ffebee
    style AWS_API fill:#fff9c4
    style RESPONSE fill:#e8f5e9
```

---

## 8. 配置図 (Deployment Diagram)

**説明**: 本番環境におけるシステムの物理的配置とネットワーク構成を示します。

```mermaid
graph TB
    subgraph "インターネット"
        CLIENT[クライアント<br/>ブラウザ<br/>PC/タブレット/スマホ]
    end
    
    subgraph "AWS Cloud / EC2 Instance"
        subgraph "Docker Host: 57.180.82.161"
            subgraph "Docker Network: production-network"
                NGINX_CONTAINER[Container: production-nginx<br/>nginx:alpine<br/>Port: 80, 443]
                API_CONTAINER[Container: production-api<br/>node:18-alpine<br/>Port: 3000<br/>Logging: 10MB x 5 files]
                DB_CONTAINER[Container: production-postgres<br/>postgres:15-alpine<br/>Port: 5432<br/>Logging: 10MB x 3 files]
                GRAF_CONTAINER[Container: grafana<br/>grafana/grafana:latest<br/>Profile: monitoring]
                PROM_CONTAINER[Container: prometheus<br/>prom/prometheus:latest<br/>Profile: monitoring]
            end
            
            subgraph "Volumes"
                PG_VOL[(postgres-data<br/>永続ボリューム)]
                GRAF_VOL[(grafana-storage<br/>永続ボリューム)]
                PROM_VOL[(prometheus-storage<br/>永続ボリューム)]
            end
            
            subgraph "Host Filesystem"
                WEB_DIR[/var/www/html/web/<br/>静的ファイル]
                API_DIR[/var/www/html/api/<br/>Node.jsコード]
                DB_INIT[/var/www/html/postgres/init/<br/>初期化SQL]
                NGINX_CONF[/var/www/html/nginx/conf.d/<br/>nginx設定]
                ENV_FILE[/var/www/html/api/.env<br/>AWS認証情報]
            end
        end
        
        subgraph "Management"
            SSH[SSH Access<br/>production-management-key.pem<br/>ec2-user]
        end
    end
    
    subgraph "AWS Services"
        TEXTRACT[AWS Textract<br/>ap-northeast-1<br/>OCR API]
        IAM[AWS IAM<br/>Access Key:<br/>AKIAVMNN5F7FQOZ6WMYU]
    end
    
    subgraph "Version Control"
        GITHUB[GitHub Repository<br/>ytsutsumi30/grafana-setup<br/>Branch: main]
    end
    
    CLIENT -->|HTTPS/HTTP| NGINX_CONTAINER
    NGINX_CONTAINER -->|Port 3000| API_CONTAINER
    API_CONTAINER -->|Port 5432| DB_CONTAINER
    API_CONTAINER -->|AWS SDK| TEXTRACT
    
    DB_CONTAINER --> PG_VOL
    GRAF_CONTAINER --> GRAF_VOL
    PROM_CONTAINER --> PROM_VOL
    
    WEB_DIR -.->|Mount| NGINX_CONTAINER
    API_DIR -.->|Mount| API_CONTAINER
    DB_INIT -.->|Init| DB_CONTAINER
    NGINX_CONF -.->|Config| NGINX_CONTAINER
    ENV_FILE -.->|env_file| API_CONTAINER
    
    TEXTRACT -->|認証| IAM
    
    SSH -.->|デプロイ<br/>管理| Docker Host
    GITHUB -.->|git pull<br/>rsync| Docker Host
    
    style CLIENT fill:#e1f5ff
    style NGINX_CONTAINER fill:#64b5f6
    style API_CONTAINER fill:#ffb74d
    style DB_CONTAINER fill:#ba68c8
    style TEXTRACT fill:#fff9c4
    style GITHUB fill:#81c784
```

---

## 9. Supplementary Diagram: ERD (Entity Relationship Diagram)

**説明**: データベースのテーブル構造とリレーションシップを詳細に示します。

```mermaid
erDiagram
    PRODUCTS ||--o{ PRODUCT_COMPONENTS : "has"
    PRODUCTS ||--o{ SHIPPING_INSTRUCTIONS : "ordered_in"
    PRODUCTS ||--o{ PRODUCTION_PLANS : "planned"
    PRODUCTS ||--o{ PRODUCTION_RECORDS : "produced"
    PRODUCTS ||--o| INVENTORY : "tracks"
    
    SHIPPING_INSTRUCTIONS }o--|| SHIPPING_LOCATIONS : "ships_from"
    SHIPPING_INSTRUCTIONS }o--|| DELIVERY_LOCATIONS : "delivers_to"
    SHIPPING_INSTRUCTIONS ||--o{ QR_INSPECTIONS : "inspected_by_qr"
    SHIPPING_INSTRUCTIONS ||--o{ SHIPPING_INSPECTIONS : "inspected"
    
    QR_INSPECTIONS ||--o{ QR_INSPECTION_DETAILS : "contains"
    QR_INSPECTION_DETAILS }o--|| PRODUCT_COMPONENTS : "scans"
    
    PRODUCTION_PLANS ||--o{ PRODUCTION_RECORDS : "executed"
    PRODUCTION_RECORDS ||--o{ INSPECTIONS : "inspected"
    
    PRODUCTS {
        int id PK
        string product_code UK
        string product_name
        text description
        decimal unit_price
        string category
        timestamp created_at
        timestamp updated_at
    }
    
    PRODUCT_COMPONENTS {
        int id PK
        int product_id FK
        string component_type
        string component_name
        string qr_code UK
        boolean is_required
        timestamp created_at
        timestamp updated_at
    }
    
    SHIPPING_INSTRUCTIONS {
        int id PK
        string instruction_id UK
        int product_id FK
        int quantity
        date shipping_date
        int shipping_location_id FK
        int delivery_location_id FK
        string customer_name
        string priority
        string status
        string tracking_number
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    SHIPPING_LOCATIONS {
        int id PK
        string location_code UK
        string location_name
        string address
        string phone
        string contact_person
        timestamp created_at
    }
    
    DELIVERY_LOCATIONS {
        int id PK
        string location_code UK
        string location_name
        string address
        string phone
        string contact_person
        string delivery_method
        timestamp created_at
    }
    
    QR_INSPECTIONS {
        int id PK
        int shipping_instruction_id FK
        string inspector_name
        int product_id FK
        int total_components
        int scanned_components
        int passed_quantity
        int current_stock_before
        int current_stock_after
        string status
        text notes
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }
    
    QR_INSPECTION_DETAILS {
        int id PK
        int qr_inspection_id FK
        int product_component_id FK
        string qr_code
        timestamp scanned_at
        string status
        text error_message
    }
    
    INVENTORY {
        int id PK
        int product_id FK
        int current_stock
        int reserved_stock
        int available_stock "GENERATED"
        string location
        timestamp last_updated
    }
    
    SHIPPING_INSPECTIONS {
        int id PK
        int shipping_instruction_id FK
        string inspector_name
        timestamp inspection_date
        int inspected_quantity
        int passed_quantity
        int failed_quantity
        text defect_details
        string packaging_condition
        boolean label_check
        boolean documentation_check
        boolean final_approval
        text notes
    }
    
    PRODUCTION_PLANS {
        int id PK
        string plan_id UK
        int product_id FK
        int planned_quantity
        date planned_start_date
        date planned_end_date
        string status
        timestamp created_at
        timestamp updated_at
    }
    
    PRODUCTION_RECORDS {
        int id PK
        int plan_id FK
        int product_id FK
        int produced_quantity
        date production_date
        string worker_name
        string shift
        string quality_grade
        text notes
        timestamp created_at
    }
    
    INSPECTIONS {
        int id PK
        int production_record_id FK
        string inspector_name
        timestamp inspection_date
        string inspection_type
        int passed_quantity
        int failed_quantity
        text defect_details
        string status
        text notes
    }
```

---

## 10. テーブルと画面項目のマッピング資料 (Mapping Diagram of IDO and Fields)

### 10.1 出荷指示一覧画面 (index.html)

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 出荷指示ID | shipping_instructions | instruction_id | VARCHAR(50) | ○ | 一意識別子 |
| 製品コード | products | product_code | VARCHAR(50) | ○ | JOINで取得 |
| 製品名 | products | product_name | VARCHAR(255) | ○ | JOINで取得 |
| 数量 | shipping_instructions | quantity | INTEGER | ○ | - |
| 出荷日 | shipping_instructions | shipping_date | DATE | ○ | - |
| 顧客名 | shipping_instructions | customer_name | VARCHAR(255) | ○ | - |
| 優先度 | shipping_instructions | priority | VARCHAR(20) | ○ | high/normal/low |
| ステータス | shipping_instructions | status | VARCHAR(20) | ○ | pending/processing/shipped/delivered |
| 出荷場所名 | shipping_locations | location_name | VARCHAR(255) | ○ | JOINで取得 |
| 納入場所名 | delivery_locations | location_name | VARCHAR(255) | ○ | JOINで取得 |
| 納入先住所 | delivery_locations | address | VARCHAR(500) | - | JOINで取得 |
| 納入先電話 | delivery_locations | phone | VARCHAR(20) | - | JOINで取得 |
| 備考 | shipping_instructions | notes | TEXT | - | - |

**取得API**: `GET /api/shipping-instructions?status={status}`

---

### 10.2 QR検品画面 (qr-inspection.html)

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 出荷指示ID | shipping_instructions | instruction_id | VARCHAR(50) | ○ | 検品対象 |
| 製品名 | products | product_name | VARCHAR(255) | ○ | - |
| 出荷数量 | shipping_instructions | quantity | INTEGER | ○ | - |
| 検品担当者 | qr_inspections | inspector_name | VARCHAR(100) | ○ | ユーザー入力 |
| 同梱物名 | product_components | component_name | VARCHAR(255) | ○ | チェックリスト |
| 同梱物タイプ | product_components | component_type | VARCHAR(50) | ○ | main/accessory/manual/warranty |
| QRコード | product_components | qr_code | VARCHAR(255) | ○ | スキャン対象 |
| 必須フラグ | product_components | is_required | BOOLEAN | ○ | 検品必須判定 |
| 総同梱物数 | qr_inspections | total_components | INTEGER | ○ | カウント |
| スキャン済数 | qr_inspections | scanned_components | INTEGER | ○ | 進捗表示 |
| 検品ステータス | qr_inspections | status | VARCHAR(50) | ○ | in_progress/completed/failed |
| スキャン時刻 | qr_inspection_details | scanned_at | TIMESTAMP | ○ | 各スキャン記録 |
| エラーメッセージ | qr_inspection_details | error_message | TEXT | - | スキャンエラー時 |
| 合格数量 | qr_inspections | passed_quantity | INTEGER | - | 完了時設定 |
| 検品前在庫 | qr_inspections | current_stock_before | INTEGER | - | 在庫スナップショット |
| 検品後在庫 | qr_inspections | current_stock_after | INTEGER | - | 在庫更新後 |
| 備考 | qr_inspections | notes | TEXT | - | 検品コメント |

**取得API**: 
- `GET /api/shipping-instructions/{id}/components` - 同梱物リスト
- `POST /api/qr-inspections` - 検品開始
- `POST /api/qr-inspections/{id}/scan` - QRスキャン
- `PATCH /api/qr-inspections/{id}/complete` - 検品完了

---

### 10.3 AI-OCR画面 (ocr.html)

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 画像データ | - | - | base64 | ○ | 送信時のみ、DB保存なし |
| OCRエンジン | - | - | string | ○ | "textract"固定 |
| 抽出テキスト | - | - | string | - | レスポンスのみ |
| 信頼度 | - | - | decimal | - | AWS Textractの信頼度 |
| テキスト行 | - | - | array | - | 行単位のテキスト |
| テーブルデータ | - | - | array | - | 表認識結果 |
| フォームデータ | - | - | object | - | Key-Valueペア |

**取得API**: 
- `POST /api/ocr/textract` - 基本OCR
- `POST /api/ocr/textract/analyze` - 表・フォーム認識
- `GET /api/ocr/health` - サービス状態確認

**備考**: OCR結果はデータベースに保存されず、リアルタイム処理のみ

---

### 10.4 在庫管理画面（想定）

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 製品コード | products | product_code | VARCHAR(50) | ○ | - |
| 製品名 | products | product_name | VARCHAR(255) | ○ | - |
| 現在在庫 | inventory | current_stock | INTEGER | ○ | - |
| 引当在庫 | inventory | reserved_stock | INTEGER | ○ | - |
| 利用可能在庫 | inventory | available_stock | INTEGER | ○ | 計算列: current_stock - reserved_stock |
| 保管場所 | inventory | location | VARCHAR(100) | - | - |
| 最終更新日時 | inventory | last_updated | TIMESTAMP | ○ | - |
| 単価 | products | unit_price | DECIMAL(10,2) | - | - |
| カテゴリ | products | category | VARCHAR(100) | - | - |

**取得API**: `GET /api/products` (在庫情報含む)

---

### 10.5 ダッシュボード統計画面

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 出荷指示ステータス別件数 | shipping_instructions | status, COUNT(*) | - | ○ | GROUP BY status |
| 総検品数 | shipping_inspections | COUNT(*) | INTEGER | ○ | 30日間集計 |
| 承認済検品数 | shipping_inspections | SUM(final_approval) | INTEGER | ○ | 30日間集計 |
| 合格率 | shipping_inspections | AVG(passed/inspected) | DECIMAL | ○ | 30日間集計 |
| 総製品数 | inventory | COUNT(*) | INTEGER | ○ | - |
| 総在庫数 | inventory | SUM(current_stock) | INTEGER | ○ | - |
| 利用可能在庫数 | inventory | SUM(available_stock) | INTEGER | ○ | - |

**取得API**: `GET /api/reports/dashboard-stats`

---

### 10.6 出荷検品詳細画面（従来型検品）

| 画面項目 | テーブル | カラム | データ型 | 必須 | 備考 |
|---------|---------|--------|---------|------|------|
| 出荷指示ID | shipping_instructions | instruction_id | VARCHAR(50) | ○ | - |
| 検品担当者 | shipping_inspections | inspector_name | VARCHAR(100) | ○ | ユーザー入力 |
| 検品日時 | shipping_inspections | inspection_date | TIMESTAMP | ○ | デフォルト現在時刻 |
| 検品数量 | shipping_inspections | inspected_quantity | INTEGER | ○ | ユーザー入力 |
| 合格数量 | shipping_inspections | passed_quantity | INTEGER | ○ | ユーザー入力 |
| 不良数量 | shipping_inspections | failed_quantity | INTEGER | - | デフォルト0 |
| 不良詳細 | shipping_inspections | defect_details | TEXT | - | ユーザー入力 |
| 梱包状態 | shipping_inspections | packaging_condition | VARCHAR(50) | - | ユーザー入力 |
| ラベル確認 | shipping_inspections | label_check | BOOLEAN | - | チェックボックス |
| 書類確認 | shipping_inspections | documentation_check | BOOLEAN | - | チェックボックス |
| 最終承認 | shipping_inspections | final_approval | BOOLEAN | - | チェックボックス |
| 備考 | shipping_inspections | notes | TEXT | - | ユーザー入力 |

**取得API**: 
- `GET /api/shipping-inspections?shipping_instruction_id={id}`
- `POST /api/shipping-inspections` - 検品記録作成

---

### 10.7 マッピングサマリー

| 画面 | 主要テーブル | 関連テーブル数 | CRUD操作 |
|------|-------------|--------------|---------|
| 出荷指示一覧 | shipping_instructions | 3 (products, shipping_locations, delivery_locations) | R |
| QR検品画面 | qr_inspections | 4 (shipping_instructions, products, product_components, inventory) | C, R, U |
| AI-OCR画面 | なし（外部API） | 0 | - |
| 在庫管理画面 | inventory | 1 (products) | R |
| ダッシュボード | shipping_instructions, shipping_inspections, inventory | 3 | R |
| 出荷検品詳細 | shipping_inspections | 1 (shipping_instructions) | C, R |

---

## 自己検証

✅ **完了した図**:
1. System Diagram - システム全体構成を可視化 ✓
2. Architecture Diagram - Docker構成と3層アーキテクチャを図示 ✓
3. Sequence Diagram (Functional Flow) - 出荷指示～検品完了の機能フローを記載 ✓
4. Sequence Diagram (User Operations) - ユーザー操作の詳細フローを記載 ✓
5. Class Diagram - 主要エンティティとリレーションを記載 ✓
6. Component Diagram - フロントエンド/バックエンド/外部依存を図示 ✓
7. Data Flow Diagram - データの流れと処理層を可視化 ✓
8. Deployment Diagram - AWS EC2デプロイ構成を詳細に記載 ✓
9. Supplementary Diagram (ERD) - データベーステーブル構造を詳細化 ✓
10. テーブルと画面項目のマッピング資料 - 6画面分のマッピング表を作成 ✓

全ての要求された図と資料を作成完了しました。mermaid記法を使用し、プロジェクトの実際のコード（server.js、SQL、docker-compose.yml等）から情報を抽出して正確に反映しています。
