# GitHub Copilot 指示書

## プロジェクト概要

このプロジェクトは、出荷検品システムを含む統合監視・管理プラットフォームです。

### 技術スタック

- **フロントエンド**: HTML5, JavaScript, Bootstrap 5, Tailwind CSS
- **バックエンド**: Node.js, Express
- **データベース**: PostgreSQL
- **インフラ**: Docker Compose, AWS (EC2, RDS)
- **監視**: Grafana, Prometheus
- **Webサーバー**: nginx

## コーディング規約

### JavaScript

1. **ES6+ 構文を使用**
   - `const` / `let` を使用（`var` は使用しない）
   - アロー関数を優先
   - テンプレートリテラルを使用

2. **非同期処理**
   - `async/await` を優先（Promiseチェーンより可読性が高い）
   - エラーハンドリングは `try-catch` で

3. **クラス設計**
   - 単一責任の原則
   - メソッド名は動詞から始める（例: `handleStartScan`, `updateProgress`）
   - プライベートメソッドには `_` プレフィックス（慣例）

4. **命名規則**
   - クラス名: PascalCase（例: `Html5QRCodeInspection`）
   - 関数・変数: camelCase（例: `isScanning`, `handleQRResult`）
   - 定数: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）

### HTML/CSS

1. **セマンティックHTML**
   - 意味のあるタグを使用（`<section>`, `<article>`, `<nav>` 等）
   - アクセシビリティを考慮（`aria-*` 属性、`alt` 属性）

2. **Bootstrapとの統合**
   - Bootstrapクラスを優先使用
   - カスタムCSSは必要最小限に

3. **レスポンシブデザイン**
   - モバイルファーストアプローチ
   - Bootstrapのグリッドシステムを活用

### バックエンド（Node.js）

1. **エラーハンドリング**
   - 必ず適切なHTTPステータスコードを返す
   - エラーログは詳細に（コンテキスト情報を含める）

2. **セキュリティ**
   - 環境変数で機密情報を管理
   - SQLインジェクション対策（パラメータ化クエリ）
   - XSS対策（入力のサニタイズ）

3. **API設計**
   - RESTful原則に従う
   - JSONレスポンス形式を統一

## プロジェクト固有のルール

### QR/バーコードスキャン機能

1. **ライブラリ選択**
   - 汎用性が必要な場合: `html5-qrcode`（バーコード対応）
   - Safari最適化が必要な場合: `qr-scanner`（QR専用）

2. **重複スキャン防止**
   - 1秒以内の同一コード検出は無視
   - タイムスタンプで管理

3. **カメラ設定**
   - 背面カメラ優先（`facingMode: "environment"`）
   - スキャン速度: 3-5 fps（デバイスにより調整）

### OCR機能

1. **画像前処理**
   - 解像度2倍化
   - グレースケール変換
   - コントラスト1.5倍
   - 二値化処理

2. **OCRエンジン選択**
   - ローカル処理: Tesseract.js
   - 高精度が必要: Google Cloud Vision / Azure Computer Vision

3. **マッチング精度向上**
   - あいまい検索実装
   - 類似度スコアリング

### データベース操作

1. **テーブル命名**
   - スネークケース（例: `shipping_inspections`, `qr_scan_logs`）
   - 複数形を使用

2. **クエリ最適化**
   - インデックスを適切に設定
   - N+1問題を避ける
   - トランザクション管理を徹底

### デプロイ

1. **Docker Compose**
   - サービスごとにコンテナ分離
   - ヘルスチェックを実装

2. **環境変数**
   - `.env` ファイルで管理
   - 本番環境の機密情報は AWS Secrets Manager

3. **ログ管理**
   - 構造化ログ（JSON形式）
   - ログレベルを適切に設定

## コメント規約

### コメントを書くべき箇所

1. **複雑なロジック**
   - アルゴリズムの説明
   - 特殊な条件分岐の理由

2. **ブラウザ固有の対応**
   - Safari対応コード
   - iOS特有の制約

3. **パフォーマンス最適化**
   - なぜその実装を選んだか

### コメント例

```javascript
// Safari最適化: 初回カメラ起動時の安定性向上のため4秒待機
const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000;

// 重複スキャン防止: 1秒以内の同一コードを無視
if (decodedText === this.lastScannedCode && 
    currentTime - this.lastScannedTime < this.scanDedupDelay) {
    return;
}
```

## Git コミットメッセージ

### フォーマット

```
<type>: <subject>

<body>

<footer>
```

### Type一覧

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（機能に影響しない）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: ビルド・補助ツール

### 例

```
feat: qr-inspection.htmlにhtml5-qrcode適用 - バーコード・QRコード対応

- qr-scanner@1.4.2 から html5-qrcode に変更
- 12種類のバーコード形式に対応 (CODE-128, EAN-13, UPC, QRコード等)
- Safari最適化コードを削除しシンプルな実装に
- 重複スキャン防止機能 (1秒以内)
- バージョン 3.0.0 に更新
```

## テスト方針

### 手動テスト

1. **クロスブラウザテスト**
   - Chrome, Safari, Firefox, Edge
   - iOS Safari, Android Chrome

2. **デバイステスト**
   - スマートフォン（実機）
   - タブレット
   - デスクトップ

3. **機能テスト**
   - 正常系
   - 異常系（カメラ権限拒否、ネットワークエラー等）
   - エッジケース

### 自動テスト（今後実装予定）

- ユニットテスト: Jest
- E2Eテスト: Playwright
- API テスト: Supertest

## トラブルシューティング

### よくある問題

1. **カメラが起動しない**
   - HTTPS環境か確認
   - カメラ権限を確認
   - 他のアプリがカメラを使用していないか

2. **QRコードが読み取れない**
   - 照明を調整
   - スキャン領域内にコードを配置
   - カメラのフォーカスを確認

3. **OCR精度が低い**
   - 画像の解像度を上げる
   - コントラストを調整
   - Cloud OCRを試す

## パフォーマンス目標

- **初回ロード**: 3秒以内
- **カメラ起動**: 2秒以内
- **QRスキャン応答**: 1秒以内
- **OCR処理**: 5秒以内（Tesseract.js）

## セキュリティチェックリスト

- [ ] XSS対策済み
- [ ] SQLインジェクション対策済み
- [ ] CSRF対策済み
- [ ] 入力値検証実装済み
- [ ] 機密情報はログに出力しない
- [ ] HTTPSで通信
- [ ] 認証・認可実装済み

## 参考リンク

- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode)
- [qr-scanner GitHub](https://github.com/nimiq/qr-scanner)
- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [Express.js Documentation](https://expressjs.com/)

## 連絡先

プロジェクト管理者: y.tsutsumi30@gmail.com

---

**最終更新**: 2025-10-26
**バージョン**: 1.0.0
