# AWS Textract OCR セットアップガイド

## 問題の説明

`getaddrinfo ENOTFOUND textract.ap-northeast-1.amazonaws.com` エラーは、AWS認証情報が設定されていないことが原因です。

## 解決方法

### 1. AWS認証情報の取得

#### AWSアカウントを持っている場合:

1. **AWSマネジメントコンソールにログイン**
   - https://console.aws.amazon.com/

2. **IAMサービスに移動**
   - サービス検索で「IAM」を検索

3. **IAMユーザーを作成（または既存ユーザーを使用）**
   - 左メニュー → ユーザー → ユーザーを追加
   - ユーザー名: 例）`production-textract-user`
   - アクセスの種類: **プログラムによるアクセス**

4. **必要な権限を付与**

   以下のいずれかの方法で権限を付与:

   **方法A: 既存ポリシーを使用（簡単）**
   - ポリシーを直接アタッチ: `AmazonTextractFullAccess`

   **方法B: カスタムポリシーを作成（推奨・最小権限）**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "textract:DetectDocumentText",
           "textract:AnalyzeDocument"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

5. **アクセスキーを取得**
   - ユーザー作成完了時に表示される以下の情報を保存:
     - **アクセスキーID** (例: `AKIAIOSFODNN7EXAMPLE`)
     - **シークレットアクセスキー** (例: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

   ⚠️ **重要**: シークレットアクセスキーは一度しか表示されません。必ず保存してください。

### 2. 認証情報の設定

作成済みの `api/.env` ファイルを編集:

```bash
# ファイル: api/.env

AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

⚠️ **セキュリティ注意事項**:
- `.env` ファイルは `.gitignore` に含まれており、Gitにコミットされません
- 本番環境では、AWS Secrets ManagerまたはParameter Storeの使用を推奨
- アクセスキーは定期的にローテーションしてください

### 3. システムの再起動

認証情報を設定後、コンテナを再起動:

```bash
./manage.sh restart
```

または個別にAPIコンテナのみ再起動:

```bash
docker-compose restart production-api
```

### 4. 動作確認

#### ヘルスチェックエンドポイント:
```bash
curl http://localhost/api/ocr/health
```

期待されるレスポンス:
```json
{
  "success": true,
  "service": "OCR API",
  "textractAvailable": true,
  "region": "ap-northeast-1",
  "timestamp": "2025-11-07T..."
}
```

#### OCRテスト:
Web画面から `http://localhost/ocr.html` にアクセスして画像をアップロード

## トラブルシューティング

### エラー: `AccessDeniedException`
- IAMユーザーに正しい権限が付与されているか確認
- 必要な権限: `textract:DetectDocumentText`, `textract:AnalyzeDocument`

### エラー: `InvalidClientTokenId`
- アクセスキーIDが正しいか確認
- IAMユーザーが無効化されていないか確認

### エラー: `SignatureDoesNotMatch`
- シークレットアクセスキーが正しいか確認
- `.env` ファイルに余分なスペースや改行がないか確認

### エラー: `getaddrinfo ENOTFOUND`（元のエラー）
- `.env` ファイルが存在するか確認
- 認証情報が正しく設定されているか確認
- コンテナを再起動したか確認

### ログ確認:
```bash
docker-compose logs -f production-api
```

Textract初期化メッセージを確認:
```
[Textract] Initialized with region: ap-northeast-1
```

## AWS料金について

AWS Textractは従量課金制です:
- **DetectDocumentText**: 1,000ページあたり $1.50
- **AnalyzeDocument**: 1,000ページあたり $50.00（TABLES/FORMS）

無料利用枠（初回12ヶ月）:
- DetectDocumentText: 月1,000ページ
- AnalyzeDocument: 月100ページ

詳細: https://aws.amazon.com/jp/textract/pricing/

## 代替案

AWS認証情報を使用したくない場合、以下の代替OCRサービスを検討:
1. Google Cloud Vision API
2. Tesseract OCR（オープンソース・ローカル実行）
3. Azure Computer Vision

## 参考リンク

- [AWS Textract 公式ドキュメント](https://docs.aws.amazon.com/textract/)
- [IAM ユーザーガイド](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
