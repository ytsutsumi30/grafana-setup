# RDS SSL接続修正レポート

## 📅 実施日時
2025年10月17日

## ❌ 発生していた問題

### エラー内容
```
データ読み込みエラー
出荷指示データの取得に失敗しました。
出荷指示データの取得に失敗しました。（HTTP 500）
```

### エラーログ
```
error: no pg_hba.conf entry for host "10.0.1.250", user "admin", 
database "production_management", no encryption
```

## 🔍 根本原因

1. **RDS設定**: `rds.force_ssl = 1` (SSL接続が必須)
2. **APIサーバー**: SSL接続設定なし（非暗号化接続を試行）
3. **認証情報の不一致**: 
   - systemdサービスファイルのDB名/ユーザー/パスワードが誤っていた

## ✅ 実施した修正

### 1. PostgreSQL接続にSSL設定を追加

**修正ファイル**: `api/server.js`

```javascript
// 修正前
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'production_db',
    user: process.env.DB_USER || 'production_user',
    password: process.env.DB_PASSWORD || 'production_pass',
});

// 修正後
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'production_db',
    user: process.env.DB_USER || 'production_user',
    password: process.env.DB_PASSWORD || 'production_pass',
    ssl: {
        rejectUnauthorized: false // RDS自己署名証明書対応
    }
});
```

### 2. systemdサービスファイルの修正

**修正ファイル**: `/etc/systemd/system/node-api.service`

```ini
[Service]
Environment="DB_HOST=poc-production-db.cq2xwbsd3tni.ap-northeast-1.rds.amazonaws.com"
Environment="DB_PORT=5432"
Environment="DB_NAME=production_db"           # 修正: production_management → production_db
Environment="DB_USER=production_user"         # 修正: admin → production_user
Environment="DB_PASSWORD=ChangeThisPassword123!"  # 修正: 正しいパスワード
```

## 📊 修正結果

### APIエンドポイント動作確認

| エンドポイント | ステータス | データ件数 |
|---------------|-----------|-----------|
| `/api/health` | ✅ OK | - |
| `/api/shipping-instructions?status=pending` | ✅ 200 | 5件 |
| `/api/shipping-locations` | ✅ 200 | データあり |
| `/api/delivery-locations` | ✅ 200 | データあり |

### 出荷指示データサンプル

```json
[
  {
    "id": 1,
    "instruction_id": "SHIP001",
    "product_name": "製品A",
    "quantity": 50,
    "customer_name": "ABC商事",
    "priority": "high",
    "status": "pending",
    "shipping_location_name": "東京本社倉庫",
    "delivery_location_name": "東京営業所"
  },
  {
    "id": 2,
    "instruction_id": "SHIP002",
    "product_name": "製品B",
    "quantity": 30,
    "customer_name": "XYZ株式会社",
    "priority": "normal",
    "status": "pending"
  }
  // ... 合計5件のデータ
]
```

## 🔧 技術詳細

### RDS PostgreSQL設定
- **インスタンス**: `poc-production-db.cq2xwbsd3tni.ap-northeast-1.rds.amazonaws.com`
- **エンジン**: PostgreSQL 15
- **パラメータ**: `rds.force_ssl = 1` (SSL必須)
- **セキュリティグループ**: `sg-02570f0ddef0c0669`

### SSL接続パラメータ
```javascript
ssl: {
    rejectUnauthorized: false  // RDS自己署名証明書を許可
}
```

**注意**: 
- `rejectUnauthorized: false` はRDSの自己署名証明書を許可するために必要
- 本番環境では適切な証明書検証を推奨

### データベース接続情報
- **Host**: `poc-production-db.cq2xwbsd3tni.ap-northeast-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database**: `production_db`
- **User**: `production_user`
- **SSL**: `required`

## 🎯 今後の推奨対応

### セキュリティ強化
1. **SSL証明書検証**: RDS証明書バンドルをダウンロードして使用
2. **パスワード管理**: AWS Secrets Managerの使用を検討
3. **最小権限の原則**: データベースユーザーの権限を最小限に

### 監視とログ
1. **RDS監視**: CloudWatch Logsで接続エラーを監視
2. **APIログ**: エラーログを定期的にレビュー
3. **アラート設定**: 接続失敗時の通知設定

## 📝 関連ファイル

- `api/server.js`: PostgreSQL接続設定
- `/etc/systemd/system/node-api.service`: サービス設定
- `terraform/terraform.tfvars`: データベース認証情報
- `terraform/modules/rds/main.tf`: RDS設定

## ✅ チェックリスト

- [x] PostgreSQL接続にSSL設定を追加
- [x] systemdサービスファイルの認証情報を修正
- [x] APIサーバーの再起動
- [x] 全APIエンドポイントの動作確認
- [x] データ取得の成功確認
- [x] エラーログの解消確認
- [x] Gitコミット完了

## 🎉 まとめ

**問題**: RDS SSL接続エラー（HTTP 500）でデータ取得失敗

**原因**: 
1. APIサーバーがSSL接続設定なし
2. データベース認証情報の誤り

**解決**:
1. PostgreSQL接続にSSL設定追加
2. 正しい認証情報に修正
3. サービス再起動

**結果**: ✅ すべてのAPIエンドポイントが正常動作

システムは完全に復旧し、Webアプリケーションから出荷指示データが正常に取得できるようになりました！
