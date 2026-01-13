# 🔑 ステップ4: サービスアカウントの作成（続き）

## 📤 ステップ5: EC2サーバーへのキーファイル転送

### 📝 なぜ転送が必要？
作成したJSONキーファイルを、アプリケーションが動いているEC2サーバーに配置する必要があります。

### 準備：必要な情報を確認

以下の情報を手元に用意してください：

```
✅ EC2のIPアドレス: 例) 52.69.217.246
✅ SSHキーファイル: 例) ~/.ssh/production-management-key.pem
✅ GCPのJSONキー: 例) ~/document-ai-key.json
```

### 方法A: SCPコマンドで転送（Mac/Linux）

#### 手順5A-1: ローカルPCからEC2にファイルをコピー

```bash
# ターミナルを開く

# 1. SSHキーのパーミッションを確認
chmod 400 ~/.ssh/production-management-key.pem

# 2. JSONキーをEC2にコピー
scp -i ~/.ssh/production-management-key.pem \
    ~/document-ai-key.json \
    ec2-user@52.69.217.246:/home/ec2-user/

# パスワードは不要（SSHキー認証）
# 進捗バーが表示される
# document-ai-key.json    100% 2345    45.2KB/s   00:00
```

💡 **よくあるエラーと対処法**:

```bash
# エラー: Permission denied (publickey)
# 原因: SSHキーファイルが間違っている
# 対処: -i の後のファイルパスを確認

# エラー: No such file or directory
# 原因: JSONキーファイルのパスが間違っている
# 対処: ls ~/document-ai-key.json で存在確認
```

#### 手順5A-2: EC2にSSH接続

```bash
# EC2サーバーにログイン
ssh -i ~/.ssh/production-management-key.pem ec2-user@52.69.217.246

# 成功すると以下のようなプロンプトが表示される
# [ec2-user@ip-10-0-1-123 ~]$
```

#### 手順5A-3: キーファイルを適切な場所に移動

```bash
# EC2サーバー内で実行

# 1. ファイルがアップロードされたか確認
ls -lh ~/document-ai-key.json
# 出力: -rw-rw-r-- 1 ec2-user ec2-user 2.3K Nov 24 12:00 document-ai-key.json

# 2. secretsディレクトリがあるか確認
ls -ld /opt/production-management/api/secrets/

# ディレクトリがない場合は作成
sudo mkdir -p /opt/production-management/api/secrets/

# 3. キーファイルを移動
sudo mv ~/document-ai-key.json /opt/production-management/api/secrets/

# 4. パーミッション設定（セキュリティ重要！）
sudo chmod 600 /opt/production-management/api/secrets/document-ai-key.json
sudo chown ec2-user:ec2-user /opt/production-management/api/secrets/document-ai-key.json

# 5. 確認
ls -l /opt/production-management/api/secrets/document-ai-key.json
# 出力: -rw------- 1 ec2-user ec2-user 2345 Nov 24 12:00 document-ai-key.json
#      ↑ 600 (rw-------)であることを確認
```

### 方法B: WinSCPで転送（Windows）

#### 手順5B-1: WinSCPをダウンロード・インストール

1. https://winscp.net/eng/download.php からダウンロード
2. インストーラーを実行

#### 手順5B-2: EC2に接続

1. WinSCPを起動
2. 以下の情報を入力：
   ```
   File protocol: SFTP
   Host name: 52.69.217.246
   Port number: 22
   User name: ec2-user
   ```

3. **Advanced** → **SSH** → **Authentication**
   - **Private key file** に `.pem` ファイルを指定
   - .ppk形式への変換を求められたら「はい」

4. **Login** をクリック

#### 手順5B-3: ファイルをドラッグ&ドロップ

1. 左側（ローカル）: `document-ai-key.json` を探す
2. 右側（EC2）: `/home/ec2-user/` に移動
3. ファイルをドラッグ&ドロップ

#### 手順5B-4: PuTTYでSSH接続してパーミッション設定

```bash
# PuTTYでEC2に接続後、以下を実行
sudo mkdir -p /opt/production-management/api/secrets/
sudo mv ~/document-ai-key.json /opt/production-management/api/secrets/
sudo chmod 600 /opt/production-management/api/secrets/document-ai-key.json
```

---

## ⚙️ ステップ6: Terraform設定の更新

### 📝 Terraformとは？
インフラ（サーバー、ネットワークなど）をコードで管理するツールです。
設定ファイルを編集して、GCPの設定を追加します。

### 手順6-1: terraform.tfvarsファイルを編集

#### 方法A: ローカルPCで編集（推奨）

```bash
# プロジェクトディレクトリに移動
cd /home/tsutsumi/grafana-setup

# エディタで開く（VSCodeなど）
code terraform/terraform.tfvars

# またはviエディタ
vi terraform/terraform.tfvars
```

#### 方法B: EC2サーバーで編集

```bash
# EC2にSSH接続後
cd /opt/production-management/terraform
sudo nano terraform.tfvars
```

### 手順6-2: GCP設定を追加

ファイルの**最後に**以下を追加します：

```hcl
# ========================================
# GCP Configuration (Hybrid OCR)
# ========================================

# ハイブリッドOCRを有効化
# true にすると AWS Textract + GCP Document AI の両方が使えます
enable_hybrid_ocr = true

# GCP プロジェクト設定（ステップ1でメモした値を入力）
gcp_project_id = "production-mgmt-ocr-12345"  # ← あなたのプロジェクトID

# Document AIのリージョン（ステップ3でメモした値）
gcp_region = "us"  # または "asia-northeast1"

# プロセッサーID（ステップ3でメモした値）
documentai_processor_id = "88e298617b1abfea"  # ← あなたのプロセッサーID

# 認証情報ファイルのパス（コメントアウトのまま）
# gcp_credentials_file = "/opt/production-management/api/secrets/document-ai-key.json"

# OCR設定
ocr_default_engine = "textract"    # 最初に使うエンジン: textract または documentai
ocr_confidence_threshold = 85      # 信頼度がこの値未満なら別のエンジンにフォールバック
```

### 手順6-3: 設定値の説明

| 設定項目 | 説明 | 設定例 |
|---------|------|--------|
| `enable_hybrid_ocr` | ハイブリッドOCRを使うか | `true` = 使う、`false` = 使わない |
| `gcp_project_id` | GCPプロジェクトID | `production-mgmt-ocr-12345` |
| `gcp_region` | Document AIのリージョン | `us`、`eu`、`asia-northeast1` |
| `documentai_processor_id` | プロセッサーID | `88e298617b1abfea` |
| `ocr_default_engine` | 最初に使うOCRエンジン | `textract`（AWS）または `documentai`（GCP） |
| `ocr_confidence_threshold` | フォールバック閾値 | `85`（85%未満なら別エンジンを試す） |

### 手順6-4: ファイルを保存

```bash
# nanoエディタの場合
Ctrl + O → Enter（保存）
Ctrl + X（終了）

# viエディタの場合
:wq → Enter（保存して終了）
```

### 手順6-5: Terraform初期化と適用

```bash
# プロジェクトディレクトリに移動
cd /home/tsutsumi/grafana-setup/terraform

# Terraform初期化（初回のみ）
terraform init

# 設定内容の確認（実際の変更前にプレビュー）
terraform plan

# 出力例:
# Plan: 2 to add, 0 to change, 0 to destroy.
# ↑ 2つのリソース（GCPプロバイダー、Document AIプロセッサー）が追加される

# 適用（実際にGCPに反映）
terraform apply

# 確認メッセージ
# Do you want to perform these actions?
# Enter a value: yes  ← "yes" と入力してEnter

# 数分待つと完了
# Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

💡 **terraform applyのエラーが出た場合**:

```bash
# エラー: Provider configuration not present
# 原因: GCP認証情報が設定されていない
# 対処: 次のステップ7で環境変数を設定

# エラー: Insufficient permissions
# 原因: サービスアカウントの権限不足
# 対処: ステップ4でDocument AI API ユーザー権限を付与
```

---

## 🌍 ステップ7: 環境変数の設定

### 📝 環境変数とは？
プログラムが使う設定値を保存する場所です。
パスワードやAPIキーなど、機密情報を安全に管理できます。

### 手順7-1: .envファイルを編集

```bash
# EC2サーバーにSSH接続

# APIディレクトリに移動
cd /opt/production-management/api

# .envファイルを編集
sudo nano .env
```

### 手順7-2: GCP設定を追加

ファイルの**最後に**以下を追加：

```env
# ========================================
# GCP Document AI Configuration
# ========================================

# GCPプロジェクトID（ステップ1でメモした値）
GCP_PROJECT_ID=production-mgmt-ocr-12345

# Document AIリージョン（ステップ3でメモした値）
GCP_REGION=us

# プロセッサーID（ステップ3でメモした値）
DOCUMENTAI_PROCESSOR_ID=88e298617b1abfea

# 認証情報ファイルのパス（ステップ5で配置した場所）
GOOGLE_APPLICATION_CREDENTIALS=/opt/production-management/api/secrets/document-ai-key.json

# ========================================
# OCR Configuration
# ========================================

# デフォルトのOCRエンジン（textract または documentai）
OCR_DEFAULT_ENGINE=textract

# フォールバック閾値（0-100の数値）
OCR_CONFIDENCE_THRESHOLD=85
```

### 手順7-3: ファイルを保存

```bash
# Ctrl + O → Enter（保存）
# Ctrl + X（終了）

# パーミッション確認（セキュリティ重要！）
ls -l /opt/production-management/api/.env
# 出力: -rw------- 1 ec2-user ec2-user 1234 Nov 24 12:00 .env

# パーミッションが違う場合は修正
sudo chmod 600 /opt/production-management/api/.env
```

### 手順7-4: docker-compose.ymlを編集

```bash
# プロジェクトディレクトリに移動
cd /opt/production-management

# docker-compose.ymlを編集
sudo nano docker-compose.yml
```

以下の部分を見つけて、GCP環境変数を追加：

```yaml
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      # 既存の環境変数（そのまま）
      - NODE_ENV=production
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      
      # GCP Configuration（これを追加）
      - GCP_PROJECT_ID=${GCP_PROJECT_ID}
      - GCP_REGION=${GCP_REGION}
      - DOCUMENTAI_PROCESSOR_ID=${DOCUMENTAI_PROCESSOR_ID}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/document-ai-key.json
      - OCR_DEFAULT_ENGINE=${OCR_DEFAULT_ENGINE:-textract}
      - OCR_CONFIDENCE_THRESHOLD=${OCR_CONFIDENCE_THRESHOLD:-85}
      
    volumes:
      - ./api:/app
      - ./api/secrets:/app/secrets:ro  # この行を追加（readonly mount）
```

💡 **volumes の説明**:
- `./api/secrets:/app/secrets:ro`
  - EC2の `/opt/production-management/api/secrets` を
  - Docker内の `/app/secrets` にマウント
  - `:ro` = Read Only（読み取り専用でセキュリティ向上）

---

## 📦 ステップ8: 依存関係のインストールとデプロイ

### 手順8-1: NPMパッケージをインストール

```bash
# APIディレクトリに移動
cd /opt/production-management/api

# package.jsonを確認（@google-cloud/documentaiが含まれているか）
grep "documentai" package.json

# 出力:
# "@google-cloud/documentai": "^8.0.0",

# パッケージをインストール
npm install

# インストール進捗が表示される
# added 150 packages in 30s
```

### 手順8-2: Dockerイメージを再ビルド

```bash
# プロジェクトディレクトリに移動
cd /opt/production-management

# 既存のコンテナを停止
docker-compose down

# イメージを再ビルド
docker-compose build api

# ビルド進捗が表示される（数分かかります）
# Step 1/10 : FROM node:18
# Step 2/10 : WORKDIR /app
# ...
# Successfully built abc123def456
# Successfully tagged production-management_api:latest

# コンテナを起動
docker-compose up -d

# 起動確認
docker-compose ps

# 出力例:
# NAME                          STATUS    PORTS
# production-management-api-1   Up        0.0.0.0:3000->3000/tcp
# production-management-db-1    Up        5432/tcp
```

---

## ✅ ステップ9: 動作確認

### 手順9-1: ヘルスチェック

```bash
# APIのヘルスチェック
curl http://localhost:3000/api/ocr/health

# または外部からアクセス（EC2のIPアドレス）
curl http://52.69.217.246:3000/api/ocr/health
```

**期待される出力:**
```json
{
  "success": true,
  "service": "OCR API",
  "textractAvailable": true,
  "documentaiAvailable": true,  ← これがtrueならOK！
  "region": "ap-northeast-1",
  "gcpRegion": "us",
  "timestamp": "2024-11-24T12:00:00.000Z"
}
```

💡 **documentaiAvailable が false の場合**:
- 環境変数が正しく設定されているか確認
- JSONキーファイルのパスが正しいか確認
- docker-compose.yml の volumes設定を確認

### 手順9-2: Document AI OCRをテスト

```bash
# テスト用画像を用意（日本語テキストが含まれる画像）
# 例: test-invoice.png

# Base64エンコード
IMAGE_BASE64=$(base64 -w 0 test-invoice.png)

# Document AI APIを呼び出し
curl -X POST http://localhost:3000/api/ocr/documentai \
  -H "Content-Type: application/json" \
  -d "{
    \"image\": \"$IMAGE_BASE64\",
    \"mimeType\": \"image/png\"
  }"
```

**期待される出力:**
```json
{
  "success": true,
  "text": "請求書\n株式会社サンプル\n金額: ¥10,000...",
  "pages": [...],
  "confidence": 95.5,
  "processingTime": 1234
}
```

### 手順9-3: ハイブリッドOCRをテスト

```bash
# ハイブリッドモード（Textract → 低信頼度ならDocument AIにフォールバック）
curl -X POST http://localhost:3000/api/ocr/hybrid \
  -H "Content-Type: application/json" \
  -d "{
    \"image\": \"$IMAGE_BASE64\",
    \"primaryEngine\": \"textract\",
    \"confidenceThreshold\": 85
  }"
```

**出力例（フォールバック発生時）:**
```json
{
  "success": true,
  "text": "抽出されたテキスト...",
  "confidence": 92.3,
  "engine": "documentai",  ← 実際に使われたエンジン
  "fallbackUsed": true,    ← フォールバックが発生
  "primaryEngine": "textract",
  "confidenceThreshold": 85
}
```

### 手順9-4: Webインターフェースで確認

ブラウザで以下にアクセス：

```
http://52.69.217.246/ocr-enhanced.html
```

1. 画像ファイルをアップロード
2. OCRエンジンで **「GCP Document AI」** を選択
3. **「OCR実行」** ボタンをクリック
4. 結果が表示されればOK ✅

---

## 🎯 ステップ10: 運用ガイド

### ハイブリッドOCRの仕組み

```
画像アップロード
    ↓
┌──────────────────────┐
│ プライマリエンジン実行│
│ (AWS Textract)       │
└─────────┬────────────┘
          ↓
    ┌─────────┐
    │信頼度判定│
    │ >= 85%? │
    └─┬───┬───┘
      │   │
  YES │   │ NO
      ↓   ↓
   結果  GCP Document AI
   返却  でリトライ
          ↓
      より高信頼度を返却
```

### コスト管理のベストプラクティス

#### 月額コスト試算

```
シナリオ1: 軽量利用（月500ページ）
├─ AWS Textract: $0（無料枠内）
├─ GCP Document AI: $0（無料枠内）
└─ 合計: $0/月 ✅

シナリオ2: 中程度利用（月2,000ページ）
├─ AWS Textract: ~$3（2000 × $1.50/1000）
├─ GCP Document AI: ~$1.50（1000超過分 × $1.50/1000）
└─ 合計: ~$4.50/月

シナリオ3: 大量利用（月10,000ページ）
├─ AWS Textract: ~$15
├─ GCP Document AI: ~$13.50
└─ 合計: ~$28.50/月
```

#### 予算アラートの設定

```bash
# GCP予算アラート設定（コマンド）
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Document AI Budget Alert" \
  --budget-amount=10USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

または、GCP Consoleから設定：
1. **「≡」メニュー** → **「お支払い」**
2. **「予算とアラート」** → **「予算を作成」**
3. 予算額: $10
4. しきい値: 50%, 90%, 100%
5. 通知先メール設定

---

## 🔒 ステップ11: セキュリティチェックリスト

### 必須確認項目

```bash
# ✅ 1. JSONキーファイルのパーミッション確認
ls -l /opt/production-management/api/secrets/document-ai-key.json
# 期待値: -rw------- (600)

# ✅ 2. .envファイルのパーミッション確認
ls -l /opt/production-management/api/.env
# 期待値: -rw------- (600)

# ✅ 3. .gitignoreに機密ファイルが含まれているか確認
cat /opt/production-management/.gitignore | grep -E "\.env|secrets"
# 期待値:
# api/.env
# api/secrets/*.json

# ✅ 4. サービスアカウントの権限確認（最小権限）
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:document-ai-service"
# 期待値: roles/documentai.apiUser のみ
```

### セキュリティベストプラクティス

1. **JSONキーの定期ローテーション（90日ごと推奨）**
   ```bash
   # 新しいキーを作成
   gcloud iam service-accounts keys create ~/new-key.json \
     --iam-account=document-ai-service@PROJECT_ID.iam.gserviceaccount.com
   
   # 古いキーを削除
   gcloud iam service-accounts keys list \
     --iam-account=document-ai-service@PROJECT_ID.iam.gserviceaccount.com
   
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=document-ai-service@PROJECT_ID.iam.gserviceaccount.com
   ```

2. **IPアドレス制限（可能な場合）**
   - GCP Firewall Rulesで許可IPを限定

3. **監査ログの有効化**
   - GCP Console → IAMと管理 → 監査ログ

---

## 📊 ステップ12: モニタリングと最適化

### ログ確認

```bash
# Document AIのログを確認
docker logs production-management-api-1 | grep "Document AI"

# 成功ログ例:
# [Document AI] クライアント初期化完了
# [Document AI] 処理開始: processor=88e298617b1abfea
# [Document AI] 処理成功: 信頼度=95%, 処理時間=1234ms

# エラーログ確認
docker logs production-management-api-1 | grep "ERROR.*Document AI"

# エラー例:
# [Document AI] エラー: PERMISSION_DENIED
```

### GCP Cloud Monitoringでメトリクス確認

1. GCP Console → **「Monitoring」**
2. **「メトリクス エクスプローラ」**
3. 以下のメトリクスを確認：
   ```
   - documentai.googleapis.com/api/request_count
     （API呼び出し回数）
   
   - documentai.googleapis.com/api/request_latencies
     （レスポンス時間）
   
   - documentai.googleapis.com/api/error_count
     （エラー数）
   ```

### パフォーマンス最適化

```javascript
// api/services/documentai.js で画像サイズを最適化

async processDocument(imageBuffer, mimeType) {
  // 画像サイズが大きい場合は圧縮
  if (imageBuffer.length > 5 * 1024 * 1024) {
    console.log('[Document AI] 画像を圧縮中...');
    // Sharp等で画像圧縮処理
  }
  
  // ... 既存コード
}
```

---

## 🐛 トラブルシューティング

### よくあるエラーと解決方法

#### エラー1: `documentaiAvailable: false`

**症状:**
```json
{
  "documentaiAvailable": false
}
```

**原因と対処:**
```bash
# 1. 環境変数を確認
docker exec production-management-api-1 env | grep GCP

# 出力に以下が含まれているか確認:
# GCP_PROJECT_ID=production-mgmt-ocr-12345
# GCP_REGION=us
# DOCUMENTAI_PROCESSOR_ID=88e298617b1abfea
# GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/document-ai-key.json

# 2. JSONキーファイルが存在するか確認
docker exec production-management-api-1 ls -l /app/secrets/

# 3. 環境変数が設定されていない場合
# → docker-compose.yml を修正して再起動
docker-compose down
docker-compose up -d
```

#### エラー2: `PERMISSION_DENIED`

**症状:**
```
Error: 権限がありません。認証情報を確認してください
```

**原因と対処:**
```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/documentai.apiUser"

# 権限がない場合は付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:document-ai-service@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

#### エラー3: `NOT_FOUND`

**症状:**
```
Error: プロセッサーが見つかりません
```

**原因と対処:**
```bash
# 1. プロセッサーIDを再確認
# GCP Console → Document AI → Processors

# 2. 環境変数のプロセッサーIDを修正
nano /opt/production-management/api/.env

# DOCUMENTAI_PROCESSOR_ID=正しいID

# 3. 再起動
docker-compose restart api
```

#### エラー4: `INVALID_ARGUMENT`

**症状:**
```
Error: リクエストパラメータが無効です
```

**原因と対処:**
- 画像形式を確認（PNG, JPEG, PDFのみ対応）
- 画像サイズを確認（最大20MB）
- Base64エンコードが正しいか確認

```bash
# 画像情報を確認
file test-image.png
identify test-image.png

# サイズ確認
ls -lh test-image.png
```

---

## 📚 参考資料

### 公式ドキュメント
- [Document AI ドキュメント](https://cloud.google.com/document-ai/docs)
- [Node.js クライアントライブラリ](https://github.com/googleapis/nodejs-document-ai)
- [料金計算ツール](https://cloud.google.com/products/calculator)

### チュートリアル
- [Document AI クイックスタート](https://cloud.google.com/document-ai/docs/quickstart)
- [OCRベストプラクティス](https://cloud.google.com/document-ai/docs/best-practices)

### コミュニティ
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-document-ai)
- [Google Cloud コミュニティ](https://www.googlecloudcommunity.com/)

---

## 🎓 次のステップ

### 学習ロードマップ

1. **基礎（完了）** ✅
   - GCPプロジェクト作成
   - Document AI APIの有効化
   - プロセッサー作成
   - 基本的なOCR実行

2. **中級（次に学ぶこと）**
   - [ ] カスタムプロセッサーの作成
   - [ ] テーブル抽出の活用
   - [ ] バッチ処理の実装
   - [ ] エラーハンドリングの強化

3. **上級**
   - [ ] ML Kitとの連携
   - [ ] カスタムモデルの学習
   - [ ] マルチリージョン展開
   - [ ] パフォーマンスチューニング

### 実践的な活用例

```javascript
// 請求書の自動データ抽出
const invoiceData = await documentaiService.analyzeDocument(imageBuffer);
const { tables, formFields } = invoiceData;

// テーブルからデータ抽出
const items = tables[0].rows.map(row => ({
  name: row[0],
  quantity: row[1],
  price: row[2]
}));

// フォームフィールドから情報抽出
const invoiceNumber = formFields.find(f => f.name === '請求番号')?.value;
const totalAmount = formFields.find(f => f.name === '合計金額')?.value;
```

---

**最終更新**: 2024年11月24日
**対象**: 初心者〜中級者
**所要時間**: 約2-3時間

質問や不明点があれば、開発チームまでお問い合わせください！
