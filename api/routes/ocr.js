/**
 * OCR APIルート
 * 
 * AWS Textractを使用したテキスト抽出エンドポイント
 */

const express = require('express');
const router = express.Router();
const textractService = require('../services/textract');

/**
 * POST /api/ocr/textract
 * 
 * AWS Textractで基本的なテキスト抽出
 * 
 * Body:
 * {
 *   "image": "base64エンコードされた画像データ",
 *   "documentType": "invoice|receipt|form|default"  // オプション
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "text": "抽出されたテキスト",
 *   "lines": [...],
 *   "confidence": 95.5,
 *   "processingTime": 1234
 * }
 */
router.post('/textract', async (req, res) => {
  try {
    const { image, documentType = 'default' } = req.body;
    
    // バリデーション
    if (!image) {
      return res.status(400).json({
        success: false,
        error: '画像データが必要です'
      });
    }
    
    console.log(`[OCR API] Textract処理開始: documentType=${documentType}`);
    
    // Base64 → Buffer変換
    const imageBuffer = textractService.base64ToBuffer(image);
    
    // 画像サイズチェック（10MB制限）
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: '画像サイズが大きすぎます（最大10MB）'
      });
    }
    
    // Textract実行
    const result = await textractService.detectText(imageBuffer);
    
    console.log(`[OCR API] 処理成功: 信頼度=${result.confidence.toFixed(2)}%, 処理時間=${result.processingTime}ms`);
    
    // 信頼度が低い場合は警告
    if (result.confidence < 80) {
      result.warning = '読み取り精度が低い可能性があります。画像の品質を改善してください。';
    }
    
    res.json({
      success: true,
      text: result.text,
      lines: result.lines,
      confidence: result.confidence,
      processingTime: result.processingTime,
      warning: result.warning
    });
    
  } catch (error) {
    console.error('[OCR API] エラー:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Textract処理中にエラーが発生しました',
      errorName: error.name
    });
  }
});

/**
 * POST /api/ocr/textract/analyze
 * 
 * AWS Textractで高度な文書分析（表・フォーム認識）
 * 
 * Body:
 * {
 *   "image": "base64エンコードされた画像データ",
 *   "features": ["TABLES", "FORMS"]  // オプション
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "text": "抽出されたテキスト",
 *   "tables": [...],
 *   "forms": { "住所": "東京都...", ... },
 *   "confidence": 95.5
 * }
 */
router.post('/textract/analyze', async (req, res) => {
  try {
    const { image, features = ['TABLES', 'FORMS'] } = req.body;
    
    // バリデーション
    if (!image) {
      return res.status(400).json({
        success: false,
        error: '画像データが必要です'
      });
    }
    
    // 機能タイプのバリデーション
    const validFeatures = ['TABLES', 'FORMS'];
    const invalidFeatures = features.filter(f => !validFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      return res.status(400).json({
        success: false,
        error: `無効な機能タイプ: ${invalidFeatures.join(', ')}`,
        validFeatures: validFeatures
      });
    }
    
    console.log(`[OCR API] Textract分析開始: features=${features.join(', ')}`);
    
    // Base64 → Buffer変換
    const imageBuffer = textractService.base64ToBuffer(image);
    
    // 画像サイズチェック
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: '画像サイズが大きすぎます（最大10MB）'
      });
    }
    
    // Textract分析実行
    const result = await textractService.analyzeDocument(imageBuffer, features);
    
    console.log(`[OCR API] 分析成功: 表=${result.tables.length}個, フォーム=${Object.keys(result.forms).length}個`);
    
    res.json({
      success: true,
      text: result.text,
      lines: result.lines,
      tables: result.tables,
      forms: result.forms,
      confidence: result.confidence,
      processingTime: result.processingTime
    });
    
  } catch (error) {
    console.error('[OCR API] 分析エラー:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Textract分析中にエラーが発生しました',
      errorName: error.name
    });
  }
});

/**
 * GET /api/ocr/health
 * 
 * ヘルスチェックエンドポイント
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'OCR API',
    textractAvailable: true,
    region: process.env.AWS_REGION,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
