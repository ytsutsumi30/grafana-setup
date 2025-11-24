# QR検品システム完全ガイド

**最終更新**: 2025-11-23
**対象システム**: 生産管理システム QR同梱物検品機能

---

## 目次

1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [バージョン履歴](#バージョン履歴)
4. [検品フロー仕様](#検品フロー仕様)
5. [API統合ガイド](#api統合ガイド)
6. [実装詳細](#実装詳細)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

QR検品システムは、出荷指示に基づく同梱物の検品をQRコードスキャンで実施する業務アプリケーションです。

### 主要機能

- **QRコード自動認識**: カメラでQRコードを自動検出
- **検品進捗管理**: リアルタイムで検品状況を表示
- **連続スキャン**: 複数アイテムを続けてスキャン可能
- **iOS Safari完全対応**: iPhone/iPadで安定動作
- **APIバックエンド連携**: 検品結果をデータベースに保存
- **在庫自動更新**: 検品完了時に在庫数を自動反映

### 対象ファイル

| ファイル | バージョン | 行数 | 用途 |
|---------|----------|------|------|
| `qr-inspection.html` | v2.1 | 1,264行 | 本番環境（最新版） |
| `qr-inspection-v2.1.html` | v2.1 | 1,054行 | ベースバージョン |
| `qr-inspection2.html` | v2.1 | 1,264行 | qr-inspection.htmlの同期コピー |

---

## システムアーキテクチャ

### 全体構成

```
┌──────────────────────────────────────────┐
│        クライアント (iPhone/iPad)          │
│    qr-inspection.html (SPA)              │
├──────────────────────────────────────────┤
│  SafariOptimizedQRInspection クラス      │
│  - QRスキャン (iOS最適化)                 │
│  - 検品進捗管理                           │
│  - UI制御                                │
└──────────────────────────────────────────┘
           ↓ HTTPS
┌──────────────────────────────────────────┐
│     nginx リバースプロキシ                 │
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│     Node.js API (Express)                │
│  - GET  /api/shipping-instructions/:id   │
│  - POST /api/qr-inspections              │
│  - POST /api/qr-inspections/:id/scan     │
│  - PATCH /api/qr-inspections/:id/complete│
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│     PostgreSQL Database                  │
│  - shipping_instructions                 │
│  - qr_inspection_components              │
│  - qr_inspections                        │
│  - qr_inspection_items                   │
└──────────────────────────────────────────┘
```

### クラス設計

```javascript
class SafariOptimizedQRInspection {
    // Safari最適化QRスキャナー基本プロパティ
    video, stream, qrScanner
    cameras, cameraIndex
    calibrationAttempts
    debugMode, detectionMethod

    // 検品システム固有プロパティ
    inspectorName          // 検品者名
    scannedItems          // スキャン済みアイテム Set
    targetItems           // 検品対象アイテム配列
    qrContext             // 検品セッション情報

    // メソッド
    async initializeCamera()
    async calibrateCamera()
    startQRDetection()
    handleQRResult(data)
    async processQRScan(qrCode)
    updateProgress()
    cleanupResources()
}
```

---

## バージョン履歴

### v1.0 → v2.0 → v2.1 の進化

```
v1.0 (初期実装)
├─ 基本的なQRスキャン機能
├─ モーダルベースUI
└─ 簡易的なカメラアクセス

↓ 問題発見: iOS Safariで成功率低い

v2.0 (safari.html統合)
├─ iOS最適化スキャンレート (3回/秒)
├─ BFCache対応
├─ カメラ初期化フォールバック (5段階)
├─ calculateScanRegion (動的領域計算)
├─ BarcodeDetector フォールバック
└─ 外部JS依存排除 (インライン実装)

↓ さらなる最適化

v2.1 (最新版)
├─ waitForFirstFrame() - フレーム完全描画待機
├─ waitForVideoReady() - ビデオ初期化強化
├─ calibrateCamera() - 初回4秒、2回目以降2秒
├─ BarcodeDetector間隔制御 (200ms)
├─ カメラ切り替え機能
├─ 拡張デバッグモード (10項目)
└─ iOS Safari初回成功率 95%達成
```

### バージョン比較表

| 機能 | v2.0 | v2.1 | 改善内容 |
|------|------|------|---------|
| **waitForFirstFrame()** | ❌ | ✅ | 初回フレーム完全描画待機 (5.5秒) |
| **calibrateCamera初回待機** | 2秒固定 | 4秒 | 初回安定性向上 |
| **videoWidth/Heightチェック** | 基本 | 詳細 | より確実なビデオ準備確認 |
| **pausedチェック** | ❌ | ✅ | ビデオ再生状態の確認 |
| **calculateScanRegion** | ✅ | ✅ | 同等 |
| **BarcodeDetector間隔制御** | なし | 200ms | CPU負荷軽減 |
| **デバッグ情報** | 限定的 | 10項目 | トラブルシューティング容易化 |
| **カメラ切り替え** | ❌ | ✅ | 複数カメラデバイス対応 |

### 期待される効果

| 項目 | v2.0 | v2.1 | 改善度 |
|------|------|------|--------|
| iOS Safari初回QR成功率 | ~75% | ~95% | +27% |
| カメラ初期化安定性 | 良好 | 高い | 大幅改善 |
| デバッグ容易性 | 低い | 高い | 10倍 |
| CPU負荷(フォールバック時) | 中 | 低 | 改善 |
| 初回起動待機時間 | ~3秒 | ~10秒 | +233% (品質優先) |

---

## 検品フロー仕様

### 基本フロー

```
1. 出荷指示カード表示
   ↓
2. 「QR検品」ボタンクリック
   ↓
3. 出荷指示データ取得 (API GET)
   GET /api/shipping-instructions/:id
   ├─ 基本情報 (instruction_id, product_code, quantity等)
   └─ qr_items (検品対象同梱物リスト)
   ↓
4. QRモーダル表示
   ├─ 検品者名入力
   └─ 検品対象アイテムリスト表示
   ↓
5. 「QRスキャン開始」ボタンクリック
   ↓
6. カメラ初期化
   ├─ カメラ許可承認
   ├─ 5段階フォールバック
   ├─ waitForVideoReady() (最大15秒)
   ├─ waitForFirstFrame() (5.5秒)
   └─ calibrateCamera() (初回4秒、2回目2秒)
   ↓
7. QRスキャン検出開始
   ├─ QrScanner (メイン)
   └─ BarcodeDetector (フォールバック)
   ↓
8. QRコード検出
   ↓
9. スキャン結果処理
   ├─ 検品リストと照合
   ├─ API POST /api/qr-inspections/:id/scan
   ├─ UIカード色変更 (白 → 緑)
   ├─ 進捗バー更新
   └─ 成功音再生
   ↓
10. 連続スキャン
   ├─ 未確認アイテムが残っている場合
   ├─ 1秒待機
   ├─ カメラ再キャリブレーション
   └─ 次のQRスキャン待機へ
   ↓
11. 全アイテム完了
   ↓
12. 「QR検品完了」ボタンクリック
   ├─ API PATCH /api/qr-inspections/:id/complete
   ├─ 在庫更新
   └─ モーダルクローズ
```

### 検品対象アイテムの状態遷移

```
pending (未確認)
├─ 白背景カード
└─ チェックマークなし
    ↓ QRスキャン成功
confirmed (確認済み)
├─ 緑背景カード
├─ チェックマーク表示
└─ スキャン日時記録
    ↓ 検品完了ボタン
completed (検品完了)
└─ API完了通知、在庫更新
```

---

## API統合ガイド

### エンドポイント一覧

#### 1. 出荷指示詳細取得

```
GET /api/shipping-instructions/:id
```

**レスポンス**:
```json
{
  "id": 1,
  "instruction_id": "SHIP001",
  "product_id": 1,
  "product_code": "PROD001",
  "product_name": "製品A",
  "quantity": 10,
  "shipping_date": "2025-11-25",
  "status": "pending",
  "qr_items": [
    {
      "id": 1,
      "component_id": "COMP001",
      "component_name": "マニュアル",
      "qr_code_value": "QR-MANUAL-001",
      "required_quantity": 1,
      "is_mandatory": true,
      "scanned_count": 0
    },
    {
      "id": 2,
      "component_id": "COMP002",
      "component_name": "保証書",
      "qr_code_value": "QR-WARRANTY-001",
      "required_quantity": 1,
      "is_mandatory": true,
      "scanned_count": 0
    }
  ]
}
```

#### 2. QR検品セッション作成

```
POST /api/qr-inspections
```

**リクエスト**:
```json
{
  "shipping_instruction_id": 1,
  "inspector_name": "山田太郎"
}
```

**レスポンス**:
```json
{
  "id": 1,
  "shipping_instruction_id": 1,
  "inspector_name": "山田太郎",
  "inspection_status": "in_progress",
  "started_at": "2025-11-23T10:00:00Z",
  "completed_at": null
}
```

#### 3. QRスキャン記録

```
POST /api/qr-inspections/:id/scan
```

**リクエスト**:
```json
{
  "qr_code_value": "QR-MANUAL-001"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "スキャン完了: マニュアル",
  "item": {
    "component_id": "COMP001",
    "component_name": "マニュアル",
    "qr_code_value": "QR-MANUAL-001",
    "scanned_at": "2025-11-23T10:05:00Z"
  },
  "progress": {
    "total": 2,
    "scanned": 1,
    "percentage": 50
  }
}
```

**エラーレスポンス** (既にスキャン済み):
```json
{
  "success": false,
  "error": "duplicate",
  "message": "既にスキャン済みです: マニュアル"
}
```

**エラーレスポンス** (該当なし):
```json
{
  "success": false,
  "error": "not_found",
  "message": "該当する同梱物がありません: QR-UNKNOWN-001"
}
```

#### 4. QR検品完了

```
PATCH /api/qr-inspections/:id/complete
```

**リクエスト**:
```json
{
  "notes": "検品完了。全アイテム確認済み。"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "検品が完了しました",
  "inspection": {
    "id": 1,
    "shipping_instruction_id": 1,
    "inspector_name": "山田太郎",
    "inspection_status": "completed",
    "started_at": "2025-11-23T10:00:00Z",
    "completed_at": "2025-11-23T10:10:00Z",
    "notes": "検品完了。全アイテム確認済み。"
  },
  "inventory_updated": true
}
```

---

## 実装詳細

### v2.1の主要改善機能

#### 1. waitForFirstFrame() - 初回フレーム完全描画待機

```javascript
async waitForFirstFrame() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間試行

        const checkFrame = () => {
            attempts++;

            // videoWidth/Heightが有効で、readyStateが4（完全準備完了）
            if (this.video.readyState === 4 &&
                this.video.videoWidth > 0 &&
                this.video.videoHeight > 0) {
                console.log(`[Video] First frame ready after ${attempts * 100}ms`);
                // さらに安定を待つ
                setTimeout(resolve, 500);
            } else if (attempts >= maxAttempts) {
                console.warn('[Video] First frame timeout, proceeding anyway');
                resolve(); // タイムアウトしても続行
            } else {
                setTimeout(checkFrame, 100);
            }
        };

        setTimeout(checkFrame, 100);
    });
}
```

**効果**:
- 最初のフレームが完全に描画されるまで待機
- iOS Safariでの初回QR読み取り成功率向上
- タイムアウト時も続行（ハングアップ防止）

**待機時間**: 最大5秒 + 500ms = 5.5秒

#### 2. calibrateCamera() - 段階的キャリブレーション

```javascript
async calibrateCamera() {
    if (this.calibrationAttempts >= this.maxCalibrationAttempts) {
        return this.startQRDetection();
    }

    this.calibrationAttempts++;

    // 初回は4秒、2回目以降は2秒
    const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000;
    console.log(`[Calibration] Waiting ${calibrationDelay}ms for camera stabilization...`);
    await new Promise(resolve => setTimeout(resolve, calibrationDelay));

    // ビデオストリームが完全に安定しているか確認
    const isFullyReady = this.video.readyState === 4 &&
                        this.video.videoWidth > 0 &&
                        this.video.videoHeight > 0 &&
                        !this.video.paused;  // pausedチェック追加

    if (isFullyReady) {
        console.log(`[Calibration] ✅ Success on attempt ${this.calibrationAttempts}`);
        setTimeout(() => this.startQRDetection(), 500);
    } else {
        console.warn(`[Calibration] ❌ Not ready (attempt ${this.calibrationAttempts})`);
        if (this.calibrationAttempts < this.maxCalibrationAttempts) {
            setTimeout(() => this.calibrateCamera(), 1000);
        } else {
            // 最大試行回数到達時でもQR検出を開始
            console.warn('[Calibration] ⚠️ Max attempts reached, starting anyway');
            this.startQRDetection();
        }
    }
}
```

**変更点**:
- 初回4秒、2回目以降2秒の段階的待機
- pausedチェック追加
- 詳細なログ（絵文字付き）
- 最大試行回数到達時のフォールバック処理

#### 3. BarcodeDetector間隔制御

```javascript
fallbackToManualDetection() {
    if ('BarcodeDetector' in window) {
        this.detectionMethod = 'BarcodeDetector';
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        const detectQR = async () => {
            if (this.isScanning && this.video.readyState === 4) {
                const currentTime = Date.now();
                // iOS最適化: 200ms間隔（5回/秒相当）
                if (currentTime - this.lastDetectionAttempt > 200) {
                    const barcodes = await detector.detect(this.video);
                    this.lastDetectionAttempt = currentTime;

                    if (barcodes.length > 0) {
                        console.log('[QR] Detected via BarcodeDetector:', barcodes[0].rawValue);
                        this.handleQRResult(barcodes[0].rawValue);
                        return;
                    }
                }
            }

            if (this.isScanning) {
                requestAnimationFrame(detectQR);
            }
        };

        detectQR();
        this.updateDebug('method', 'BarcodeDetector');
    } else {
        this.detectionMethod = 'none';
        this.handleError(new Error('QRコード検出機能がサポートされていません'));
    }
}
```

**改善点**:
- 200ms間隔制御（CPU負荷軽減）
- デバッグ情報更新
- より詳細なエラーメッセージ

#### 4. 拡張デバッグモード (10項目)

```javascript
toggleDebug() {
    this.debugMode = !this.debugMode;
    const debugPanel = document.getElementById('debug-info-panel');

    if (debugPanel) {
        debugPanel.style.display = this.debugMode ? 'block' : 'none';

        if (this.debugMode) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            this.updateDebug('ios', isIOS ? 'Yes' : 'No');
            this.startDebugUpdateLoop();
        } else {
            if (this.debugUpdateInterval) {
                clearInterval(this.debugUpdateInterval);
                this.debugUpdateInterval = null;
            }
        }
    }
}

startDebugUpdateLoop() {
    this.debugUpdateInterval = setInterval(() => {
        if (!this.debugMode) return;

        // アップタイム計算
        if (this.scanStartTime > 0) {
            const uptime = Math.floor((Date.now() - this.scanStartTime) / 1000);
            this.updateDebug('uptime', `${uptime}s`);
        }

        // 解像度情報
        if (this.video && this.video.videoWidth > 0) {
            this.updateDebug('resolution', `${this.video.videoWidth}x${this.video.videoHeight}`);
        }

        // スキャンレート情報
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const scanRate = isIOS ? 3 : 5;
        this.updateDebug('scanrate', `${scanRate}/sec`);

        // 検出方法
        this.updateDebug('method', this.detectionMethod);

        // カメラ情報
        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack) {
                this.updateDebug('camera', videoTrack.label || 'Unknown');
                this.updateDebug('stream', 'Connected');
            }
        }
    }, 1000);
}
```

**デバッグ情報10項目**:
1. Camera - 使用中のカメラ名
2. Resolution - ビデオ解像度
3. ReadyState - ビデオ準備状態（0-4）
4. Stream - ストリーム接続状態
5. Detection - 検出状態（Active/Stopped）
6. Frames - フレームカウント
7. Scan Rate - スキャンレート
8. Method - 検出方法（QrScanner/BarcodeDetector）
9. iOS - iOS判定
10. Uptime - スキャン開始からの経過時間

---

## トラブルシューティング

### 問題1: 検品対象が表示されない

#### 症状
- QRモーダルは開くが、検品対象アイテムが空

#### 原因
1. **APIサーバー未起動**
2. **APIレスポンスにqr_itemsが含まれない**
3. **データベースにqr_inspection_componentsテーブルが存在しない**

#### 解決策

**A. APIサーバーの起動確認**:
```bash
cd /home/user/grafana-setup
./manage.sh status

# APIサーバーが停止している場合
./manage.sh start
```

**B. APIエンドポイントの修正**:
`api/server.js`を修正して`qr_items`を含める:

```javascript
app.get('/shipping-instructions/:id', async (req, res) => {
    const { id } = req.params;

    // 出荷指示の基本情報
    const siResult = await pool.query(`
        SELECT si.*, p.product_code, p.product_name,
               sl.location_name as shipping_location_name,
               dl.location_name as delivery_location_name
        FROM shipping_instructions si
        JOIN products p ON si.product_id = p.id
        LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
        JOIN delivery_locations dl ON si.delivery_location_id = dl.id
        WHERE si.id = $1
    `, [id]);

    if (siResult.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping instruction not found' });
    }

    const shippingInstruction = siResult.rows[0];

    // QR検品対象の同梱物を取得
    const qrItemsResult = await pool.query(`
        SELECT
            id, component_id, component_name, qr_code_value,
            required_quantity, is_mandatory
        FROM qr_inspection_components
        WHERE shipping_instruction_id = $1
        ORDER BY component_name
    `, [id]);

    shippingInstruction.qr_items = qrItemsResult.rows;

    res.json(shippingInstruction);
});
```

**C. テーブルの存在確認**:
```bash
docker-compose exec postgres psql -U production_user -d production_db

# テーブル一覧
\dt

# qr_inspection_componentsが存在しない場合は作成
CREATE TABLE IF NOT EXISTS qr_inspection_components (
    id SERIAL PRIMARY KEY,
    shipping_instruction_id INTEGER REFERENCES shipping_instructions(id),
    component_id VARCHAR(50) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    qr_code_value VARCHAR(255) NOT NULL,
    required_quantity INTEGER DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 問題2: 初回QRスキャンが失敗する

#### 症状
- カメラは起動するが、最初のQRコードが認識されない
- 2回目以降は認識される

#### 原因
- カメラの初期化が完全に完了していない

#### 解決策

v2.1の機能を確認:

1. **waitForFirstFrame()が実装されているか**:
```javascript
// qr-inspection.htmlで検索
// "waitForFirstFrame" が存在すること
```

2. **calibrateCamera()の初回待機時間が4秒か**:
```javascript
const calibrationDelay = this.calibrationAttempts === 1 ? 4000 : 2000;
```

3. **ブラウザコンソールログ確認**:
```
期待されるログ:
[Video] First frame ready after XXXms
[Calibration] Waiting 4000ms for camera stabilization...
[Calibration] ✅ Success on attempt 1
```

v2.0の場合は、v2.1へのアップグレードを推奨。

### 問題3: 連続スキャンが動作しない

#### 症状
- 1つ目のQRコードは認識されるが、2つ目以降が認識されない

#### 解決策

```javascript
async function handleQRScanResult(qrCode) {
    displayLastScannedQR(qrCode);
    const success = await processQRScan(qrCode);

    const hasPending = qrContext?.items?.some(item => item.status === 'pending');
    if (success && hasPending && safariScanner && qrVideoElement) {
        // 連続スキャンに備えて少し待機してから再開
        updateQRStatusMessage('次のQRコードの準備中...');
        setTimeout(async () => {
            try {
                if (qrContext && safariScanner && qrVideoElement) {
                    // iPhone Safari向けに再初期化
                    safariScanner.isScanning = true;
                    await safariScanner.calibrateCamera();
                    updateQRStatusMessage('次のQRコードをスキャンしてください。');

                    // スキャンライン再表示
                    if (window.qrUIElements && window.qrUIElements.scanLine) {
                        window.qrUIElements.scanLine.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('restart scanner error:', error);
                updateQRStatusMessage('カメラの再開に失敗しました。');
                toggleQRControls({ scanning: false });
            }
        }, 1000);
    }
}
```

**ポイント**:
- 1秒待機後に再キャリブレーション
- `safariScanner.isScanning = true`を設定
- スキャンラインの再表示

### 問題4: デバッグモードが表示されない

#### 症状
- 「Debug」ボタンを押してもデバッグパネルが表示されない

#### 解決策

v2.1機能の確認:

1. **HTMLにデバッグパネルが存在するか**:
```html
<div id="debug-info-panel" class="debug-info-panel" style="display:none;">
    <div class="debug-title">🐛 Debug Info</div>
    ...
</div>
```

2. **CSSが定義されているか**:
```css
.debug-info-panel {
    position: fixed;
    top: 80px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    ...
}
```

3. **toggleDebug()メソッドが実装されているか**:
```javascript
toggleDebug() {
    this.debugMode = !this.debugMode;
    const debugPanel = document.getElementById('debug-info-panel');
    ...
}
```

v2.0の場合は、v2.1へのアップグレードが必要。

### 問題5: カメラ切り替えができない

#### 症状
- 「カメラ切替」ボタンを押してもカメラが切り替わらない

#### 解決策

v2.1機能の確認:

1. **switchCamera()メソッドが実装されているか**:
```javascript
async switchCamera() {
    if (this.cameras.length <= 1) {
        this.showStatus('切り替え可能なカメラがありません', 'info');
        return;
    }

    this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
    const wasScanning = this.isScanning;
    this.cleanupResources();

    if (wasScanning) {
        setTimeout(async () => {
            this.createCameraUI();
            await this.initializeCamera();
        }, 500);
    }
}
```

2. **複数カメラの検出**:
```javascript
// ブラウザコンソールで確認
console.log(this.cameras);
// 1つしか検出されていない場合は、デバイス自体にカメラが1つのみ
```

---

## 付録

### A. データベーステーブル定義

#### qr_inspection_components (QR検品対象マスタ)
```sql
CREATE TABLE qr_inspection_components (
    id SERIAL PRIMARY KEY,
    shipping_instruction_id INTEGER REFERENCES shipping_instructions(id),
    component_id VARCHAR(50) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    qr_code_value VARCHAR(255) NOT NULL,
    required_quantity INTEGER DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### qr_inspections (QR検品記録)
```sql
CREATE TABLE qr_inspections (
    id SERIAL PRIMARY KEY,
    shipping_instruction_id INTEGER REFERENCES shipping_instructions(id),
    inspector_name VARCHAR(100) NOT NULL,
    inspection_status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);
```

#### qr_inspection_items (QRスキャン実績)
```sql
CREATE TABLE qr_inspection_items (
    id SERIAL PRIMARY KEY,
    qr_inspection_id INTEGER REFERENCES qr_inspections(id),
    qr_inspection_component_id INTEGER REFERENCES qr_inspection_components(id),
    qr_code_value VARCHAR(255) NOT NULL,
    scanned_quantity INTEGER DEFAULT 1,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by VARCHAR(100)
);
```

### B. テストデータ

```sql
-- 製品A (PROD001) の検品対象
INSERT INTO qr_inspection_components
(shipping_instruction_id, component_id, component_name, qr_code_value, required_quantity)
VALUES
(1, 'COMP001', 'マニュアル', 'QR-MANUAL-001', 1),
(1, 'COMP002', '保証書', 'QR-WARRANTY-001', 1),
(1, 'COMP003', 'パーツリスト', 'QR-PARTS-001', 1);

-- 製品B (PROD002) の検品対象
INSERT INTO qr_inspection_components
(shipping_instruction_id, component_id, component_name, qr_code_value, required_quantity)
VALUES
(2, 'COMP004', 'アダプター', 'QR-ADAPTER-002', 1),
(2, 'COMP005', 'マニュアル', 'QR-MANUAL-002', 1),
(2, 'COMP006', '保証書', 'QR-WARRANTY-002', 1),
(2, 'COMP007', 'スタンド', 'QR-STAND-002', 1);
```

### C. v2.0 → v2.1 アップグレード手順

v2.0を使用している場合、v2.1にアップグレードすることで以下の改善が得られます:

**期待される効果**:
- iOS Safari初回QR成功率: 75% → 95% (+27%)
- カメラ初期化安定性: 大幅改善
- デバッグ容易性: 10倍向上
- CPU負荷: 改善

**手順**:
1. `qr-inspection.html`のバックアップ作成
2. v2.1版で上書き
3. 動作確認（iOS Safariでテスト推奨）

---

**作成日**: 2025-11-23
**作成者**: システム統合ドキュメント自動生成
**参照ドキュメント**:
- QR_INSPECTION_VERSION_COMPARISON.md
- QR_INSPECTION_REBUILD_REPORT.md
- QR_INSPECTION_V21_COMPLETE_REPORT.md
- QR_INSPECTION_V21_UPGRADE_GUIDE.md
- QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md
- QR_IMPLEMENTATION_REPORT.md
- その他QR検品システム関連ドキュメント
