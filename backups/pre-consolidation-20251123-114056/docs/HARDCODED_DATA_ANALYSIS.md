# データベース非取得データ分析レポート

**対象ファイル:** index.html / qr-inspection.html
**分析日:** 2025-11-13
**分析者:** システム開発チーム

---

## 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [index.html の分析結果](#indexhtml-の分析結果)
3. [qr-inspection.html の分析結果](#qr-inspectionhtml-の分析結果)
4. [推奨される改修内容](#推奨される改修内容)
5. [実装優先度マトリクス](#実装優先度マトリクス)

---

## エグゼクティブサマリー

index.html と qr-inspection.html の分析を実施した結果、**合計9項目**のデータがハードコーディングされており、データベースから動的に取得されていないことが判明しました。

### 主要な問題点

| ファイル | 問題数 | 影響度 |
|---------|-------|--------|
| index.html | 3項目 | 中 |
| qr-inspection.html | 6項目 | 高 |

### ビジネスインパクト

- **保守性の低下**: チェック項目の変更に都度コード修正が必要
- **拡張性の欠如**: 製品や顧客ごとのカスタマイズが困難
- **データ整合性リスク**: ハードコードとDBデータの不整合の可能性
- **ユーザビリティ低下**: 検品者名の手入力によるタイプミス

---

## index.html の分析結果

### 1. 検品注意事項のハードコーディング

**場所:** `web/index.html` 278-295行目

**現状のハードコーディング:**
```html
<div class="card-body">
    <ul class="list-unstyled">
        <li class="mb-2">
            <i class="fas fa-check-circle text-success me-2"></i>
            梱包材の損傷確認
        </li>
        <li class="mb-2">
            <i class="fas fa-check-circle text-success me-2"></i>
            ラベル貼り付け位置
        </li>
        <li class="mb-2">
            <i class="fas fa-check-circle text-success me-2"></i>
            数量の最終確認
        </li>
        <li class="mb-2">
            <i class="fas fa-check-circle text-success me-2"></i>
            出荷書類の完備
        </li>
    </ul>
</div>
```

**問題点:**
- 注意事項の追加・変更にHTMLの直接編集が必要
- 製品カテゴリや顧客ごとに注意事項を変えられない
- 多言語対応が困難

**本来取得すべきテーブル（未実装）:**
```sql
CREATE TABLE inspection_notice_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50),  -- 'shipping', 'production', 'quality'
    notice_text VARCHAR(255) NOT NULL,
    icon_class VARCHAR(50),  -- 'fa-check-circle', etc.
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**推奨API:**
```javascript
GET /api/inspection-notices?category=shipping
Response: [
    { id: 1, notice_text: "梱包材の損傷確認", icon_class: "fa-check-circle", display_order: 1 },
    { id: 2, notice_text: "ラベル貼り付け位置", icon_class: "fa-check-circle", display_order: 2 },
    ...
]
```

---

### 2. 検品チェック項目のハードコーディング

**場所:** `web/js/index-app.js` 542-567行目（動的生成部分）

**現状のハードコーディング:**
```javascript
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="labelCheck">
    <label class="form-check-label" for="labelCheck">ラベル確認完了</label>
</div>
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="packagingCheck">
    <label class="form-check-label" for="packagingCheck">梱包状態確認</label>
</div>
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="documentCheck">
    <label class="form-check-label" for="documentCheck">出荷書類確認</label>
</div>
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="qualityCheck">
    <label class="form-check-label" for="qualityCheck">品質基準適合</label>
</div>
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="quantityCheck">
    <label class="form-check-label" for="quantityCheck">数量一致確認</label>
</div>
<div class="form-check mb-2">
    <input class="form-check-input" type="checkbox" id="finalApproval">
    <label class="form-check-label" for="finalApproval"><strong>最終承認</strong></label>
</div>
```

**問題点:**
- チェック項目の追加・変更にJavaScriptの修正が必要
- 製品や業種に応じたチェック項目のカスタマイズができない
- チェック項目の履歴管理ができない

**本来取得すべきテーブル（未実装）:**
```sql
CREATE TABLE inspection_checklist_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    inspection_type VARCHAR(50) NOT NULL,  -- 'shipping', 'production', 'qc'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspection_checklist_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES inspection_checklist_templates(id),
    item_code VARCHAR(50) UNIQUE NOT NULL,  -- 'labelCheck', 'packagingCheck', etc.
    item_label VARCHAR(255) NOT NULL,       -- 'ラベル確認完了', '梱包状態確認', etc.
    is_required BOOLEAN DEFAULT false,      -- 必須チェック項目かどうか
    display_order INTEGER DEFAULT 0,
    column_position INTEGER DEFAULT 1,      -- 1列目 or 2列目
    is_bold BOOLEAN DEFAULT false,          -- ラベルを太字にするか
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**推奨API:**
```javascript
GET /api/inspection-checklists?type=shipping
Response: {
    template_name: "出荷検品チェックリスト",
    items: [
        { id: 1, item_code: "labelCheck", item_label: "ラベル確認完了", is_required: false, display_order: 1, column_position: 1, is_bold: false },
        { id: 2, item_code: "packagingCheck", item_label: "梱包状態確認", is_required: false, display_order: 2, column_position: 1, is_bold: false },
        { id: 3, item_code: "documentCheck", item_label: "出荷書類確認", is_required: false, display_order: 3, column_position: 1, is_bold: false },
        { id: 4, item_code: "qualityCheck", item_label: "品質基準適合", is_required: false, display_order: 4, column_position: 2, is_bold: false },
        { id: 5, item_code: "quantityCheck", item_label: "数量一致確認", is_required: false, display_order: 5, column_position: 2, is_bold: false },
        { id: 6, item_code: "finalApproval", item_label: "最終承認", is_required: true, display_order: 6, column_position: 2, is_bold: true }
    ]
}
```

---

### 3. 検品者名の手入力

**場所:** `web/js/index-app.js` 512-513行目

**現状の実装:**
```javascript
<div class="mb-3">
    <label class="form-label" for="inspector">検品者名 *</label>
    <input type="text" class="form-control" id="inspector" required>
</div>
```

**問題点:**
- タイプミスによるデータ品質の低下
- 検品者の統計分析が困難（表記揺れが発生）
- 過去の検品者名が参照できない

**本来取得すべきデータソース:**
- 既存テーブル: `inspections.inspector_name` または `qr_inspections.inspector_name` から DISTINCT で取得
- 将来的な実装: ユーザーマスタテーブル

**推奨API:**
```javascript
GET /api/inspectors/recent
Response: [
    { name: "田中太郎", last_inspection: "2025-11-13T10:30:00Z", inspection_count: 45 },
    { name: "佐藤花子", last_inspection: "2025-11-13T09:15:00Z", inspection_count: 38 },
    { name: "山田次郎", last_inspection: "2025-11-12T16:45:00Z", inspection_count: 52 }
]
```

**推奨UI:**
```html
<div class="mb-3">
    <label class="form-label" for="inspector">検品者名 *</label>
    <input type="text" class="form-control" id="inspector" list="inspector-list" required>
    <datalist id="inspector-list">
        <!-- APIから動的に生成 -->
        <option value="田中太郎">
        <option value="佐藤花子">
        <option value="山田次郎">
    </datalist>
</div>
```

---

## qr-inspection.html の分析結果

### 1. 検品者名のドロップダウン選択肢（ハードコーディング）

**場所:** `web/qr-inspection.html` 244-249行目

**現状のハードコーディング:**
```html
<select class="form-select" id="qr-inspector-name" required>
    <option value="田中太郎" selected>田中太郎</option>
    <option value="佐藤花子">佐藤花子</option>
    <option value="山田次郎">山田次郎</option>
</select>
```

**問題点:**
- 新しい検品者が追加されるたびにHTMLの修正が必要
- 退職者や異動者の削除漏れが発生する可能性
- 検品者の権限管理ができない

**本来取得すべきテーブル:**
同上（index.htmlの検品者名と同様）

**推奨実装:**
```javascript
// ページロード時にAPIから検品者リストを取得
async function loadInspectors() {
    const response = await fetch('/api/inspectors/recent');
    const inspectors = await response.json();

    const select = document.getElementById('qr-inspector-name');
    select.innerHTML = inspectors.map(inspector =>
        `<option value="${inspector.name}">${inspector.name} (${inspector.inspection_count}件)</option>`
    ).join('');
}
```

---

### 2. 検品対象アイテムのモックデータ（ハードコーディング）

**場所:** `web/qr-inspection.html` 751-757行目（JavaScript内）

**現状のハードコーディング:**
```javascript
loadMockData() {
    // モックデータ: 実際のシステムではAPIから取得
    this.targetItems = [
        { code: 'ITEM001', name: '商品A', quantity: 1 },
        { code: 'ITEM002', name: '商品B', quantity: 2 },
        { code: 'ITEM003', name: '商品C', quantity: 1 },
        { code: 'ITEM004', name: '商品D', quantity: 3 },
        { code: 'ITEM005', name: '商品E', quantity: 1 }
    ];

    this.renderItemsList();
    this.updateProgress();
}
```

**問題点:**
- 実際の出荷指示とは無関係なダミーデータ
- 製品構成部品マスタ（product_components）が活用されていない
- QRコードの値が実際のマスタと一致しない

**本来取得すべきテーブル:**
```sql
-- 既存テーブル: product_components
SELECT
    pc.id,
    pc.component_name,
    pc.qr_code,
    pc.component_type,
    pc.is_required
FROM product_components pc
INNER JOIN shipping_instructions si ON si.product_id = pc.product_id
WHERE si.id = ?
ORDER BY
    CASE pc.component_type
        WHEN 'main' THEN 1
        WHEN 'accessory' THEN 2
        WHEN 'manual' THEN 3
        WHEN 'warranty' THEN 4
    END;
```

**推奨API（既存）:**
```javascript
// 既に実装済み: GET /api/shipping-instructions/:id/components
async function loadInspectionData(shippingInstructionId) {
    const response = await fetch(`/api/shipping-instructions/${shippingInstructionId}/components`);
    const components = await response.json();

    this.targetItems = components.map(comp => ({
        code: comp.qr_code,
        name: comp.component_name,
        type: comp.component_type,
        required: comp.is_required
    }));

    this.renderItemsList();
    this.updateProgress();
}
```

**優先度:** 🔴 **最高（Critical）**

---

### 3. URLパラメータからの出荷指示ID取得の欠落

**場所:** `web/qr-inspection.html` JavaScript全体

**現状:** URLパラメータ `?id=XXX` を取得する処理が存在しない

**問題点:**
- index.html からリンクで遷移しても出荷指示情報が引き継がれない
- 常にモックデータが表示される
- 実際の検品業務で使用不可能

**推奨実装:**
```javascript
class Html5QRCodeInspection {
    constructor() {
        // ... existing code ...

        // URLパラメータから出荷指示IDを取得
        this.shippingInstructionId = this.getShippingInstructionId();

        if (!this.shippingInstructionId) {
            alert('出荷指示IDが指定されていません。検品システムに戻ります。');
            window.close();
            return;
        }

        this.init();
    }

    getShippingInstructionId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async init() {
        this.logVersionInfo();
        this.initElements();
        this.initEventListeners();
        this.initPageLifecycleHandling();

        // モックデータの代わりにAPIからデータを取得
        await this.loadShippingInstructionData();
    }

    async loadShippingInstructionData() {
        try {
            // 出荷指示詳細 + 製品構成部品を取得
            const response = await fetch(`/api/shipping-instructions/${this.shippingInstructionId}/qr-inspection-data`);

            if (!response.ok) {
                throw new Error(`出荷指示の取得に失敗しました (HTTP ${response.status})`);
            }

            const data = await response.json();

            // 出荷指示情報を保存
            this.shippingData = data.shipping;
            this.targetItems = data.components.map(comp => ({
                code: comp.qr_code,
                name: comp.component_name,
                type: comp.component_type,
                required: comp.is_required,
                id: comp.id
            }));
            this.inventoryData = data.inventory;

            // UIを更新
            this.renderShippingInfo();
            this.renderInventoryInfo();
            this.renderItemsList();
            this.updateProgress();

        } catch (error) {
            console.error('Failed to load shipping instruction data:', error);
            alert('出荷指示データの読み込みに失敗しました。');
        }
    }
}
```

**優先度:** 🔴 **最高（Critical）**

---

### 4. 出荷指示情報の表示欠落

**場所:** `web/qr-inspection.html` 全体

**現状:** 出荷指示に関する情報が一切表示されていない

**問題点:**
- 検品者が何の製品を検品しているか分からない
- 出荷数量、顧客名、出荷日などの基本情報が確認できない
- 誤った製品のQRコードをスキャンしても気づきにくい

**本来表示すべき情報（shipping_instructions テーブルから取得）:**
- 出荷指示番号 (instruction_id)
- 製品名 (products.product_name)
- 製品コード (products.product_code)
- 出荷数量 (quantity)
- 顧客名 (customer_name)
- 配送先 (delivery_locations.location_name)
- 出荷日 (shipping_date)
- 優先度 (priority)
- 特記事項 (notes)

**推奨UI（HTMLに追加）:**
```html
<div class="col-lg-12 mb-4">
    <div class="card shadow-sm border-primary">
        <div class="card-header bg-primary text-white">
            <h5 class="mb-0">
                <i class="fas fa-info-circle me-2"></i>出荷指示情報
            </h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>出荷指示番号:</strong> <span id="instruction-id">-</span></p>
                    <p><strong>製品:</strong> <span id="product-name">-</span> (<span id="product-code">-</span>)</p>
                    <p><strong>出荷数量:</strong> <span id="shipping-quantity">-</span>個</p>
                    <p><strong>顧客:</strong> <span id="customer-name">-</span></p>
                </div>
                <div class="col-md-6">
                    <p><strong>配送先:</strong> <span id="delivery-location">-</span></p>
                    <p><strong>出荷日:</strong> <span id="shipping-date">-</span></p>
                    <p><strong>優先度:</strong> <span id="priority-badge" class="badge">-</span></p>
                    <p><strong>特記事項:</strong> <span id="notes">-</span></p>
                </div>
            </div>
        </div>
    </div>
</div>
```

**推奨JavaScript（データバインディング）:**
```javascript
renderShippingInfo() {
    if (!this.shippingData) return;

    document.getElementById('instruction-id').textContent = this.shippingData.instruction_id;
    document.getElementById('product-name').textContent = this.shippingData.product_name;
    document.getElementById('product-code').textContent = this.shippingData.product_code;
    document.getElementById('shipping-quantity').textContent = this.shippingData.quantity.toLocaleString();
    document.getElementById('customer-name').textContent = this.shippingData.customer_name || '未設定';
    document.getElementById('delivery-location').textContent = this.shippingData.delivery_location_name || '未設定';
    document.getElementById('shipping-date').textContent = this.formatDate(this.shippingData.shipping_date);

    const priorityBadge = document.getElementById('priority-badge');
    const priorityMap = {
        'high': { text: '高優先度', class: 'bg-danger' },
        'normal': { text: '通常', class: 'bg-primary' },
        'low': { text: '低優先度', class: 'bg-secondary' }
    };
    const priority = priorityMap[this.shippingData.priority] || priorityMap['normal'];
    priorityBadge.textContent = priority.text;
    priorityBadge.className = `badge ${priority.class}`;

    document.getElementById('notes').textContent = this.shippingData.notes || 'なし';
}
```

**優先度:** 🔴 **最高（Critical）**

---

### 5. 在庫情報の表示欠落

**場所:** `web/qr-inspection.html` 全体

**現状:** 在庫情報が一切表示されていない

**問題点:**
- 検品後の在庫状況が確認できない
- 在庫不足のリスクが事前に検知できない
- 検品完了後の在庫減算の結果が見えない

**本来表示すべき情報（inventory テーブルから取得）:**
- 現在庫 (current_stock)
- 引当済 (reserved_stock)
- 利用可能在庫 (available_stock) ※生成列
- 検品後予定在庫 (current_stock - 出荷数量)

**推奨UI（HTMLに追加）:**
```html
<div class="col-lg-6 mb-4">
    <div class="card shadow-sm border-info">
        <div class="card-header bg-info text-white">
            <h5 class="mb-0">
                <i class="fas fa-warehouse me-2"></i>在庫情報
            </h5>
        </div>
        <div class="card-body">
            <div class="row text-center">
                <div class="col-6">
                    <h4 class="text-primary" id="current-stock">-</h4>
                    <small class="text-muted">現在庫</small>
                </div>
                <div class="col-6">
                    <h4 class="text-success" id="available-stock">-</h4>
                    <small class="text-muted">利用可能在庫</small>
                </div>
            </div>
            <hr>
            <div class="text-center">
                <h5 class="text-warning" id="predicted-stock">-</h5>
                <small class="text-muted">検品後予定在庫</small>
            </div>
            <div id="low-stock-warning" class="alert alert-warning mt-3" style="display: none;">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>警告:</strong> 検品後の在庫が不足する可能性があります
            </div>
        </div>
    </div>
</div>
```

**推奨JavaScript（データバインディング）:**
```javascript
renderInventoryInfo() {
    if (!this.inventoryData) return;

    document.getElementById('current-stock').textContent = this.inventoryData.current_stock.toLocaleString();
    document.getElementById('available-stock').textContent = this.inventoryData.available_stock.toLocaleString();

    const predictedStock = this.inventoryData.current_stock - this.shippingData.quantity;
    document.getElementById('predicted-stock').textContent = predictedStock.toLocaleString();

    // 在庫不足警告
    const warningElement = document.getElementById('low-stock-warning');
    if (predictedStock < 10) {  // 閾値は設定により変更可能
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}
```

**優先度:** 🟡 **高（High）**

---

### 6. バージョン情報のハードコーディング

**場所:** `web/qr-inspection.html` 337-338行目、363-365行目

**現状のハードコーディング:**
```html
<!-- フッター -->
<small class="text-muted ms-2" id="version-info">
    v<span id="app-version">2.1.1</span>
    (<span id="build-date">2025-10-18</span>)
</small>

<!-- JavaScript内 -->
constructor() {
    this.version = '3.0.0';
    this.buildDate = '2025-10-24';
    this.gitCommit = 'html5-qrcode';
    // ...
}
```

**問題点:**
- リリースごとに手動で書き換えが必要
- HTML側とJavaScript側でバージョンが不一致になる可能性
- Gitコミットハッシュとの紐付けができない

**本来取得すべき方法:**

**Option 1: ビルド時に自動生成**
```javascript
// webpack.config.js または vite.config.js
plugins: [
    new webpack.DefinePlugin({
        '__APP_VERSION__': JSON.stringify(require('./package.json').version),
        '__BUILD_DATE__': JSON.stringify(new Date().toISOString()),
        '__GIT_COMMIT__': JSON.stringify(
            require('child_process').execSync('git rev-parse --short HEAD').toString().trim()
        )
    })
]
```

**Option 2: API経由で取得**
```javascript
GET /api/system/version
Response: {
    version: "2.1.1",
    build_date: "2025-11-13T10:30:00Z",
    git_commit: "5c15b04",
    environment: "production"
}
```

**Option 3: メタタグから取得（現在部分的に実装済み）**
```html
<meta name="version" content="3.0.0">
<meta name="build-date" content="2025-10-24">
<meta name="library" content="html5-qrcode">
```

```javascript
const version = document.querySelector('meta[name="version"]')?.content || 'unknown';
const buildDate = document.querySelector('meta[name="build-date"]')?.content || 'unknown';
```

**優先度:** 🟢 **低（Low）** - システム動作には影響しないが、運用効率は向上

---

## 推奨される改修内容

### 優先度：最高（Critical）🔴

#### 1. qr-inspection.html のAPI統合

**影響範囲:** qr-inspection.html 全体
**工数見積:** 2-3日
**担当:** フロントエンド + バックエンド

**実装タスク:**
1. URLパラメータ処理の実装（`?id=XXX`）
2. 出荷指示詳細APIの呼び出し
3. 製品構成部品APIの呼び出し
4. 在庫情報APIの呼び出し
5. UI要素の追加（出荷指示情報、在庫情報）
6. データバインディングの実装
7. エラーハンドリングの追加

**必要なAPIエンドポイント（新規）:**
```javascript
GET /api/shipping-instructions/:id/qr-inspection-data
Response: {
    shipping: {
        instruction_id: "SHIP001",
        product_name: "製品A",
        product_code: "PROD001",
        quantity: 50,
        customer_name: "ABC商事",
        delivery_location_name: "東京営業所",
        shipping_date: "2024-08-27",
        priority: "high",
        notes: "緊急出荷"
    },
    components: [
        { id: 1, component_name: "製品本体", qr_code: "QR-MAIN-PROD001", component_type: "main", is_required: true },
        { id: 2, component_name: "製品付属品（ケーブル）", qr_code: "QR-ACC-CABLE001", component_type: "accessory", is_required: true },
        { id: 3, component_name: "製品マニュアル", qr_code: "QR-MAN-PROD001", component_type: "manual", is_required: true }
    ],
    inventory: {
        current_stock: 75,
        reserved_stock: 50,
        available_stock: 25,
        predicted_stock_after: 25  // current_stock - shipping.quantity
    }
}
```

**テストケース:**
- [ ] URLパラメータなしでアクセス → エラーメッセージ表示
- [ ] 存在しない出荷指示ID → 404エラー
- [ ] 正常な出荷指示ID → データ正常表示
- [ ] 製品構成部品が0件 → エラーメッセージ
- [ ] QRコードスキャン → 正常に照合
- [ ] 検品完了 → 在庫減算確認

---

#### 2. 検品者名の動的取得（index.html + qr-inspection.html）

**影響範囲:** index.html, qr-inspection.html
**工数見積:** 0.5日
**担当:** バックエンド + フロントエンド

**実装タスク:**
1. 検品者リスト取得APIの実装
2. index.html: テキスト入力 → datalist付き入力に変更
3. qr-inspection.html: 固定select → 動的selectに変更

**必要なAPIエンドポイント（新規）:**
```javascript
GET /api/inspectors/recent?limit=20
Response: [
    { name: "田中太郎", last_inspection: "2025-11-13T10:30:00Z", inspection_count: 45 },
    { name: "佐藤花子", last_inspection: "2025-11-13T09:15:00Z", inspection_count: 38 },
    { name: "山田次郎", last_inspection: "2025-11-12T16:45:00Z", inspection_count: 52 }
]
```

**SQL実装:**
```sql
-- inspections と qr_inspections の両方から検品者を取得
SELECT
    inspector_name as name,
    MAX(inspection_date) as last_inspection,
    COUNT(*) as inspection_count
FROM (
    SELECT inspector_name, inspection_date FROM shipping_inspections
    UNION ALL
    SELECT inspector_name, created_at as inspection_date FROM qr_inspections
) AS combined
GROUP BY inspector_name
ORDER BY last_inspection DESC
LIMIT ?;
```

---

### 優先度：高（High）🟡

#### 3. 検品チェック項目の動的取得（index.html）

**影響範囲:** index.html, index-app.js
**工数見積:** 2日
**担当:** バックエンド + フロントエンド + DB設計

**実装タスク:**
1. データベーステーブルの追加（migration）
2. APIエンドポイントの実装
3. 管理画面の作成（チェック項目の追加・編集・削除）
4. フロントエンドのチェック項目動的生成
5. 既存チェック項目のマイグレーション

**必要なテーブル（新規）:**
```sql
CREATE TABLE inspection_checklist_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    inspection_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspection_checklist_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES inspection_checklist_templates(id) ON DELETE CASCADE,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_label VARCHAR(255) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    column_position INTEGER DEFAULT 1,
    is_bold BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_items_template ON inspection_checklist_items(template_id);
CREATE INDEX idx_checklist_items_order ON inspection_checklist_items(display_order);
```

**初期データ投入:**
```sql
INSERT INTO inspection_checklist_templates (template_name, inspection_type, description, is_active)
VALUES ('出荷検品標準チェックリスト', 'shipping', '出荷検品で使用する標準チェックリスト', true);

INSERT INTO inspection_checklist_items (template_id, item_code, item_label, is_required, display_order, column_position, is_bold) VALUES
(1, 'labelCheck', 'ラベル確認完了', false, 1, 1, false),
(1, 'packagingCheck', '梱包状態確認', false, 2, 1, false),
(1, 'documentCheck', '出荷書類確認', false, 3, 1, false),
(1, 'qualityCheck', '品質基準適合', false, 4, 2, false),
(1, 'quantityCheck', '数量一致確認', false, 5, 2, false),
(1, 'finalApproval', '最終承認', true, 6, 2, true);
```

---

#### 4. 注意事項の動的取得（index.html）

**影響範囲:** index.html
**工数見積:** 1日
**担当:** バックエンド + フロントエンド + DB設計

**実装タスク:**
1. データベーステーブルの追加
2. APIエンドポイントの実装
3. 管理画面の作成（注意事項の追加・編集・削除・並び替え）
4. フロントエンドの動的表示実装

**必要なテーブル（新規）:**
```sql
CREATE TABLE inspection_notice_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,  -- 'shipping', 'production', 'quality'
    notice_text VARCHAR(255) NOT NULL,
    icon_class VARCHAR(50) DEFAULT 'fa-check-circle',
    icon_color VARCHAR(50) DEFAULT 'text-success',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notice_category ON inspection_notice_items(category, is_active);
CREATE INDEX idx_notice_order ON inspection_notice_items(display_order);
```

**初期データ投入:**
```sql
INSERT INTO inspection_notice_items (category, notice_text, icon_class, icon_color, display_order, is_active) VALUES
('shipping', '梱包材の損傷確認', 'fa-check-circle', 'text-success', 1, true),
('shipping', 'ラベル貼り付け位置', 'fa-check-circle', 'text-success', 2, true),
('shipping', '数量の最終確認', 'fa-check-circle', 'text-success', 3, true),
('shipping', '出荷書類の完備', 'fa-check-circle', 'text-success', 4, true);
```

---

### 優先度：低（Low）🟢

#### 5. バージョン情報の自動化

**影響範囲:** qr-inspection.html, index.html, ビルドシステム
**工数見積:** 0.5日
**担当:** DevOps + フロントエンド

**実装タスク:**
1. package.jsonのバージョン管理
2. ビルドスクリプトの修正（Gitコミットハッシュの自動取得）
3. メタタグへの自動埋め込み
4. APIエンドポイントの追加（/api/system/version）

---

## 実装優先度マトリクス

### 緊急度 × 重要度マトリクス

| 優先度 | タスク | 影響範囲 | ビジネス価値 | 工数 | 担当 |
|-------|-------|---------|------------|------|------|
| 🔴 最高 | qr-inspection.html API統合 | 全体 | システムが実用可能になる | 3日 | Full-stack |
| 🔴 最高 | 検品者名の動的取得 | 両画面 | データ品質向上 | 0.5日 | Full-stack |
| 🟡 高 | 検品チェック項目の動的化 | index.html | 保守性・拡張性向上 | 2日 | Full-stack + DB |
| 🟡 高 | 注意事項の動的取得 | index.html | 運用柔軟性向上 | 1日 | Full-stack + DB |
| 🟢 低 | バージョン情報の自動化 | 両画面 | 運用効率向上 | 0.5日 | DevOps |

### 累積工数：**7日**

---

## 実装スケジュール（推奨）

### Phase 1: Critical対応（必須）
**期間:** 1週間
**目標:** qr-inspection.htmlを実用可能にする

- Day 1-3: qr-inspection.html API統合
- Day 4: 検品者名の動的取得（両画面）
- Day 5: 統合テスト・バグ修正

### Phase 2: 保守性向上（推奨）
**期間:** 1週間
**目標:** 長期的な保守性を確保する

- Day 6-7: 検品チェック項目の動的化（DB設計 + API + 管理画面）
- Day 8: 注意事項の動的取得（DB + API + 管理画面）
- Day 9-10: 統合テスト・ドキュメント更新

### Phase 3: 運用改善（オプション）
**期間:** 0.5日
**目標:** 運用効率を向上させる

- Day 11: バージョン情報の自動化

---

## 期待される効果

### 1. 開発効率の向上
- コード修正なしでチェック項目・注意事項を変更可能
- リリース頻度の削減（設定変更のみで対応）

### 2. データ品質の向上
- 検品者名の表記揺れの解消
- 統計分析の精度向上

### 3. ユーザビリティの向上
- QR検品画面で出荷指示情報が確認可能
- 在庫状況のリアルタイム確認

### 4. システムの拡張性向上
- 新しいチェック項目の追加が容易
- 製品ごとのカスタマイズが可能

---

## リスクと対策

### リスク1: データベーススキーマの変更
**影響:** 既存データのマイグレーションが必要

**対策:**
- マイグレーションスクリプトの作成
- ロールバック手順の準備
- 本番環境への適用前にステージング環境でテスト

### リスク2: APIの後方互換性
**影響:** 既存のクライアントが動作しなくなる可能性

**対策:**
- APIバージョニングの導入（/api/v1/, /api/v2/）
- 段階的な移行期間の設定
- 古いエンドポイントの非推奨化（Deprecation）

### リスク3: パフォーマンスの劣化
**影響:** データ取得回数の増加による応答速度の低下

**対策:**
- 複数APIを1つに統合（/api/shipping-instructions/:id/qr-inspection-data）
- データキャッシング（Redis）の導入
- インデックスの最適化

---

## まとめ

本分析により、index.html と qr-inspection.html において**合計9項目**のデータがハードコーディングされていることが判明しました。特に **qr-inspection.html は現状では実用不可能**であり、最優先での改修が必要です。

**最優先タスク:**
1. qr-inspection.html のAPI統合（3日）
2. 検品者名の動的取得（0.5日）

**推奨タスク:**
3. 検品チェック項目の動的化（2日）
4. 注意事項の動的取得（1日）

これらの改修により、システムの**保守性・拡張性・ユーザビリティ**が大幅に向上し、長期的な運用コストの削減が期待できます。

---

**作成日:** 2025-11-13
**作成者:** システム開発チーム
**承認者:** [プロジェクトマネージャー]
**最終更新:** 2025-11-13
