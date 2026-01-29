# AWSインフラ構築～ホスティング構成ガイド
## 生産管理システム - エンドツーエンドデプロイメント

### 📋 プロジェクト概要
生産管理システムをAWS上で構築するエンドツーエンドのパイプライン

---

## **STEP 1: インフラストラクチャコード準備（Infrastructure as Code）**

**使用ツール**: Terraform

### 内容
- **VPC**（ネットワーク構成）
- **EC2**（コンピュートインスタンス）
- **RDS PostgreSQL**（マネージドデータベース）
- **ALB**（ロードバランサー）
- **Route 53**（DNS管理）
- **IAM ロール・セキュリティグループ設定**

### ファイル
```
terraform/
├─ main.tf          # メインリソース定義
├─ variables.tf     # 変数定義
├─ outputs.tf       # 出力値定義
├─ modules/         # 再利用可能モジュール
└─ environments/    # 環境別設定
```

---

## **STEP 2: AWSリソース自動デプロイ**

**スクリプト**: `./aws-startup.sh deploy`

### 実行フロー
```
1. 前提条件チェック
   ├─ Terraform インストール確認
   └─ AWS CLI インストール確認

2. AWS認証情報設定
   └─ ~/.aws/credentials の確認

3. Terraform初期化
   └─ terraform init

4. リソース計画作成
   └─ terraform plan

5. リソース自動構築
   └─ terraform apply

6. 出力情報取得
   ├─ EC2 IP アドレス
   ├─ RDS エンドポイント
   └─ セキュリティグループ設定
```

### コマンド
```bash
# 新規デプロイ
./aws-startup.sh deploy

# ステータス確認
./aws-startup.sh status

# リソース削除
./aws-startup.sh destroy
```

---

## **STEP 3: EC2インスタンスセットアップ**

**スクリプト**: `ec2-setup.sh`

### セットアップ内容
- **Node.js / npm** 環境構築
- **Docker & Docker Compose** インストール
- **SSL証明書** 設定
- **ファイアウォール** / セキュリティ設定
- **ディレクトリ構成** 作成
- **アプリケーション** デプロイメント準備

---

## **STEP 4: アプリケーションコンテナ化**

**構成ファイル**: `docker-compose.yml`

### コンテナサービス構成
```yaml
services:
  nginx:
    # ポート: 80/443
    # 役割: リバースプロキシ・HTTPS終端
    # 設定: nginx/nginx.conf, nginx/conf.d/
    
  production-api:
    # ベースイメージ: node:18-alpine
    # ポート: 3000
    # 役割: Express.js バックエンド
    
  grafana:
    # ポート: 3000（nginx経由）
    # 役割: ダッシュボード・モニタリング
    
  prometheus:
    # ポート: 9090
    # 役割: メトリクス収集
    
  postgres: (オプション)
    # ポート: 5432
    # 推奨: RDS（マネージド）を使用
```

### 起動コマンド
```bash
# コンテナ起動
docker-compose up -d

# ステータス確認
docker-compose ps

# ログ確認
docker-compose logs -f production-api

# 再起動
docker-compose restart

# 停止
docker-compose down
```

---

## **STEP 5: APIサーバー実装**

**メインサーバー**: `api/server.js`

### 技術スタック
- **フレームワーク**: Express.js
- **言語**: Node.js (18.x)
- **ポート**: 3000

### 主要機能
```
RESTful API
├─ OCR ルート (複数の処理パターン)
│  ├─ /api/ocr           - 基本OCR
│  ├─ /api/ocr/enhance   - 拡張OCR
│  ├─ /api/ocr/ai        - AI-based OCR
│  └─ /api/ocr/feedback  - フィードバック機構
│
├─ 生産管理エンドポイント
│  ├─ GET  /api/orders      - 注文一覧取得
│  ├─ POST /api/orders      - 注文作成
│  ├─ PUT  /api/orders/:id  - 注文更新
│  └─ DELETE /api/orders/:id - 注文削除
│
└─ ユーティリティ
   ├─ GET /health         - ヘルスチェック
   └─ GET /metrics        - Prometheus メトリクス
```

### セキュリティ機構
- **CORS** 設定
- **Helmet** ヘッダー保護
- **Rate Limiting** DDoS対策
- **入力検証** (Joi スキーマ)
- **ログ記録** (Winston)

### データベース接続
```javascript
PostgreSQL Pool接続
├─ Host: process.env.DB_HOST (RDS エンドポイント)
├─ Port: process.env.DB_PORT (5432)
├─ Database: process.env.DB_NAME
├─ User: process.env.DB_USER
├─ Password: process.env.DB_PASSWORD
└─ SSL: process.env.DB_SSL
```

---

## **STEP 6: ホスティング層設定**

**Webサーバー**: Nginx

### アーキテクチャ
```
クライアント (HTTP/HTTPS)
    ↓
Nginx リバースプロキシ (ポート 80/443)
    ├─ 静的ファイル配信 (/web)
    ├─ SSL/TLS 暗号化 (/etc/nginx/ssl)
    └─ バックエンド ルーティング
        └─ Express サーバー (localhost:3000)
```

### 主要な設定ファイル
```
nginx/
├─ nginx.conf         # メイン設定
└─ conf.d/
   ├─ default.conf    # デフォルトサーバー
   └─ ssl.conf        # SSL設定
```

### Nginx 機能
- リバースプロキシ
- HTTPS 終端
- gzip 圧縮
- キャッシング
- ロードバランシング (複数バックエンド対応)
- ログ記録

---

## **STEP 7: SSL証明書設定**

**スクリプト**: `setup-ssl.sh`

### 証明書種別
| 方式 | 説明 | 用途 |
|------|------|------|
| Let's Encrypt | 無料自動更新 | 本番環境推奨 |
| 自己署名 | ローカル用 | 開発環境 |
| ACM | AWS Certificate Manager | AWS環境向け |

### セットアップフロー
```bash
1. Let's Encrypt 証明書取得
   └─ certbot（ACME クライアント）

2. 証明書配置
   └─ /etc/nginx/ssl/

3. Nginx 設定
   └─ ssl_certificate 設定

4. 自動更新設定
   └─ cron ジョブ登録

5. 再起動
   └─ nginx 再起動
```

### コマンド
```bash
# SSL設定実行
./setup-ssl.sh

# 証明書確認
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# 証明書期限確認
openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates
```

---

## **STEP 8: システム起動・運用**

### 主要なコマンド

#### デプロイメント
```bash
# フル新規デプロイ（インフラ+アプリケーション）
./aws-startup.sh deploy

# デプロイ後の確認
./aws-startup.sh status
```

#### 起動・停止管理
```bash
# システム起動
./aws-startup.sh start

# システム停止
./aws-startup.sh stop

# システム再起動
./aws-startup.sh restart
```

#### 監視・ログ
```bash
# ステータス確認
./aws-startup.sh status

# リアルタイムログ表示
./aws-startup.sh logs

# ヘルスチェック実行
./aws-startup.sh health
```

#### バックアップ・復旧
```bash
# データベースバックアップ
./aws-startup.sh backup

# バックアップ一覧表示
ls -la backups/
```

#### その他
```bash
# SSH 接続（EC2 インスタンス）
./aws-startup.sh ssh

# リソース全削除
./aws-startup.sh destroy
```

---

## **全体アーキテクチャ図**

```
┌─────────────────────────────────────────────────────────────┐
│                       インターネット                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │ Route 53  │ (DNS ホスティング)
                    │ (AWS)     │
                    └────┬─────┘
                         │
                    ┌────▼──────────┐
                    │     ALB        │ (Application Load Balancer)
                    │  (ポート 80/  │
                    │    443)        │
                    └────┬──────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼──────────────┐         ┌─────▼────────────┐
    │   EC2 Instance    │         │  RDS PostgreSQL  │
    │  (t3.medium)      │         │   (db.t3.small)  │
    │                   │         │                  │
    │ ┌───────────────┐ │         │  - Database      │
    │ │  Nginx        │ │         │  - Automated     │
    │ │ (Port 80/443) │ │         │    Backup        │
    │ │               │◄├─────────┤  - Multi-AZ      │
    │ │ ┌───────────┐ │ │         │    (HA)          │
    │ │ │  Express  │ │ │         │                  │
    │ │ │  API      │ │ │         └──────────────────┘
    │ │ │(Port 3000)│ │ │
    │ │ └───────────┘ │ │
    │ │               │ │
    │ │ ┌───────────┐ │ │
    │ │ │ Grafana   │ │ │
    │ │ │ Dashboard │ │ │
    │ │ └───────────┘ │ │
    │ │               │ │
    │ │ ┌───────────┐ │ │
    │ │ │Prometheus │ │ │
    │ │ │ Metrics   │ │ │
    │ │ └───────────┘ │ │
    │ └───────────────┘ │
    └───────────────────┘
```

---

## **使用技術スタック**

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| **Infrastructure** | Terraform | 1.5+ |
| **Cloud Platform** | AWS | - |
| | - EC2 | t3.medium |
| | - RDS | PostgreSQL 15 |
| | - ALB | Application Load Balancer |
| | - Route53 | DNS Management |
| | - IAM | Identity & Access |
| **Containerization** | Docker | 20.10+ |
| | Docker Compose | 2.0+ |
| **Web Server** | Nginx | alpine |
| **Backend** | Node.js | 18.x LTS |
| | Express.js | 4.x |
| **Database** | PostgreSQL | 15 |
| **Monitoring** | Grafana | 10.x |
| | Prometheus | 2.x |
| **SSL/TLS** | Let's Encrypt | - |
| **Security** | Helmet.js | 7.x |
| | CORS | express-cors |
| **Validation** | Joi | 17.x |
| **Logging** | Winston | 3.x |

---

## **環境変数設定**

### `.env` ファイル例

```bash
# AWS 設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=****
AWS_SECRET_ACCESS_KEY=****

# Database 設定
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=****
DB_SSL=true

# Application 設定
NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info

# SSL 設定
SSL_ENABLED=true
CERT_PATH=/etc/nginx/ssl/cert.pem
KEY_PATH=/etc/nginx/ssl/key.pem

# Email 設定（オプション）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=****
SMTP_PASSWORD=****
```

---

## **トラブルシューティング**

### デプロイメント失敗時

```bash
# Terraform エラーログ確認
cat terraform.log

# AWS 認証確認
aws sts get-caller-identity

# EC2 接続確認
ssh -i /path/to/key.pem ec2-user@public-ip
```

### アプリケーション問題

```bash
# コンテナログ確認
docker-compose logs production-api

# データベース接続確認
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# ポート確認
netstat -tuln | grep 3000
```

### SSL 証明書問題

```bash
# 証明書状態確認
openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates

# Nginx テスト
nginx -t

# Nginx 再起動
systemctl restart nginx
```

---

## **ベストプラクティス**

### セキュリティ
- ✅ RDS マルチ AZ 設定（高可用性）
- ✅ VPC セキュリティグループ（最小権限）
- ✅ IAM ロール（認証情報管理）
- ✅ SSL/TLS 暗号化（全通信）
- ✅ 環境変数（シークレット管理）
- ✅ WAF（Web Application Firewall）

### パフォーマンス
- ✅ RDS リードレプリカ（読み込み最適化）
- ✅ CloudFront（CDN）
- ✅ Nginx キャッシング
- ✅ gzip 圧縮
- ✅ コンテナ リソース制限

### 信頼性
- ✅ 自動バックアップ
- ✅ ヘルスチェック
- ✅ ログ集約
- ✅ 監視・アラート
- ✅ 災害復旧計画

---

## **参考リソース**

- [Terraform AWS Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Docker Documentation](https://docs.docker.com/)
- [Express.js Guide](https://expressjs.com/ja/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**最終更新**: 2026年1月16日
