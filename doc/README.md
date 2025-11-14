# 生産管理システム統合環境

WSL上のDocker環境で動作する統合生産管理システムです。出荷検品までの全工程を管理し、PostgreSQLとGrafanaによる高度な分析機能を提供します。


## 🚀 デプロイメントオプション

### ローカル環境（WSL/Docker）
このREADMEで説明されている標準的なセットアップ方法です。

### AWS環境
AWSクラウドにデプロイする場合は、以下のドキュメントを参照してください：
- **[AWS クイックスタートガイド](./AWS_QUICKSTART.md)** - 最短3ステップでデプロイ
- **[AWS 完全デプロイメントガイド](./AWS_DEPLOYMENT.md)** - 詳細な手順とトラブルシューティング

```bash
# AWS環境への簡単デプロイ
./aws-startup.sh full
```
## 🌟 システム概要

### 主要機能
- **生産管理**: 生産計画から実績管理まで
- **出荷管理**: 出荷指示の管理と追跡
- **出荷検品**: 品質管理と最終検査
- **在庫管理**: リアルタイム在庫状況
- **ダッシュボード**: KPI監視と分析
- **レポート**: Grafanaによる高度な分析

### 技術スタック
- **Frontend**: HTML5, CSS3, JavaScript (Bootstrap 5)
- **Backend**: Node.js (Express)
- **Database**: PostgreSQL 15
- **Analytics**: Grafana + Prometheus
- **Reverse Proxy**: nginx
- **Container**: Docker + Docker Compose

## 🚀 クイックスタート

### 1. 前提条件
- WSL2 (Ubuntu 22.04推奨)
- Docker & Docker Compose
- curl (サービス確認用)

### 2. インストール
```bash
# リポジトリのクローン（仮想環境）
cd /tmp/grafana-setup

# 実行権限付与
chmod +x manage.sh

# システム起動
./manage.sh start
```

### 3. アクセス
システム起動後、以下のURLにアクセスできます：

| サービス | URL | 認証情報 |
|---------|-----|----------|
| 🏠 生産管理システム | http://localhost | - |
| 🔍 出荷検品システム | http://localhost/shipping-inspection-mockup.html | - |
| 📊 Grafana | http://localhost/grafana/ | admin/admin123 |
| 📈 Prometheus | http://localhost/prometheus/ | - |
| 🛠️ API | http://localhost/api/health | - |

## 📁 システム構成

```
grafana-setup/
├── docker-compose.yml          # Docker Compose設定
├── .env                       # 環境変数
├── manage.sh                  # 管理スクリプト
├── README.md                  # このファイル
│
├── nginx/                     # nginx設定
│   ├── nginx.conf
│   └── conf.d/default.conf
│
├── postgres/                  # PostgreSQL設定
│   └── init/01-init.sql       # DB初期化スクリプト
│
├── api/                       # Node.js APIサーバー
│   ├── package.json
│   └── server.js
│
├── web/                       # フロントエンド
│   ├── index.html             # メインシステム
│   ├── shipping-inspection-mockup.html  # 出荷検品
│   ├── styles.css
│   └── app.js
│
└── grafana/                   # Grafana設定
    └── provisioning/
        └── datasources/
            └── datasources.yml
```

## 🛠️ 管理コマンド

```bash
# システム操作
./manage.sh start      # システム起動
./manage.sh stop       # システム停止
./manage.sh restart    # システム再起動

# 監視・確認
./manage.sh status     # サービス状況確認
./manage.sh logs       # ログ表示

# メンテナンス
./manage.sh backup     # データベースバックアップ
./manage.sh clean      # 完全クリーンアップ（データ削除）

# ヘルプ
./manage.sh help       # 全コマンド表示
```

## 📊 システム利用方法

### ダッシュボード
- システム全体のKPI表示
- リアルタイム統計情報
- 最近の活動履歴

### 出荷管理
- 出荷指示一覧表示
- 優先度・ステータス管理
- 顧客別配送管理

### 出荷検品
- 検品項目チェックリスト
- 数量・品質確認
- 最終承認ワークフロー
- バーコード表示

### 在庫管理
- 製品別在庫状況
- 利用可能在庫計算
- 低在庫アラート

### 分析・レポート
- Grafanaダッシュボード
- PostgreSQLクエリ実行
- カスタムレポート作成

## 🗄️ データベース設計

### 主要テーブル
- `products`: 製品マスタ
- `production_plans`: 生産計画
- `production_records`: 生産実績
- `shipping_instructions`: 出荷指示
- `shipping_inspections`: 出荷検品
- `inventory`: 在庫管理

### サンプルデータ
初期化時に以下のサンプルデータが投入されます：
- 製品マスタ: 5製品
- 生産計画: 3計画
- 出荷指示: 3指示
- 在庫データ: 5製品分

## 🔧 カスタマイズ

### 環境変数の変更
`.env`ファイルを編集してシステム設定を変更：

```bash
# データベース設定
POSTGRES_PASSWORD=production_pass  # パスワード変更

# セキュリティ設定
JWT_SECRET=your-new-secret-key     # JWT秘密鍵

# ログレベル
LOG_LEVEL=debug                    # デバッグレベル
```

### ポート番号の変更
nginx設定ファイルを編集：
```bash
vi nginx/conf.d/default.conf
```

### データベーススキーマの変更
```bash
vi postgres/init/01-init.sql
```

## 🔍 トラブルシューティング

### よくある問題

**Docker が起動しない**
```bash
# Docker サービス確認・起動
sudo service docker status
sudo service docker start
```

**ポートが既に使用されている**
```bash
# ポート使用状況確認
sudo netstat -tlnp | grep :80

# .envファイルでポート変更
HTTP_PORT=8080
```

**データベース接続エラー**
```bash
# PostgreSQL状況確認
./manage.sh status

# コンテナ再起動
docker-compose restart postgres
```

**API接続エラー**
```bash
# APIサーバーログ確認
docker-compose logs production-api

# 依存関係確認
docker-compose exec production-api npm list
```

### ログ確認
```bash
# 全サービスログ
./manage.sh logs

# 特定サービスのログ
docker-compose logs nginx
docker-compose logs postgres
docker-compose logs production-api
```

### データリセット
```bash
# 完全リセット（データ削除）
./manage.sh clean

# システム再構築
./manage.sh start
```

## 💾 バックアップ・復元

### データベースバックアップ
```bash
# 自動バックアップ
./manage.sh backup

# 手動バックアップ
docker-compose exec postgres pg_dump -U production_user production_db > backup.sql
```

### データ復元
```bash
# バックアップファイルから復元
docker-compose exec -T postgres psql -U production_user -d production_db < backup.sql
```

## 🔐 セキュリティ

### 本番環境での注意事項
- デフォルトパスワードの変更
- HTTPS設定の有効化
- ファイアウォール設定
- アクセスログの監視
- 定期的なセキュリティアップデート

### SSL/TLS設定
```bash
# SSL証明書配置
mkdir -p ssl/
# 証明書ファイルをssl/ディレクトリに配置
```

## 📈 パフォーマンス最適化

### データベース
- インデックス最適化
- 接続プール設定
- クエリパフォーマンス監視

### アプリケーション
- Node.jsメモリ制限調整
- nginx キャッシュ設定
- ログローテーション

## 🤝 開発・拡張

### API開発
- RESTful API設計
- OpenAPI/Swagger文書
- 単体テスト作成

### フロントエンド拡張
- 新機能画面追加
- レスポンシブデザイン改善
- PWA化対応

### データ分析拡張
- Grafanaダッシュボード追加
- カスタムメトリクス実装
- アラート設定

## 📞 サポート

### システム要件
- CPU: 2コア以上
- メモリ: 4GB以上
- ディスク: 10GB以上
- OS: Ubuntu 20.04/22.04 LTS

### 更新履歴
- v1.0.0: 初期リリース - 基本的な生産管理機能
- v1.1.0: 出荷検品システム統合
- v1.2.0: PostgreSQL移行・Grafana統合

---

**注意**: 本システムは開発・検証環境向けです。本番環境で使用する場合は、適切なセキュリティ設定と監視体制を整備してください。
