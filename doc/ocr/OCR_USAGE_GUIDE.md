# AI-OCR強化版 - 使い方ガイド

## 🎯 概要

AI-OCR強化版は、以下の機能を統合した高精度OCRシステムです:

- ✅ **画像前処理** - ノイズ除去、コントラスト調整、傾き補正
- ✅ **OCR強化エンジン** - Tesseractパラメータ最適化
- ✅ **ハイブリッドOCR** - 複数エンジンを並列実行して最良結果を選択
- ✅ **AI補正** - ルールベース文脈補正
- ✅ **フィードバック学習** - ユーザー修正を学習データ化
- ✅ **画質評価** - リアルタイム品質チェック

---

## 📦 ファイル構成

```
grafana-setup/
├── web/
│   ├── ocr-enhanced.html          # デモページ
│   └── js/
│       ├── image-preprocessor.js  # 画像前処理
│       ├── ocr-engine-enhanced.js # OCR強化エンジン
│       └── ocr-module.js          # 統合モジュール
└── api/
    ├── routes/
    │   ├── ocr-ai.js              # AI補正API
    │   └── ocr-feedback.js        # フィードバックAPI
    └── server.js                  # APIサーバー
```

---

## 🚀 クイックスタート

### 1. デモページで試す

```bash
# サーバー起動
cd /home/tsutsumi/grafana-setup
./quick-deploy.sh

# ブラウザでアクセス
http://localhost/ocr-enhanced.html
```

### 2. JavaScriptで使用

```html
<!-- 必要なスクリプトを読み込み -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<script src="/js/image-preprocessor.js"></script>
<script src="/js/ocr-engine-enhanced.js"></script>
<script src="/js/ocr-module.js"></script>

<script>
// OCR実行（簡易API）
const result = await ocrRecognize(imageFile, {
  engine: 'tesseract-enhanced',  // または 'hybrid'
  context: 'invoice'             // 文書タイプ
});

console.log('抽出テキスト:', result.text);
console.log('信頼度:', result.confidence);
</script>
```

### 3. モジュールとして使用

```javascript
// OCRモジュールインスタンス作成
const ocr = new OCRModule({
  defaultEngine: 'tesseract-enhanced',
  enablePreprocessing: true,
  enableAICorrection: true,
  enableFeedback: true
});

// 初期化
await ocr.initialize();

// OCR実行
const result = await ocr.recognize(imageFile, {
  engine: 'hybrid',              // ハイブリッドOCR
  engines: ['tesseract', 'textract'], // 使用エンジン
  context: 'shipping',           // 出荷伝票
  psm: 6,                        // Page Segmentation Mode
  upscale: true                  // 解像度アップスケーリング
});

// フィードバック送信
await ocr.submitFeedback(result, correctedText);

// クリーンアップ
await ocr.cleanup();
```

---

## 📖 API リファレンス

### OCRModule

#### コンストラクタ

```javascript
new OCRModule(options)
```

**Options:**
- `defaultEngine`: デフォルトエンジン (`'tesseract-enhanced'` | `'hybrid'` | `'textract'`)
- `enablePreprocessing`: 画像前処理を有効化 (デフォルト: `true`)
- `enableAICorrection`: AI補正を有効化 (デフォルト: `false`)
- `enableFeedback`: フィードバック機能を有効化 (デフォルト: `true`)
- `apiEndpoint`: APIエンドポイント (デフォルト: `'/api'`)

#### メソッド

##### recognize(input, options)

OCR実行

**Parameters:**
- `input`: `HTMLImageElement` | `HTMLCanvasElement` | `File`
- `options`:
  - `engine`: 使用エンジン
  - `engines`: ハイブリッドOCRで使用するエンジン配列
  - `context`: 文書タイプ (`'invoice'` | `'receipt'` | `'shipping'` | `'default'`)
  - `lang`: 言語 (デフォルト: `'jpn+eng'`)
  - `psm`: Page Segmentation Mode (1-13)
  - `oem`: OCR Engine Mode (0-3)
  - `whitelist`: 認識する文字のホワイトリスト
  - `upscale`: アップスケーリング有効化

**Returns:** `Promise<OCRResult>`

```javascript
{
  engine: 'tesseract-enhanced',
  text: '抽出されたテキスト',
  confidence: 95.5,
  lines: [...],
  words: [...],
  quality: {...},
  totalProcessingTime: 1234
}
```

##### submitFeedback(ocrResult, correctedText)

フィードバック送信

##### getFeedbackStats(options)

統計情報取得

##### assessImageQuality(input)

画質評価

##### cleanup()

リソース解放

---

## 🎨 使用例

### 例1: 基本的なOCR

```javascript
const file = document.getElementById('fileInput').files[0];
const result = await ocrRecognize(file);
console.log(result.text);
```

### 例2: ハイブリッドOCR

```javascript
const result = await ocrRecognize(file, {
  engine: 'hybrid',
  engines: ['tesseract', 'textract']
});

// 全エンジンの結果を確認
console.log('全結果:', result.allResults);
```

### 例3: 請求書OCR with AI補正

```javascript
const ocr = new OCRModule({
  enableAICorrection: true
});

await ocr.initialize();

const result = await ocr.recognize(file, {
  context: 'invoice',
  expectedFields: ['請求日', '金額', '会社名']
});

// AI補正が適用された結果
console.log('補正後:', result.text);
console.log('変更箇所:', result.changes);
```

### 例4: 構造化データ抽出

```javascript
const ocr = new OCRModule();
await ocr.initialize();

const result = await ocr.recognize(invoiceImage);

// スキーマ定義
const schema = {
  '請求日': 'date',
  '金額': 'currency',
  '会社名': 'string'
};

// 構造化データ抽出
const data = await ocr.extractStructuredData(result.text, schema);

console.log(data);
// {
//   '請求日': '2025/11/09',
//   '金額': 50000,
//   '会社名': '株式会社サンプル'
// }
```

### 例5: 画質チェック & フィードバック

```javascript
// 画質評価
const quality = await ocrAssessQuality(imageFile);

if (quality.overall < 0.5) {
  alert('画質が低いです: ' + quality.recommendations.join(', '));
}

// OCR実行
const result = await ocrRecognize(imageFile);

// ユーザーが修正
const correctedText = prompt('テキストを確認/修正してください', result.text);

// フィードバック送信
await ocrSubmitFeedback(result, correctedText);
```

---

## 🔧 設定ガイド

### Tesseract Page Segmentation Mode (PSM)

```javascript
0  // Orientation and script detection (OSD) only
1  // Automatic page segmentation with OSD
2  // Automatic page segmentation, but no OSD, or OCR
3  // Fully automatic page segmentation (デフォルト)
4  // Assume a single column of text of variable sizes
5  // Assume a single uniform block of vertically aligned text
6  // Assume a single uniform block of text (推奨: 伝票用)
7  // Treat the image as a single text line
8  // Treat the image as a single word
9  // Treat the image as a single word in a circle
10 // Treat the image as a single character
11 // Sparse text. Find as much text as possible
12 // Sparse text with OSD
13 // Raw line
```

### OCR Engine Mode (OEM)

```javascript
0  // Legacy engine only
1  // Neural nets LSTM engine only (推奨)
2  // Legacy + LSTM
3  // Default
```

### 文書タイプ別推奨設定

```javascript
// 請求書
{
  engine: 'hybrid',
  context: 'invoice',
  psm: 6,
  enableAICorrection: true
}

// レシート
{
  engine: 'tesseract-enhanced',
  context: 'receipt',
  psm: 11,
  upscale: true
}

// 出荷伝票
{
  engine: 'hybrid',
  context: 'shipping',
  psm: 6,
  enableAICorrection: true
}

// 手書き文字
{
  engine: 'textract',
  upscale: true
}
```

---

## 📊 パフォーマンス最適化

### 1. 画像サイズ最適化

```javascript
// 大きすぎる画像は処理前にリサイズ
if (image.width > 2000) {
  // Canvas でリサイズ処理
}
```

### 2. Worker使用

```javascript
const ocr = new OCREngineEnhanced();
await ocr.initialize(); // Workerが初期化される

// 以降の処理が高速化
const result = await ocr.tesseractEnhanced(image);
```

### 3. キャッシング

```javascript
// LocalStorageに結果をキャッシュ
const cacheKey = await calculateImageHash(image);
const cached = localStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
} else {
  const result = await ocrRecognize(image);
  localStorage.setItem(cacheKey, JSON.stringify(result));
  return result;
}
```

---

## 🐛 トラブルシューティング

### 問題: 精度が低い

**解決策:**
1. 画質評価で問題を確認
2. 画像前処理を有効化
3. PSMパラメータを調整
4. ハイブリッドOCRを使用
5. AI補正を有効化

### 問題: 処理が遅い

**解決策:**
1. Worker使用 (自動初期化)
2. 画像サイズを削減
3. ハイブリッドOCRを無効化
4. 前処理を最小限に

### 問題: メモリ不足

**解決策:**
1. 処理後に `cleanup()` を呼ぶ
2. 大量画像の場合は順次処理
3. Worker数を制限

---

## 📈 今後の拡張

- [ ] OpenAI/Claude LLM統合
- [ ] カスタムMLモデル学習
- [ ] WebGPU高速化
- [ ] オフライン対応
- [ ] リアルタイムカメラOCR

---

## 🔗 関連リソース

- [Tesseract.js ドキュメント](https://tesseract.projectnaptha.com/)
- [AWS Textract](https://aws.amazon.com/jp/textract/)
- [Google Cloud Vision](https://cloud.google.com/vision)

---

## 📝 ライセンス

MIT License

