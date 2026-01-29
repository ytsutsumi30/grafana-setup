# AI Agent プロンプト集
## AWSインフラ構築～ホスティング自動化ガイド

本ドキュメントは、AI Agent（Claude、ChatGPT等）に投入するべきプロンプトをSTEP BY STEPで記載しています。各STEPを順序通り実行することで、エンドツーエンドのAWSインフラ構築が自動化されます。

---

## **STEP 1: Terraform基盤コード生成**

### 📝 プロンプト

```
以下の仕様に基づいて、AWS用のTerraformコード（Infrastructure as Code）を生成してください：

【プロジェクト情報】
- プロジェクト名: 生産管理システム
- クラウド: AWS
- リージョン: ap-northeast-1 (東京)
- 環境: production

【構築対象のAWSリソース】
1. VPC（Virtual Private Cloud）
   - CIDR: 10.0.0.0/16
   - パブリックサブネット × 2（異なるAZ）
   - プライベートサブネット × 2（異なるAZ）

2. EC2インスタンス
   - インスタンスタイプ: t3.medium
   - AMI: Amazon Linux 2
   - 台数: 1台（オートスケーリング対応）
   - ボリュームサイズ: 100GB

3. RDS PostgreSQL
   - バージョン: 15
   - インスタンスクラス: db.t3.small
   - マルチAZ: 有効
   - 自動バックアップ: 30日間
   - ストレージ: 100GB

4. Application Load Balancer (ALB)
   - HTTP (80)とHTTPS (443)をリッスン
   - ターゲットグループ: EC2

5. Route 53
   - DNS管理
   - ドメイン: 別途指定

6. セキュリティグループ
   - EC2: HTTP/HTTPS/SSH許可
   - RDS: EC2からのみPG接続許可

7. IAM ロール
   - EC2: CloudWatch・S3アクセス権限

【ファイル構成】
- main.tf: メインリソース定義
- variables.tf: 変数定義
- outputs.tf: 出力値（IP、エンドポイント等）
- modules/vpc: VPCモジュール
- modules/ec2: EC2モジュール
- modules/rds: RDSモジュール
- modules/alb: ALBモジュール
- environments/production.tfvars: 本番環境値

【要件】
- Terraform バージョン: >= 1.0
- 環境変数による設定管理対応
- 本番環境で即使用可能な品質
- セキュリティベストプラクティス準拠
- リソースタグ（Environment, Project等）付与

【出力】
各ファイルの完全なコードを生成してください。
```

### ✅ 期待される出力

- `main.tf` - メインリソース定義
- `variables.tf` - 全変数定義
- `outputs.tf` - 出力値設定
- `modules/vpc/main.tf` - VPC構築
- `modules/ec2/main.tf` - EC2構築
- `modules/rds/main.tf` - RDS構築
- `modules/alb/main.tf` - ALB構築
- `environments/production.tfvars` - 本番値

### 🔍 チェックポイント

```
□ VPC構成（サブネット、ルートテーブル）が正確か
□ セキュリティグループ設定が最小権限か
□ IAM ロールに必要な権限があるか
□ タグが全リソースに付与されているか
□ 本番環境での可用性が確保されているか（Multi-AZ等）
□ バックアップ設定が有効か
```

---

## **STEP 2: AWS CLI デプロイスクリプト生成**

### 📝 プロンプト

```
STEP 1で生成したTerraformコードをAWS環境にデプロイするための、Bashシェルスクリプトを生成してください。

【スクリプト要件】
- ファイル名: aws-startup.sh
- 実行環境: Linux / macOS
- シェル: bash

【機能要件】
1. 前提条件チェック
   - Terraform インストール確認
   - AWS CLI インストール確認
   - AWS認証情報確認（aws sts get-caller-identity）

2. AWS設定初期化
   - AWS プロファイル設定
   - リージョン設定（ap-northeast-1）
   - 認証情報の検証

3. Terraformワークフロー
   - terraform init: 初期化
   - terraform plan: 実行計画確認（ファイル出力）
   - terraform apply: リソース作成
   - terraform output: 出力値表示

4. ポストデプロイ処理
   - EC2パブリックIP取得
   - RDS エンドポイント取得
   - ALB DNSネーム取得
   - セキュリティグループID取得

5. システム管理コマンド
   - start: AWS リソース起動
   - stop: AWS リソース停止
   - restart: 再起動
   - status: ステータス確認
   - destroy: 全削除（確認プロンプト付き）
   - logs: ログ表示
   - ssh: EC2 SSH接続
   - health: ヘルスチェック
   - backup: RDS バックアップ
   - upgrade: アプリケーション更新

【コード品質】
- エラーハンドリング（set -e）
- 詳細なログ出力（色付き）
- ユーザーフレンドリーなメッセージ
- リトライロジック
- バージョン情報表示

【使用例】

    ```bash
    ./aws-startup.sh deploy    # 新規デプロイ
    ./aws-startup.sh status    # ステータス確認
    ./aws-startup.sh logs      # ログ表示
    ./aws-startup.sh destroy   # 全削除
    ```

生成したコードはそのまま実行可能な品質でお願いします。
```

### ✅ 期待される出力

完全に動作するBashスクリプト:
- 前提条件チェック機能
- Terraformコマンド実行ロジック
- エラーハンドリング
- カラー付きログ出力
- 状態管理ファイル

### 🔍 チェックポイント

```
□ 実行パーミッション設定可能か（chmod +x）
□ エラー発生時に停止するか（set -e）
□ AWS CLI コマンドが正確か
□ Terraform コマンドが正確か
□ 出力形式が解析可能か（JSON等）
□ ドライラン（plan）で確認できるか
```

---

## **STEP 3: EC2 初期セットアップスクリプト生成**

### 📝 プロンプト

```
STEP 2でデプロイされたEC2インスタンスに対して、実行するセットアップスクリプトを生成してください。

【セットアップ対象】
- OS: Amazon Linux 2
- インスタンスタイプ: t3.medium

【インストール・設定項目】

1. システムパッケージ更新
   - yum更新
   - 依存パッケージのインストール

2. Node.js環境構築
   - Node.js 18.x LTS インストール
   - npm インストール
   - yarn インストール（オプション）

3. Docker環境構築
   - Docker インストール（Amazon ECR対応）
   - Docker Compose インストール（v2）
   - Docker デーモン自動起動設定

4. Git設定
   - Git インストール
   - SSH鍵生成（GitHub/Gitlabアクセス用）

5. SSL証明書設定
   - Certbot インストール
   - Let's Encrypt 証明書取得
   - 自動更新cron設定

6. Nginx インストール
   - Nginx インストール
   - 基本設定（リバースプロキシ）
   - systemd 自動起動設定

7. セキュリティ設定
   - firewalld 設定（80,443,3000,3001ポート開放）
   - SSH キーペア設定
   - sudo権限設定

8. ログ・監視設定
   - CloudWatch Logs Agent インストール
   - ログローテーション設定
   - 監視ユーザー（cloudwatch-agent）作成

9. ディレクトリ構成作成
   - /opt/app/ アプリケーションディレクトリ
   - /var/log/app/ ログディレクトリ
   - /home/ubuntu/.ssh/ SSH鍵ディレクトリ

【実行方法】

    ```bash
    # Terraform user_data内で実行、または
    chmod +x ec2-setup.sh
    ./ec2-setup.sh
    ```


【出力】
- ec2-setup.sh: メインセットアップスクリプト
- setup-ssl.sh: SSL証明書設定スクリプト
- 実行ログ自動保存

【要件】
- べき等性（複数回実行可能）
- エラーハンドリング完備
- インストール結果ログ記録
- バージョン出力
```

### ✅ 期待される出力

- `ec2-setup.sh` - メインセットアップスクリプト
- `setup-ssl.sh` - SSL設定スクリプト
- セットアップログファイル（自動保存）

### 🔍 チェックポイント

```
□ Amazon Linux 2での実行確認
□ すべてのパッケージが正常にインストールされるか
□ バージョン確認コマンドが正常に動作するか
□ パーミッション設定が正確か
□ SSL証明書が正常に取得できるか
□ セキュリティグループ設定と整合しているか
□ ログが適切に記録されるか
```

---

## **STEP 4: Docker Compose構成生成**

### 📝 プロンプト

```
マルチコンテナアプリケーション（生産管理システム）のdocker-compose.ymlを生成してください。

【コンテナ構成】

1. Nginx コンテナ
   - イメージ: nginx:alpine
   - ポート: 80, 443
   - ボリューム:
     - ./nginx/nginx.conf → /etc/nginx/nginx.conf
     - ./nginx/conf.d → /etc/nginx/conf.d
     - ./web → /usr/share/nginx/html
     - ./ssl → /etc/nginx/ssl
   - 依存関係: production-api
   - ネットワーク: production-network
   - ログ: JSON形式（10m, 3ファイル）

2. Node.js API サーバー
   - イメージ: node:18-alpine
   - コンテナ名: production-api
   - ポート: 3000
   - ボリューム:
     - ./api → /app
     - ./api/node_modules → /app/node_modules (キャッシュ)
   - 環境変数: .env ファイルから読込
   - リソース制限: CPU 1.0, メモリ 1G
   - ヘルスチェック: GET /health (30秒間隔)
   - ネットワーク: production-network

3. Grafana (監視ダッシュボード)
   - イメージ: grafana/grafana:latest
   - ポート: 3000 (内部)
   - ボリューム: grafana-storage
   - 環境変数:
     - GF_SECURITY_ADMIN_PASSWORD
     - GF_USERS_ALLOW_SIGN_UP=false
   - ネットワーク: production-network

4. Prometheus (メトリクス収集)
   - イメージ: prom/prometheus:latest
   - ポート: 9090
   - ボリューム:
     - ./prometheus/prometheus.yml → /etc/prometheus/prometheus.yml
     - prometheus-data → /prometheus
   - ネットワーク: production-network

5. PostgreSQL (ローカル開発用 - オプション)
   - 本番はRDS利用のため、コメントアウト推奨
   - イメージ: postgres:15-alpine
   - ポート: 5432
   - ボリューム: postgres-data

【ネットワーク】
- bridge ネットワーク: production-network

【ボリューム】
- grafana-storage
- prometheus-data
- postgres-data (オプション)

【起動ポリシー】
- restart: unless-stopped（コンテナ自動再起動）
- dependency: depends_on 正確に設定

【環境設定】
- .env ファイル参照
- シークレット情報は環境変数で管理

【ロギング】
全コンテナ:
- ドライバ: json-file
- オプション: max-size=10m, max-file=3

【使用例】

    ```bash
    docker-compose up -d          # バックグラウンド起動
    docker-compose ps             # 状態確認
    docker-compose logs -f        # ログ確認
    docker-compose down           # 停止・削除
    ```


出力ファイル: docker-compose.yml（そのまま実行可能）
```

### ✅ 期待される出力

完全なdocker-compose.yml:
- 全コンテナ定義
- ネットワーク・ボリューム設定
- 環境変数設定
- ログ設定
- ヘルスチェック設定

### 🔍 チェックポイント

```
□ ポート設定に競合がないか
□ ボリュームパスが正確か
□ 環境変数が全て定義されているか
□ 依存関係（depends_on）が正確か
□ リソース制限が適切か
□ ヘルスチェック設定が機能するか
□ ログドライバが正確か
```

---

## **STEP 5: Express.js APIサーバー実装**

### 📝 プロンプト

```
Node.js Express.jsを使用した、生産管理システムのRESTful APIサーバーを実装してください。

【プロジェクト情報】
- フレームワーク: Express.js 4.x
- 言語: JavaScript (Node.js 18.x)
- ポート: 3000
- 環境: production対応

【APIエンドポイント仕様】

1. ヘルスチェック
   - GET /health
   - レスポンス: { status: "ok", uptime: "..." }

2. 注文管理
   - GET /api/orders - 注文一覧取得
   - GET /api/orders/:id - 注文詳細取得
   - POST /api/orders - 注文作成
   - PUT /api/orders/:id - 注文更新
   - DELETE /api/orders/:id - 注文削除

3. OCR処理
   - POST /api/ocr - 基本OCR処理
   - POST /api/ocr/enhance - 拡張OCR処理
   - POST /api/ocr/ai - AI-based OCR処理
   - POST /api/ocr/feedback - OCR フィードバック

4. ユーザー管理
   - GET /api/users - ユーザー一覧
   - POST /api/users - ユーザー作成
   - PUT /api/users/:id - ユーザー更新
   - DELETE /api/users/:id - ユーザー削除

5. メトリクス
   - GET /metrics - Prometheus メトリクス形式

【実装要件】

1. セキュリティ
   - CORS 設定（オリジン指定）
   - Helmet.js: セキュリティヘッダー
   - Rate Limiting: DDoS対策（15分/100リクエスト）
   - 入力検証: Joi スキーマ
   - SQL Injection対策: Prepared Statement
   - 認証: JWT Token（オプション）

2. データベース
   - PostgreSQL 接続（pg ライブラリ）
   - コネクションプール設定
   - トランザクション管理
   - エラーハンドリング

3. ロギング
   - Winston ロギングライブラリ
   - ログレベル: info, warn, error
   - ログ出力: console + ファイル
   - リクエスト・レスポンスログ

4. エラーハンドリング
   - グローバルエラーハンドラ
   - HTTPステータスコード正確設定
   - エラーレスポンス統一形式
   - スタックトレース管理

5. 環境変数管理
   - dotenv ライブラリ使用
   - 本番/開発環境切り替え
   - シークレット情報保護

【package.json】
必須依存パッケージ:
- express: ^4.18.0
- cors: ^2.8.5
- helmet: ^7.0.0
- express-rate-limit: ^6.0.0
- pg: ^8.11.0
- joi: ^17.11.0
- winston: ^3.11.0
- dotenv: ^16.3.0

【ファイル構成】
api/
├─ server.js              # メインファイル
├─ package.json
├─ .env
├─ .env.example
├─ routes/
│  ├─ orders.js
│  ├─ ocr.js
│  ├─ users.js
│  └─ metrics.js
├─ middleware/
│  ├─ errorHandler.js
│  ├─ validation.js
│  └─ auth.js
├─ services/
│  ├─ orderService.js
│  ├─ ocrService.js
│  └─ userService.js
└─ config/
   ├─ database.js
   └─ logger.js
```

【実装要件詳細】
- エラーハンドリングで全パターンをカバー
- リクエスト検証が厳格
- ログ出力が詳細（トレーシング可能）
- データベースコネクション管理が適切
- 本番環境での動作確認済み品質

出力: api/server.js 他、全ファイル実装コード
```

### ✅ 期待される出力

- `api/server.js` - メインサーバー
- `api/package.json` - 依存パッケージ
- `api/routes/*.js` - APIエンドポイント
- `api/middleware/*.js` - ミドルウェア
- `api/services/*.js` - ビジネスロジック
- `api/config/*.js` - 設定ファイル

### 🔍 チェックポイント

□ 全エンドポイントが正確に実装されているか
□ エラーハンドリングが完備されているか
□ 入力検証が厳格か
□ ログ出力が詳細か
□ セキュリティ対策が施されているか
□ 環境変数管理が適切か
□ パッケージ.jsonが完全か
□ 本番環境での動作を想定しているか
```

---

## **STEP 6: Nginx リバースプロキシ設定**

### 📝 プロンプト

```
Express.jsサーバーの前段に配置する、Nginxのリバースプロキシ設定を生成してください。

【設定要件】

1. リバースプロキシ基本設定
   - アップストリーム: localhost:3000 (Express)
   - リッスンポート: 80, 443
   - ワーカープロセス: auto
   - キープアライブ接続: 有効

2. HTTPS/SSL設定
   - SSL証明書パス: /etc/nginx/ssl/cert.pem
   - SSL秘密鍵パス: /etc/nginx/ssl/key.pem
   - TLSバージョン: 1.2以上
   - 強力な暗号スイート設定
   - HSTS設定: max-age=31536000

3. ホスト設定
   - サーバー名: localhost, 127.0.0.1
   - ドメイン対応（複数ドメイン可能）

4. パフォーマンス最適化
   - gzip圧縮: 有効（JS, CSS, JSON）
   - キャッシング: Static fileに長期キャッシュ
   - バッファサイズ: 最適化
   - タイムアウト: 60秒

5. 静的ファイル配信
   - ドキュメントルート: /usr/share/nginx/html
   - インデックスファイル: index.html
   - キャッシュ有効期限: 1年（静的）
   - MIME タイプ設定

6. ロギング設定
   - アクセスログ: /var/log/nginx/access.log
   - エラーログ: /var/log/nginx/error.log
   - ログフォーマット: JSON形式（Grafana連携用）

7. セキュリティヘッダー
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block
   - Content-Security-Policy: 適切な設定

8. リダイレクト設定
   - HTTP → HTTPS リダイレクト
   - トレーリングスラッシュ正規化

【ファイル構成】

    ```
    nginx/
    ├─ nginx.conf           # メイン設定
    └─ conf.d/
    ├─ default.conf      # デフォルトサーバー
    └─ ssl.conf          # SSL設定
    ```
    

【使用例】
```bash
# 設定テスト
nginx -t

# リロード（再起動なし）
nginx -s reload

# 完全再起動
systemctl restart nginx
```

【要件】
- 本番環境対応
- セキュリティベストプラクティス準拠
- パフォーマンス最適化
- ログ分析可能な形式
- 複数ドメイン対応
```

### ✅ 期待される出力

- `nginx/nginx.conf` - メイン設定
- `nginx/conf.d/default.conf` - デフォルト設定
- `nginx/conf.d/ssl.conf` - SSL設定

### 🔍 チェックポイント

□ HTTP→HTTPSリダイレクトが正確か
□ SSL設定が正確か（証明書パス含む）
□ リバースプロキシ設定が正確か
□ gzip設定が有効か
□ ログ形式が正確か
□ セキュリティヘッダーが完備されているか
□ 静的ファイルキャッシュが設定されているか
□ 複数ドメイン対応が可能か
```

---

## **STEP 7: SSL証明書自動設定**

### 📝 プロンプト

```
Let's Encryptを使用したSSL証明書の自動取得・更新スクリプトを生成してください。

【スクリプト要件】

1. Certbot インストール
   - Certbot パッケージ: python3-certbot-nginx
   - インストール方法: apt/yum

2. Let's Encrypt 証明書取得
   - ドメイン: 環境変数で指定可能
   - 証明書タイプ: X.509 v3
   - RSA キーサイズ: 2048ビット以上
   - 有効期限: 90日

3. Nginx自動統合
   - Nginx の --certonly オプション
   - ssl_certificate 自動設定
   - 自動リロード

4. 自動更新設定
   - Cron ジョブ登録（cronTab）
   - 実行間隔: 毎月1日、15日
   - リニューアルチェック: 30日前

5. リニューアルテスト
   - certbot renew --dry-run
   - 動作確認後、本実行

6. エラーハンドリング
   - 取得失敗時の通知
   - ログ記録
   - リトライロジック

【スクリプト機能】

```bash
# 新規証明書取得
./setup-ssl.sh init

# 証明書更新（手動）
./setup-ssl.sh renew

# 自動更新設定
./setup-ssl.sh auto-renew

# 証明書情報表示
./setup-ssl.sh info

# 証明書状態確認
./setup-ssl.sh status
```

【環境変数】
```bash
DOMAIN=example.com
EMAIL=admin@example.com
CERT_PATH=/etc/nginx/ssl/cert.pem
KEY_PATH=/etc/nginx/ssl/key.pem
```

【ログ出力】
- Certbot ログ: /var/log/letsencrypt/
- スクリプトログ: /var/log/setup-ssl.log

【本番要件】
- 無停止での証明書更新
- 複数ドメイン対応
- ワイルドカード証明書対応
- エラー時の自動ロールバック
```

### ✅ 期待される出力

- `setup-ssl.sh` - SSL設定スクリプト
- Cron 設定例
- トラブルシューティングガイド

### 🔍 チェックポイント

□ Certbotが正常にインストールされるか
□ 証明書取得が自動化されているか
□ Nginxが自動更新対応か
□ Cron設定が正確か
□ ログが適切に記録されるか
□ ロールバックが機能するか
□ 複数ドメイン対応が可能か
```

---

## **STEP 8: 統合デプロイ・運用スクリプト生成**

### 📝 プロンプト

```
STEP 1～7で生成したすべてのコンポーネントを統合する、デプロイ・運用スクリプトを生成してください。

【スクリプト名】
- manage.sh - 統合管理スクリプト
- quick-deploy.sh - クイックデプロイ

【manage.sh 機能】

1. デプロイメント関連
   - ./manage.sh deploy - フルデプロイ（STEP1～8全実行）
   - ./manage.sh update - アプリケーション更新のみ
   - ./manage.sh rollback - 前回の状態に戻す

2. システム制御
   - ./manage.sh start - 全サービス起動
   - ./manage.sh stop - 全サービス停止
   - ./manage.sh restart - 再起動
   - ./manage.sh status - 詳細ステータス表示

3. 監視・ログ
   - ./manage.sh logs - リアルタイムログ表示
   - ./manage.sh health - ヘルスチェック（全コンポーネント）
   - ./manage.sh metrics - パフォーマンスメトリクス表示

4. バックアップ・復旧
   - ./manage.sh backup - データベース・設定バックアップ
   - ./manage.sh restore - バックアップから復旧
   - ./manage.sh list-backups - バックアップ一覧

5. アクセス・デバッグ
   - ./manage.sh ssh - EC2 SSH接続
   - ./manage.sh connect-db - RDS データベース接続
   - ./manage.sh debug - 詳細デバッグ情報出力

6. インフラ管理
   - ./manage.sh terraform-plan - Terraform計画表示
   - ./manage.sh terraform-apply - Terraform適用
   - ./manage.sh destroy - 全リソース削除（確認プロンプト）

7. 情報取得
   - ./manage.sh info - AWS リソース情報表示
   - ./manage.sh config - 現在の設定表示

【quick-deploy.sh 機能】
- 対話型で必要な設定を質問
- 最小限の入力でフルデプロイ実行
- 初心者向け簡易版

【内部処理】

```bash
# STEP 2のaws-startup.sh呼び出し
source ./aws-startup.sh

# STEP 3のec2-setup.sh呼び出し
ssh -i key.pem ubuntu@$EC2_IP 'bash -s' < ./ec2-setup.sh

# STEP 4のdocker-compose実行
docker-compose -f docker-compose.yml up -d

# STEP 7のSSL設定
bash ./setup-ssl.sh auto-renew

# ステータス統合監視
```

【出力・ログ】
- デプロイログ: ./logs/deploy-$(date +%Y%m%d-%H%M%S).log
- エラーログ: ./logs/error.log
- 状態ファイル: ./.state (JSON形式)

【要件】
- エラー時の自動停止・ロールバック
- 実行進捗の詳細表示
- 詳細なログ記録（トレーシング可能）
- 本番環境での安全性（確認プロンプト）
- 冪等性（複数回実行可能）
- 実行時間計測・表示
```

### ✅ 期待される出力

- `manage.sh` - 統合管理スクリプト
- `quick-deploy.sh` - クイックデプロイ
- `logs/` - ログディレクトリ構成例

### 🔍 チェックポイント

□ 全機能が実装されているか
□ エラーハンドリングが完備されているか
□ ロールバック機能が機能するか
□ ログが詳細に記録されるか
□ 本番環境での安全性が確保されているか
□ ヘルスチェックが全コンポーネント対応か
□ バックアップ復旧が正確か
□ 実行時間が計測されるか
```

---

## **🎯 プロンプト実行順序チェックリスト**

```
STEP 1: Terraform基盤コード
   └─ 出力: terraform/*.tf ファイル群

STEP 2: AWS CLI デプロイスクリプト
   └─ 出力: aws-startup.sh
   └─ 入力: STEP 1の Terraform コード

STEP 3: EC2 初期セットアップスクリプト
   └─ 出力: ec2-setup.sh, setup-ssl.sh
   └─ 入力: Amazon Linux 2の仕様

STEP 4: Docker Compose 構成
   └─ 出力: docker-compose.yml
   └─ 入力: マルチコンテナ構成要件

STEP 5: Express.js API実装
   └─ 出力: api/server.js 他
   └─ 入力: RESTful API 仕様

STEP 6: Nginx リバースプロキシ設定
   └─ 出力: nginx/nginx.conf 他
   └─ 入力: Express サーバー情報

STEP 7: SSL証明書自動設定
   └─ 出力: setup-ssl.sh
   └─ 入力: ドメイン情報

STEP 8: 統合デプロイ・運用スクリプト
   └─ 出力: manage.sh, quick-deploy.sh
   └─ 入力: STEP 1～7の全スクリプト
```

---

## **📋 実行手順サマリー**

### フェーズ1: プロンプト投入（順序厳守）

```bash
# STEP 1
cat << 'EOF' | pbcopy
[STEP 1のプロンプットをコピー]
EOF
# ChatGPT/Claudeに貼り付け

# STEP 2
cat << 'EOF' | pbcopy
[STEP 2のプロンプットをコピー]
EOF

# 以降、STEP 3～8も同様
```

### フェーズ2: コード生成・整理

```bash
# ファイル配置
mkdir -p terraform/{modules,environments}
mkdir -p api/{routes,middleware,services,config}
mkdir -p nginx/conf.d
mkdir -p logs

# 各STEP出力をファイルに保存
# STEP 1の出力 → terraform/*.tf
# STEP 2の出力 → aws-startup.sh
# etc...
```

### フェーズ3: デプロイ実行

```bash
# 初期デプロイ（自動化）
./quick-deploy.sh

# または段階的実行
./aws-startup.sh deploy
./manage.sh health
./manage.sh logs
```

---

## **⚠️ 注意事項**

| 項目 | 注意点 |
|------|--------|
| **AWS認証** | aws configure で事前設定必須 |
| **ドメイン** | Route 53登録済みまたはDNS設定完了必須 |
| **SSH鍵** | EC2キーペア生成・保管必須 |
| **SSL証明書** | Let's Encrypt 期限自動更新設定推奨 |
| **バックアップ** | 本番環境では定期バックアップ自動化推奨 |
| **セキュリティ** | シークレット情報は環境変数で管理 |
| **ログ監視** | CloudWatch Logsへの送信設定推奨 |

---

## **🔗 参考資料**

- [AWS公式ドキュメント](https://docs.aws.amazon.com)
- [Terraform Registry](https://registry.terraform.io)
- [Docker Compose仕様](https://docs.docker.com/compose/compose-file/)
- [Nginxドキュメント](https://nginx.org/en/docs/)
- [Express.jsガイド](https://expressjs.com/ja/)
- [Let's Encryptガイド](https://letsencrypt.org/ja/getting-started/)

---

**最終更新**: 2026年1月16日
