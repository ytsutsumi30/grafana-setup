# QR同梱物検品画面 - 問題分析レポート
**作成日時**: 2025年10月16日  
**分析対象**: 別タブ表示変更後の検品対象表示問題

## 🔴 報告された問題

### 問題1: 検品対象が表示されない
> QR同梱物検品画面ダイアログ画面ではなく、別タブでの表示に変更したために出荷指示毎の検品対象が表示されなくなった。

### 問題2: QRスキャン成功率の問題（既知）
> safari.htmlのQRSCANですが、画面切り替えや再SCANで成功することが多いです。
> QR同梱物検品はQRSCANは読み取りが成功しません。

**問題2の状態**: ✅ 修正済み（スキャンレート最適化 3回/秒）

---

## 🔍 問題1の詳細分析

### 現状確認

#### 1. **APIエンドポイントの問題**

**確認結果**:
```bash
# 本番環境のAPIサーバー状態
$ docker-compose ps
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS
# → 空（APIサーバーが起動していない）
```

**根本原因**: 🔴 **APIサーバー自体が起動していない**

#### 2. **qr-inspection-app.jsのAPIコール**

**コード**: `/web/js/qr-inspection-app.js` (行43-48)
```javascript
async function loadQRInspectionData() {
    try {
        const response = await fetch(`${API_BASE_URL}/shipping-instructions/${shippingInstructionId}`);
        if (!response.ok) {
            throw new Error('出荷指示データの取得に失敗しました');
        }
```

**問題点**:
- `API_BASE_URL = '/api'` → `/api/shipping-instructions/1` にリクエスト
- しかし、APIサーバーが起動していないため、レスポンスが返らない
- エラーハンドリングでトーストメッセージが表示されるはず

#### 3. **APIエンドポイントの実装確認**

**server.js** (行402-428):
```javascript
app.get('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   ...
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            ...
            WHERE si.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        res.json(result.rows[0]);
```

**問題点**:
- このエンドポイントは `qr_items` を含んでいない
- レスポンスに `qr_items` フィールドが存在しない
- `qr-inspection-app.js` は `detail.qr_items` を期待している

---

## 🎯 根本原因の特定

### 原因1: APIサーバー未起動 (最優先)
- Docker Composeで管理されていない、またはサービス名が異なる
- APIサーバーが停止している

### 原因2: APIレスポンスにqr_itemsが含まれない
- `/api/shipping-instructions/:id` エンドポイントが `qr_items` を返していない
- 別のエンドポイント `/api/shipping-instructions/:id/components` が必要？

### 原因3: データベースにqr_itemsテーブルが存在しない可能性
- QR検品用のテーブル構造が未実装

---

## 🔧 解決策

### 解決策1: APIサーバーの起動確認と修正 (最優先)

#### ステップ1: Docker Compose設定の確認
```bash
# docker-compose.ymlにAPIサービスが定義されているか確認
cat docker-compose.yml | grep -A 10 "api:"
```

#### ステップ2: APIサーバーの起動
```bash
cd production-management
sudo docker-compose up -d api  # または該当するサービス名
```

---

### 解決策2: APIエンドポイントの修正

#### オプションA: 既存エンドポイントを拡張

**server.js** を修正して `qr_items` を含める:

```javascript
app.get('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 出荷指示の基本情報
        const siQuery = `
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   sl.location_code as shipping_location_code,
                   dl.location_name as delivery_location_name,
                   dl.location_code as delivery_location_code,
                   dl.address as delivery_address,
                   dl.phone as delivery_phone,
                   dl.contact_person as delivery_contact,
                   dl.delivery_method
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
            JOIN delivery_locations dl ON si.delivery_location_id = dl.id
            WHERE si.id = $1
        `;
        
        const siResult = await pool.query(siQuery, [id]);
        
        if (siResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        const shippingInstruction = siResult.rows[0];
        
        // QR検品対象の同梱物を取得
        const qrItemsQuery = `
            SELECT 
                qic.id,
                qic.component_id,
                qic.component_name,
                qic.qr_code_value,
                qic.required_quantity,
                qic.is_mandatory,
                COALESCE(
                    (SELECT COUNT(*) 
                     FROM qr_inspection_items qii 
                     WHERE qii.qr_inspection_component_id = qic.id 
                       AND qii.scanned_at IS NOT NULL
                    ), 0
                ) as scanned_count
            FROM qr_inspection_components qic
            WHERE qic.shipping_instruction_id = $1
            ORDER BY qic.component_name
        `;
        
        const qrItemsResult = await pool.query(qrItemsQuery, [id]);
        
        // qr_items を追加
        shippingInstruction.qr_items = qrItemsResult.rows;
        
        res.json(shippingInstruction);
    } catch (error) {
        logger.error('Error fetching shipping instruction detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

#### オプションB: 専用エンドポイントを使用

フロントエンドで2回APIコールを実行:
```javascript
// 1. 出荷指示の基本情報
const siResponse = await fetch(`${API_BASE_URL}/shipping-instructions/${id}`);
const siData = await siResponse.json();

// 2. QR検品対象の同梱物
const qrItemsResponse = await fetch(`${API_BASE_URL}/shipping-instructions/${id}/qr-components`);
const qrItems = await qrItemsResponse.json();

qrContext = {
    shippingInstructionId: siData.id,
    instructionCode: siData.instruction_id,
    expectedItems: qrItems
};
```

---

### 解決策3: データベーステーブルの確認と作成

#### 必要なテーブル構造

**qr_inspection_components** (QR検品対象マスタ):
```sql
CREATE TABLE IF NOT EXISTS qr_inspection_components (
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

**qr_inspection_items** (QRスキャン実績):
```sql
CREATE TABLE IF NOT EXISTS qr_inspection_items (
    id SERIAL PRIMARY KEY,
    qr_inspection_id INTEGER REFERENCES qr_inspections(id),
    qr_inspection_component_id INTEGER REFERENCES qr_inspection_components(id),
    qr_code_value VARCHAR(255) NOT NULL,
    scanned_quantity INTEGER DEFAULT 1,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by VARCHAR(100)
);
```

**qr_inspections** (QR検品記録):
```sql
CREATE TABLE IF NOT EXISTS qr_inspections (
    id SERIAL PRIMARY KEY,
    shipping_instruction_id INTEGER REFERENCES shipping_instructions(id),
    inspector_name VARCHAR(100) NOT NULL,
    inspection_status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);
```

---

## 🚀 推奨修正手順

### フェーズ1: 緊急対応（即時）

1. **APIサーバーの起動確認**
   ```bash
   ssh ec2-user@57.180.82.161
   cd production-management
   sudo docker-compose ps
   # APIサービスが起動していない場合
   sudo docker-compose up -d
   ```

2. **モックデータで動作確認**
   
   一時的にフロントエンドで固定データを使用:
   ```javascript
   // qr-inspection-app.js に追加
   async function loadQRInspectionData() {
       try {
           // 🔴 本番前削除: モックデータ
           if (true) { // デバッグフラグ
               qrContext = {
                   shippingInstructionId: shippingInstructionId,
                   instructionCode: 'SHIP001',
                   expectedItems: [
                       {
                           component_id: 'COMP001',
                           component_name: 'マニュアル',
                           qr_code_value: 'QR-MANUAL-001',
                           required_quantity: 1,
                           is_mandatory: true
                       },
                       {
                           component_id: 'COMP002',
                           component_name: '保証書',
                           qr_code_value: 'QR-WARRANTY-001',
                           required_quantity: 1,
                           is_mandatory: true
                       }
                   ]
               };
               renderQRInspectionContent(qrContext);
               return;
           }
           
           // 既存のAPIコール
           const response = await fetch(...);
   ```

### フェーズ2: 本格対応（1-2日）

1. **データベーステーブルの作成**
   - `qr_inspection_components` テーブル
   - `qr_inspections` テーブル
   - `qr_inspection_items` テーブル

2. **APIエンドポイントの実装**
   - GET `/api/shipping-instructions/:id` に `qr_items` を追加
   - POST `/api/qr-inspections` (検品開始)
   - POST `/api/qr-inspections/:id/items` (QRスキャン登録)
   - PATCH `/api/qr-inspections/:id/complete` (検品完了)

3. **テストデータの投入**
   ```sql
   INSERT INTO qr_inspection_components 
   (shipping_instruction_id, component_id, component_name, qr_code_value, required_quantity)
   VALUES
   (1, 'COMP001', 'マニュアル', 'QR-MANUAL-001', 1),
   (1, 'COMP002', '保証書', 'QR-WARRANTY-001', 1),
   (1, 'COMP003', 'パーツリスト', 'QR-PARTS-001', 1);
   ```

---

## 📝 修正ファイルリスト

### 即時修正（モックデータ対応）
- [ ] `web/js/qr-inspection-app.js` - モックデータ追加

### 本格修正
- [ ] `postgres/init/03-qr-inspection-tables.sql` - テーブル定義
- [ ] `api/server.js` - APIエンドポイント修正/追加
- [ ] `web/js/qr-inspection-app.js` - モックデータ削除、エラーハンドリング強化

---

## 🧪 テスト計画

### テスト1: モックデータでの動作確認
- [ ] qr-inspection.html?id=1 を開く
- [ ] 検品対象一覧が表示される
- [ ] QRスキャンが動作する
- [ ] スキャン結果がUIに反映される

### テスト2: API統合テスト
- [ ] APIから正しくデータを取得できる
- [ ] QRスキャン結果がDBに保存される
- [ ] 検品完了処理が動作する

---

## 📊 まとめ

### 主要な問題
1. 🔴 **APIサーバー未起動** - 最優先で対応
2. 🟡 **APIレスポンスに qr_items が含まれない** - エンドポイント修正が必要
3. 🟡 **データベーステーブル未実装** - QR検品機能の本格実装が必要

### 即時対応
- モックデータで動作確認（30分）
- スキャンレート最適化の効果確認

### 本格対応
- データベース設計と実装（1日）
- API実装（1日）
- 統合テスト（半日）

---

**次のアクション**: モックデータを追加して動作確認
