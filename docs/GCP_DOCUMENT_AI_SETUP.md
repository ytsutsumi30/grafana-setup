# GCP Document AI セットアップガイド（初心者向け完全版）

## 📋 概要

このガイドでは、Google Cloud Platform (GCP) の Document AI を**ゼロから**セットアップする手順を、初心者でも理解できるように詳しく説明します。

### 🎯 Document AIとは？
画像やPDFから文字を読み取る（OCR）ための、Googleが提供するクラウドサービスです。
- 📸 写真に写った文字を自動で読み取れる
- 📄 請求書や伝票のデータを自動抽出できる
- 🌏 日本語・英語など多言語対応

### ✨ 利用可能な機能
- ✅ **OCR（光学文字認識）**: 画像から文字を抽出
- ✅ **テーブル抽出**: 表形式データを自動認識
- ✅ **フォームフィールド抽出**: 項目名と値のペアを認識
- ✅ **AWS Textractとのハイブリッド運用**: 2つのAIを組み合わせて精度向上

### 💰 コスト
- **無料枠**: 1,000ページ/月（毎月リセット）
- **従量課金**: $1.50/1,000ページ（無料枠超過後）
- **月額固定費**: なし（使った分だけ）
- 詳細: https://cloud.google.com/document-ai/pricing

### ⚠️ 前提条件
以下が必要です：
- [ ] Googleアカウント（Gmailアドレス）
- [ ] クレジットカード（GCP課金用、無料枠内なら請求なし）
- [ ] インターネット接続
- [ ] PCのブラウザ（Chrome推奨）

---

## 🚀 ステップ1: GCPプロジェクトの作成

### 📝 プロジェクトとは？
GCPでは、すべてのサービスを「プロジェクト」という単位で管理します。
プロジェクトは、アプリやサービスを入れる「フォルダ」のようなものです。

### 手順1-1: Google Cloud Consoleにアクセス

1. ブラウザで以下のURLを開く：
   ```
   https://console.cloud.google.com/
   ```

2. Googleアカウントでログイン
   - まだアカウントがない場合は、Gmailを作成してください

3. **初回ログイン時の画面**
   - 「利用規約」が表示される → 読んで「同意する」をクリック
   - 「Google Cloud Platform へようこそ」画面 → 「次へ」

### 手順1-2: 課金アカウントの設定（初回のみ）

⚠️ **重要**: クレジットカード登録が必要ですが、無料枠内なら請求されません

1. 画面上部に「課金を有効にする」ボタンが表示される
2. クリックして以下を入力：
   - 国: **日本**
   - アカウントタイプ: **個人** または **ビジネス**
   - お支払い方法: **クレジットカード情報を入力**
   - 住所情報を入力

3. 「無料トライアルを開始」または「同意して続行」をクリック

💡 **ヒント**: 
- 初回は$300分の無料クレジットがもらえます（90日間有効）
- 無料枠超過時は事前に通知が来ます
- 予算アラートを設定すれば安心（後述）

### 手順1-3: 新しいプロジェクトを作成

1. 画面左上の **「プロジェクトを選択」** をクリック
   ```
   ┌─────────────────────┐
   │ ≡ Google Cloud     ▼│  ← ここをクリック
   └─────────────────────┘
   ```

2. ポップアップウィンドウが開く → 右上の **「新しいプロジェクト」** をクリック

3. プロジェクト情報を入力：
   ```
   プロジェクト名: production-management-ocr
   （好きな名前でOK、日本語も可）
   
   プロジェクトID: production-mgmt-ocr-12345
   （自動生成されます、変更可能）
   
   場所: 組織なし（個人の場合）

    プロジェクト名
    production-management-ocr
    プロジェクト番号
    286571486398
    プロジェクト ID
    production-management-ocr

   ```

4. **「作成」** ボタンをクリック

5. 数秒待つと、プロジェクトが作成されます
   - 画面右上に通知が表示される
   - 「プロジェクトを表示」をクリック

### 手順1-4: プロジェクトIDを確認・記録

1. 画面上部のプロジェクト名の横に **プロジェクトID** が表示されます
   ```
   production-management-ocr
   ID: production-mgmt-ocr-12345  ← これをメモ
   ```

2. **このプロジェクトIDを必ずメモしてください**
   - 後の手順で何度も使います
   - 忘れた場合: 画面上部のプロジェクト選択から確認可能

💡 **確認方法（コマンド）**:
```bash
# ターミナルで確認する場合
gcloud config get-value project

# 出力例:
# production-mgmt-ocr-12345
```

---

## 🔧 ステップ2: Document AI APIの有効化

### 📝 APIとは？
GCPのサービスを使うには、まず「API」を有効にする必要があります。
APIは「サービスの使用許可を出すスイッチ」のようなものです。

### 手順2-1: APIライブラリにアクセス

1. Google Cloud Consoleの画面左上 **「≡」メニュー** をクリック

2. メニューから以下を選択：
   ```
   ≡ メニュー
   └─ APIとサービス
      └─ ライブラリ
   ```

   または、直接URLにアクセス：
   ```
   https://console.cloud.google.com/apis/library/documentai.googleapis.com
   ```

### 手順2-2: Document AI APIを有効化

1. 検索バーに `Document AI` と入力
   
2. 検索結果から **「Cloud Document AI API」** をクリック

3. APIの詳細ページが表示される
   - 説明: ドキュメント処理用のAI
   - 料金: 無料枠あり

4. **「有効にする」** ボタンをクリック
   ```
   ┌─────────────────┐
   │  有効にする     │  ← クリック
   └─────────────────┘
   ```

5. 数秒〜1分待つと、APIが有効化されます
   - 「API が有効になりました」通知が表示される
   - ダッシュボード画面に自動遷移

### 手順2-3: 有効化の確認

APIが正しく有効化されたか確認：

1. 画面左の **「有効なAPI」** をクリック

2. リストに **「Cloud Document AI API」** が表示されればOK ✅
   ```
   有効なAPI一覧
   ├─ Cloud Document AI API  ✓
   ├─ Cloud Storage API
   └─ ...
   ```

💡 **トラブルシューティング**:
- 「課金を有効にしてください」と表示される
  → ステップ1の課金設定を完了してください
  
- APIが見つからない
  → プロジェクトが正しく選択されているか確認

---

## 📝 ステップ3: Document AIプロセッサーの作成

### 📝 プロセッサーとは？
プロセッサーは「OCR処理を実行するエンジン」です。
用途に合わせて異なるタイプのプロセッサーを作成します。

### プロセッサータイプの種類
| タイプ | 用途 | おすすめ度 |
|--------|------|-----------|
| **OCR Processor** | 汎用的な文字認識 | ⭐⭐⭐ 初心者向け |
| Form Parser | フォーム認識 | ⭐⭐ |
| Invoice Parser | 請求書専用 | ⭐⭐ |
| Receipt Parser | レシート専用 | ⭐ |

💡 **初めての方**: まずは **OCR Processor** を作成してください

### 手順3-1: Document AI Consoleにアクセス

1. Google Cloud Consoleの **「≡」メニュー** から：
   ```
   ≡ メニュー
   └─ 人工知能
      └─ Document AI
         └─ Processors（プロセッサ）
   ```

   または直接URLにアクセス：
   ```
   https://console.cloud.google.com/ai/document-ai/processors
   ```

2. 初回アクセス時
   - 「Document AI へようこそ」画面が表示される場合があります
   - **「続行」** をクリック

### 手順3-2: プロセッサーを作成

1. **「CREATE PROCESSOR」**（プロセッサを作成）ボタンをクリック
   ```
   ┌──────────────────────┐
   │ + CREATE PROCESSOR   │  ← クリック
   └──────────────────────┘
   ```

2. **プロセッサータイプを選択**
   
   画面に様々なタイプが表示されます：
   ```
   📄 Document OCR          ← これを選択（推奨）
   📋 Form Parser
   💰 Invoice Parser
   🧾 Receipt Parser
   ...
   ```

   - **「Document OCR」** の **「SELECT PROCESSOR TYPE」** をクリック

3. **リージョン（地域）を選択**
   
   リージョンによって処理速度・料金が若干異なります：
   
   | リージョン | 場所 | レイテンシ | おすすめ |
   |-----------|------|-----------|---------|
   | `us` | アメリカ | 普通 | ⭐⭐⭐ |
   | `eu` | ヨーロッパ | やや遅い | ⭐⭐ |
   | `asia-northeast1` | 東京 | 速い | ⭐⭐⭐ |
   
   ```
   Region: us  ← 初心者はこれでOK
   または
   Region: asia-northeast1  ← 日本からのアクセスが多い場合
   ```

4. **プロセッサー名を入力**
   ```
   Processor name: production-ocr-processor
   
   （日本語も可能）
   プロセッサー名: 生産管理OCR
   ```

5. **「CREATE」**（作成）ボタンをクリック

6. 数秒待つと、プロセッサーが作成されます ✅

### 手順3-3: プロセッサー情報を確認・記録

作成完了後、プロセッサーの詳細画面が表示されます。

**重要な情報をメモしてください：**

```
┌─────────────────────────────────────┐
│ Processor details                   │
├─────────────────────────────────────┤
│ Name: production-ocr-processor      │
│ ID: 88e298617b1abfea    ← これをメモ！│
│ Type: OCR_PROCESSOR                 │
│ Location: us            ← これもメモ！│
│ Status: ENABLED                     │
└─────────────────────────────────────┘
```

**記録する情報：**
1. **Processor ID**: 例）`88e298617b1abfea`
2. **Location（リージョン）**: 例）`us` または `asia-northeast1`

💡 **後で確認する方法**:
- Document AI Console → Processors → 作成したプロセッサーをクリック
- URLの末尾がProcessor IDです
  ```
  https://console.cloud.google.com/ai/document-ai/locations/us/processors/88e298617b1abfea
                                                                              ↑
                                                                        Processor ID
  ```

---

## 🔑 4. サービスアカウントの作成と認証情報の設定

### 4.1 サービスアカウントの作成
```bash
# プロジェクトIDを設定
export PROJECT_ID="production-management-ocr"

# サービスアカウントを作成
gcloud iam service-accounts create document-ai-service \
  --display-name="Document AI Service Account" \
  --project=$PROJECT_ID

# サービスアカウントのメールアドレスを確認
export SERVICE_ACCOUNT_EMAIL="document-ai-service@${PROJECT_ID}.iam.gserviceaccount.com"
echo $SERVICE_ACCOUNT_EMAIL
```

### 4.2 必要な権限を付与
```bash
# Document AI User権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/documentai.apiUser"

# Storage Object Viewer権限を付与（オプション）
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.objectViewer"
```

### 4.3 認証情報JSONキーを作成
```bash
# JSONキーを生成
gcloud iam service-accounts keys create ~/document-ai-key.json \
  --iam-account=$SERVICE_ACCOUNT_EMAIL

# キーファイルを確認
ls -lh ~/document-ai-key.json
```

### 4.4 EC2サーバーにキーをアップロード
```bash
# ローカルからEC2にコピー
scp -i ~/.ssh/your-key.pem ~/document-ai-key.json ec2-user@<EC2_IP>:/home/ec2-user/

# EC2サーバーで適切な場所に移動
ssh -i ~/.ssh/your-key.pem ec2-user@<EC2_IP>
sudo mv /home/ec2-user/document-ai-key.json /opt/production-management/api/secrets/
sudo chmod 600 /opt/production-management/api/secrets/document-ai-key.json
```

---

## ⚙️ 5. Terraform設定

### 5.1 terraform.tfvarsを編集
```hcl
# GCP Configuration (Hybrid OCR)
enable_hybrid_ocr = true

# GCP Project Configuration
gcp_project_id = "production-management-ocr"  # 実際のプロジェクトID
gcp_region     = "us"  # プロセッサーのリージョン

# Document AI Processor ID
documentai_processor_id = "88e298617b1abfea"  # 実際のプロセッサーID

# GCP Credentials (optional)
# gcp_credentials_file = "/opt/production-management/api/secrets/document-ai-key.json"

# OCR Configuration
ocr_default_engine       = "textract"    # Primary: textract or documentai
ocr_confidence_threshold = 85            # Fallback threshold
```

### 5.2 Terraform初期化と適用
```bash
cd terraform/

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply
```

---

## 🌍 6. 環境変数の設定

### 6.1 .envファイルを編集
```bash
# EC2サーバーで
cd /opt/production-management/api
sudo nano .env
```

### 6.2 GCP設定を追加
```env
# GCP Document AI Configuration
GCP_PROJECT_ID=production-management-ocr
GCP_REGION=us
DOCUMENTAI_PROCESSOR_ID=88e298617b1abfea
GOOGLE_APPLICATION_CREDENTIALS=/opt/production-management/api/secrets/document-ai-key.json

# OCR Configuration
OCR_DEFAULT_ENGINE=textract
OCR_CONFIDENCE_THRESHOLD=85
```

### 6.3 Docker環境変数を設定
```bash
# docker-compose.ymlを編集
sudo nano /opt/production-management/docker-compose.yml
```

```yaml
services:
  api:
    environment:
      # GCP Configuration
      - GCP_PROJECT_ID=${GCP_PROJECT_ID}
      - GCP_REGION=${GCP_REGION}
      - DOCUMENTAI_PROCESSOR_ID=${DOCUMENTAI_PROCESSOR_ID}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/document-ai-key.json
      - OCR_DEFAULT_ENGINE=${OCR_DEFAULT_ENGINE:-textract}
      - OCR_CONFIDENCE_THRESHOLD=${OCR_CONFIDENCE_THRESHOLD:-85}
    volumes:
      - ./api/secrets:/app/secrets:ro
```

---

## 📦 7. 依存関係のインストール

### 7.1 NPMパッケージをインストール
```bash
cd /opt/production-management/api
npm install @google-cloud/documentai
```

### 7.2 Dockerイメージを再ビルド
```bash
cd /opt/production-management
docker-compose build api
docker-compose up -d
```

---

## ✅ 8. 動作確認

### 8.1 ヘルスチェック
```bash
curl http://localhost:3000/api/ocr/health
```

**期待される出力:**
```json
{
  "success": true,
  "service": "OCR API",
  "textractAvailable": true,
  "documentaiAvailable": true,
  "region": "ap-northeast-1",
  "gcpRegion": "us",
  "timestamp": "2024-11-24T12:00:00.000Z"
}
```

### 8.2 Document AI OCRテスト
```bash
# テスト画像をBase64エンコード
IMAGE_BASE64=$(base64 -w 0 test-image.png)

# Document AI APIを呼び出し
curl -X POST http://localhost:3000/api/ocr/documentai \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$IMAGE_BASE64\",\"mimeType\":\"image/png\"}"
```

### 8.3 ハイブリッドOCRテスト
```bash
curl -X POST http://localhost:3000/api/ocr/hybrid \
  -H "Content-Type: application/json" \
  -d "{
    \"image\":\"$IMAGE_BASE64\",
    \"primaryEngine\":\"textract\",
    \"confidenceThreshold\":85
  }"
```

---

## 🎯 9. 運用ガイド

### 9.1 ハイブリッドOCR戦略
1. **プライマリエンジン**: AWS Textract（デフォルト）
2. **信頼度閾値**: 85%
3. **フォールバック**: 信頼度が閾値未満の場合、Document AIを使用
4. **コスト最適化**: 無料枠（月1000ページ）を最大活用

### 9.2 コスト管理
```bash
# GCP課金アラートの設定
# 予算: $10/月
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Document AI Budget" \
  --budget-amount=10USD
```

### 9.3 ログ監視
```bash
# Document AIログを確認
docker logs production-management-api-1 | grep "Document AI"

# エラーログ
docker logs production-management-api-1 | grep "ERROR.*Document AI"
```

---

## 🔒 10. セキュリティベストプラクティス

### 10.1 認証情報の保護
```bash
# ファイルパーミッション確認
ls -l /opt/production-management/api/secrets/document-ai-key.json
# 600 (rw-------) であることを確認

# .envファイルをGit管理から除外
echo "api/.env" >> .gitignore
echo "api/secrets/*.json" >> .gitignore
```

### 10.2 IAM最小権限の原則
- サービスアカウントには`documentai.apiUser`のみ付与
- 不要な権限は削除

### 10.3 キーローテーション
```bash
# 90日ごとにキーを再生成
gcloud iam service-accounts keys create ~/new-document-ai-key.json \
  --iam-account=$SERVICE_ACCOUNT_EMAIL

# 古いキーを削除
gcloud iam service-accounts keys list \
  --iam-account=$SERVICE_ACCOUNT_EMAIL

gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=$SERVICE_ACCOUNT_EMAIL
```

---

## 📊 11. モニタリング

### 11.1 Cloud Monitoringでメトリクスを確認
https://console.cloud.google.com/monitoring

### 11.2 主要メトリクス
- **API呼び出し回数**: `documentai.googleapis.com/api/request_count`
- **レイテンシー**: `documentai.googleapis.com/api/request_latencies`
- **エラー率**: `documentai.googleapis.com/api/error_count`

### 11.3 アラート設定
- API呼び出しが月900回を超えた場合（無料枠の90%）
- エラー率が10%を超えた場合

---

## 🐛 12. トラブルシューティング

### エラー: PERMISSION_DENIED
```
原因: サービスアカウントに権限がない
解決: IAM権限を再確認、documentai.apiUserを付与
```

### エラー: NOT_FOUND
```
原因: プロセッサーIDが間違っている
解決: Document AI Consoleでプロセッサー情報を確認
```

### エラー: INVALID_ARGUMENT
```
原因: 画像形式やサイズが不正
解決: サポート形式（PNG, JPEG, PDF）、最大20MBを確認
```

### エラー: クレデンシャルが見つからない
```
原因: GOOGLE_APPLICATION_CREDENTIALS環境変数が未設定
解決: .envファイルとdocker-compose.ymlを確認
```

---

## 📚 13. 参考資料

- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Document AI API Reference](https://cloud.google.com/document-ai/docs/reference)
- [Node.js Client Library](https://github.com/googleapis/nodejs-document-ai)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Best Practices](https://cloud.google.com/document-ai/docs/best-practices)

---

## 📞 14. サポート

### GCP サポート
- コンソール: https://console.cloud.google.com/support
- コミュニティ: https://stackoverflow.com/questions/tagged/google-cloud-document-ai

### プロジェクトサポート
- GitHub Issues
- 開発チーム連絡先

---

**最終更新**: 2024年11月24日
