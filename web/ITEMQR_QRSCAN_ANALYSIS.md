# itemqr.html QRスキャン機能分析レポート
**分析日**: 2025-10-17  
**ファイル**: /home/tsutsumi/grafana-setup/web/itemqr.html  
**総行数**: 1,009行  
**用途**: ピッキング作業用QRスキャン統合システム

---

## 📋 概要

itemqr.htmlは、**CSI (WebForms) システム統合型**のピッキング作業管理画面で、QRコードスキャン機能を内蔵しています。UserControl.jsとの連携により、業務システムと密接に統合されています。

---

## 🔍 QRSCAN関連機能一覧

### **1. 使用ライブラリ**

```html
<!-- QR Scanner library -->
<script src="https://unpkg.com/qr-scanner@1.4.2/qr-scanner.umd.min.js"></script>

<!-- UserControl.js library (CSI統合) -->
<script type="text/javascript" src="../$app/scripts/UserControl.js"></script>

<!-- Cookie管理 -->
<script src="https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js"></script>
```

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| qr-scanner | 1.4.2 (UMD) | QRコードスキャン |
| UserControl.js | - | CSI WebFormsシステム統合 |
| js-cookie | 3.0.5 | Cookie管理 |
| TailwindCSS | CDN | レスポンシブUI |

---

### **2. QRスキャナークラス構造**

#### **PickingWork オブジェクト**

```javascript
var PickingWork = {
    // QRスキャナー管理
    qrScanner: null,              // QrScannerインスタンス
    lastQRValue: '',              // 最後にスキャンしたQR値
    
    // データ管理
    currentData: {
        itemName: 'パネル1',
        itemId: 'A01',
        itemQuantity: 100,
        Items: []
    },
    
    selectedRows: new Set(),      // 選択行管理
    
    // メソッド
    init: function() { ... },
    startQRScan: function() { ... },
    stopQRScan: function() { ... },
    handleQRResult: function(data) { ... },
    manualQRInput: function() { ... },
    showQRStatus: function(message, type) { ... },
    matchItems: function() { ... }
}
```

---

### **3. 主要QRスキャン機能**

#### **3.1 スキャン開始 (`startQRScan`)**

```javascript
startQRScan: function() {
    var videoElement = document.getElementById("qr-video");
    var container = document.getElementById('videoContainer');
    
    container.style.display = 'block';
    
    if (typeof QrScanner !== 'undefined') {
        this.qrScanner = new QrScanner(
            videoElement,
            function(result) {
                PickingWork.handleQRResult(result.data || result);
            },
            {
                returnDetailedScanResult: true,
                highlightScanRegion: false,
                highlightCodeOutline: false
            }
        );
        
        this.qrScanner.start().then(function() {
            PickingWork.showQRStatus('QRコードをスキャン中...', 'info');
        }).catch(function(error) {
            PickingWork.showQRStatus('カメラアクセスエラー: ' + error.message, 'error');
        });
    } else {
        this.showQRStatus('QRスキャナーライブラリが読み込まれていません', 'error');
    }
}
```

**特徴**:
- ✅ QrScannerライブラリ使用
- ✅ エラーハンドリング実装
- ✅ ステータス表示
- ❌ iOS最適化なし（maxScansPerSecond未設定）
- ❌ カメラ選択なし（preferredCamera未設定）
- ❌ フォールバック機能なし

---

#### **3.2 スキャン停止 (`stopQRScan`)**

```javascript
stopQRScan: function() {
    if (this.qrScanner) {
        this.qrScanner.stop();
        this.qrScanner.destroy();
        this.qrScanner = null;
    }
    document.getElementById('videoContainer').style.display = 'none';
    this.showQRStatus('QRスキャンを停止しました', 'info');
}
```

**特徴**:
- ✅ リソースの適切なクリーンアップ（stop + destroy）
- ✅ UIの非表示処理
- ✅ ステータス通知

---

#### **3.3 QR結果処理 (`handleQRResult`)**

```javascript
handleQRResult: function(data) {
    this.lastQRValue = data;
    document.getElementById("qrResult").textContent = 'スキャン結果: ' + data;
    this.stopQRScan();
    this.showQRStatus('QRコードを読み取りました', 'success');
    
    // JSで照合を処理
    this.matchItems();
}
```

**処理フロー**:
1. スキャン値を保存 (`lastQRValue`)
2. UI表示更新
3. スキャン自動停止
4. 成功メッセージ表示
5. **自動照合処理実行** (`matchItems()`)

---

#### **3.4 手動入力 (`manualQRInput`)**

```javascript
manualQRInput: function() {
    var input = prompt('QRコードの内容を手入力してください:');
    if (input && input.trim()) {
        this.handleQRResult(input.trim());
    }
}
```

**特徴**:
- ✅ プロンプトダイアログでQR値を手動入力可能
- ✅ トリム処理で空白除去
- ✅ `handleQRResult()`を呼び出し、スキャン結果と同じフローで処理

---

#### **3.5 品目照合処理 (`matchItems`)**

```javascript
matchItems: function() {
    // QRで取得したデータと品目IDを照合
    PickingWork.currentData.Items.forEach(function(item) {
        if (item.Item === PickingWork.lastQRValue) {
            item.sMatching = '一致';
            item.matched = true;
        } else {
            item.sMatching = '不一致';
            item.matched = false;
        }
    });

    // 照合結果でソート（一致を上に）
    PickingWork.currentData.Items.sort(function(a, b) {
        if (a.sMatching === b.sMatching) return 0;
        if (a.sMatching === '一致') return -1;
        if (b.sMatching === '一致') return 1;
        return a.sMatching.localeCompare(b.sMatching);
    });

    // テーブル再表示
    PickingWork.displayItems(PickingWork.currentData.Items);
}
```

**ロジック**:
1. スキャンされたQR値と全品目を照合
2. 一致/不一致をフラグ設定
3. 一致した品目を上位にソート
4. テーブル表示を更新

---

#### **3.6 ステータス表示 (`showQRStatus`)**

```javascript
showQRStatus: function(message, type) {
    var statusDiv = document.getElementById("qrStatusMessage");
    statusDiv.className = "status-message " + type;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    setTimeout(function() {
        statusDiv.style.display = 'none';
    }, 3000);
}
```

**ステータスタイプ**:
- `info`: 情報メッセージ（青）
- `success`: 成功メッセージ（緑）
- `error`: エラーメッセージ（赤）

**特徴**:
- ✅ 3秒後に自動非表示
- ✅ CSSクラスでスタイル制御

---

### **4. QRスキャナー設定**

#### **現在の設定**

```javascript
{
    returnDetailedScanResult: true,
    highlightScanRegion: false,
    highlightCodeOutline: false
    // maxScansPerSecond: 未設定 (デフォルト: 25回/秒)
    // preferredCamera: 未設定
    // calculateScanRegion: 未設定
}
```

#### **設定比較**

| 項目 | itemqr.html | 推奨設定 (safari.html) | 問題 |
|------|-------------|----------------------|------|
| `returnDetailedScanResult` | ✅ true | ✅ true | - |
| `highlightScanRegion` | ✅ false | ✅ false | - |
| `highlightCodeOutline` | ✅ false | ✅ false | - |
| `maxScansPerSecond` | ❌ 未設定 (25) | ✅ iOS: 3, その他: 5 | **iOS過負荷** |
| `preferredCamera` | ❌ 未設定 | ✅ 'environment' | カメラ選択不安定 |
| `calculateScanRegion` | ❌ 未設定 | ✅ 実装あり | スキャン領域最適化なし |

---

### **5. UI構造**

#### **HTML構成**

```html
<!-- QRスキャンセクション -->
<div class="qr-section-inline">
    <!-- ステータスメッセージ -->
    <div id="qrStatusMessage" class="status-message" style="display: none;"></div>
    
    <!-- コントロールボタン -->
    <div class="qr-controls">
        <button onclick="PickingWork.startQRScan()">📷 QRスキャン開始</button>
        <button onclick="PickingWork.stopQRScan()">⏹ 停止</button>
        <button onclick="PickingWork.manualQRInput()">✍️ 手動入力</button>
    </div>
    
    <!-- ビデオコンテナ -->
    <div class="video-container" id="videoContainer">
        <video id="qr-video" playsinline></video>
        <div class="scan-overlay"></div>
    </div>
    
    <!-- スキャン結果表示 -->
    <div class="qr-result" id="qrResult">
        QRコードをスキャンしてください
    </div>
</div>
```

---

### **6. CSI (WebForms) 統合**

#### **6.1 データ取得**

```javascript
loadData: function() {
    if (typeof WSForm !== 'undefined') {
        WSForm.getVarValue('vJSONResult', function(JSONResult){ 
            const data = JSON.parse(JSONResult);
            PickingWork.displayData(data); 
        });
    }
}
```

#### **6.2 外部呼び出し可能関数**

```javascript
if (typeof WSForm !== 'undefined') {
    // CSIから詳細データを設定
    window.setPickingDetail = function(data) {
        PickingWork.currentData = data;
        PickingWork.displayData(data);
    };
    
    // CSIから選択状態をクリア
    window.clearPickingSelection = function() {
        PickingWork.clearSelection();
    };
    
    // CSIからQRスキャンを開始
    window.startQRScanning = function() {
        PickingWork.startQRScan();
    };
    
    // CSIからマッチング実行
    window.executeMatching = function() {
        PickingWork.performMatching();
    };
}
```

**統合ポイント**:
- ✅ WebFormsシステムから直接呼び出し可能
- ✅ データ受け渡しAPI
- ✅ QRスキャン制御API

---

### **7. レスポンシブデザイン**

```css
/* iPad対応 */
@media (max-width: 768px) {
    .main-layout {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
    }
    .qr-section {
        order: 2;
    }
    .work-section {
        order: 1;
    }
}

/* デスクトップ */
@media (min-width: 768px) {
    .main-layout {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
    }
}
```

**特徴**:
- ✅ モバイル/タブレット対応
- ✅ グリッドレイアウト
- ✅ 順序変更でUX最適化

---

## 🚨 問題点と改善推奨

### **Critical Issues (重大な問題)**

| # | 問題 | 影響 | 優先度 |
|---|------|------|--------|
| 1 | **maxScansPerSecond 未設定** | iOS Safariでデフォルト25回/秒 → CPU過負荷、スキャン失敗 | 🔴 高 |
| 2 | **preferredCamera 未設定** | 背面カメラが選択されない可能性 | 🟡 中 |
| 3 | **カメラフォールバックなし** | カメラアクセス失敗時の回復手段なし | 🟡 中 |
| 4 | **calculateScanRegion 未実装** | 全画面スキャンで処理負荷増 | 🟢 低 |
| 5 | **BFCache対応なし** | iOS Safariでブラウザバック時にカメラ凍結 | 🟡 中 |

---

### **推奨改善コード**

#### **改善版 startQRScan()**

```javascript
startQRScan: function() {
    var videoElement = document.getElementById("qr-video");
    var container = document.getElementById('videoContainer');
    
    container.style.display = 'block';
    
    if (typeof QrScanner !== 'undefined') {
        // デバイス検出
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        this.qrScanner = new QrScanner(
            videoElement,
            function(result) {
                PickingWork.handleQRResult(result.data || result);
            },
            {
                returnDetailedScanResult: true,
                highlightScanRegion: false,
                highlightCodeOutline: false,
                // ✅ iOS最適化: 3回/秒（safari.html実証済み）
                maxScansPerSecond: isIOS ? 3 : 5,
                // ✅ 背面カメラ優先
                preferredCamera: 'environment',
                // ✅ スキャン領域を中央60%に制限
                calculateScanRegion: function(video) {
                    var size = Math.min(video.videoWidth, video.videoHeight) * 0.6;
                    var x = (video.videoWidth - size) / 2;
                    var y = (video.videoHeight - size) / 2;
                    return {
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(size),
                        height: Math.round(size)
                    };
                }
            }
        );
        
        this.qrScanner.start().then(function() {
            PickingWork.showQRStatus('QRコードをスキャン中...', 'info');
        }).catch(function(error) {
            PickingWork.showQRStatus('カメラアクセスエラー: ' + error.message, 'error');
        });
    } else {
        this.showQRStatus('QRスキャナーライブラリが読み込まれていません', 'error');
    }
}
```

#### **BFCache対応追加**

```javascript
// init()内に追加
init: function() {
    console.log('Picking Work with QR Scanner initialized');
    
    // BFCache対応（iOS Safari）
    window.addEventListener('pageshow', function(event) {
        if (event.persisted && PickingWork.qrScanner) {
            // BFCacheから復元された場合、スキャナーをクリーンアップ
            console.log('Page restored from BFCache - cleanup scanner');
            PickingWork.stopQRScan();
        }
    });
    
    // ページ非表示時のクリーンアップ
    window.addEventListener('pagehide', function() {
        if (PickingWork.qrScanner) {
            PickingWork.stopQRScan();
        }
    });
    
    setTimeout(() => {
        this.loadData();
        this.bindEvents();
    }, 200);
}
```

---

## 📊 機能比較マトリクス

| 機能 | itemqr.html | safari.html | qr-inspection.html |
|------|-------------|-------------|-------------------|
| **QRライブラリ** | qr-scanner 1.4.2 | qr-scanner 1.4.2 | qr-scanner 1.4.2 |
| **iOS最適化** | ❌ なし | ✅ あり (3回/秒) | ✅ あり (3回/秒) |
| **カメラ優先指定** | ❌ なし | ✅ environment | ✅ environment |
| **スキャン領域最適化** | ❌ なし | ✅ 中央60% | ✅ 中央60% |
| **BFCache対応** | ❌ なし | ✅ あり | ✅ あり |
| **手動入力** | ✅ あり | ❌ なし | ✅ あり |
| **自動照合** | ✅ あり | ❌ なし | ✅ あり |
| **CSI統合** | ✅ あり | ❌ なし | ❌ なし |
| **連続スキャン** | ❌ 単発 | ❌ 単発 | ✅ あり |
| **UIフレームワーク** | TailwindCSS | TailwindCSS | Bootstrap 5 |
| **レスポンシブ** | ✅ iPad対応 | ✅ モバイル対応 | ✅ モバイル対応 |

---

## 🎯 QRSCAN機能サマリー

### **実装されている機能 ✅**

1. **基本スキャン機能**
   - QrScannerライブラリ統合
   - スキャン開始/停止
   - 結果表示

2. **業務ロジック**
   - 品目との自動照合
   - 一致/不一致判定
   - ソート機能

3. **ユーザー補助機能**
   - 手動入力
   - ステータス表示（3秒自動消去）
   - エラーハンドリング

4. **システム統合**
   - CSI WebForms連携
   - 外部API提供
   - JSON データ処理

5. **UI/UX**
   - レスポンシブデザイン
   - iPad最適化
   - TailwindCSS

### **実装されていない機能 ❌**

1. **パフォーマンス最適化**
   - iOS最適化スキャンレート
   - スキャン領域制限
   - デバイス検出

2. **安定性向上**
   - BFCache対応
   - カメラフォールバック
   - リソース管理最適化

3. **カメラ制御**
   - 背面カメラ優先設定
   - カメラ切り替え
   - 解像度指定

4. **高度な機能**
   - 連続スキャンモード
   - スキャン履歴管理
   - デバッグモード

---

## 💡 推奨アクション

### **Phase 1: Critical Fixes (即時対応)**

1. ✅ **maxScansPerSecond 設定追加**
   ```javascript
   maxScansPerSecond: isIOS ? 3 : 5
   ```

2. ✅ **preferredCamera 設定追加**
   ```javascript
   preferredCamera: 'environment'
   ```

3. ✅ **BFCache対応実装**
   ```javascript
   window.addEventListener('pageshow', ...)
   ```

### **Phase 2: Enhancement (機能強化)**

4. ⭐ **calculateScanRegion 実装**
5. ⭐ **カメラフォールバック実装**
6. ⭐ **デバッグモード追加**

### **Phase 3: Advanced Features (将来拡張)**

7. 🔮 連続スキャンモード
8. 🔮 スキャン履歴管理
9. 🔮 カメラ切り替え機能

---

## 📝 コード統計

```
総行数:                 1,009行
JavaScript部分:         ~470行
QR関連コード:          ~150行
スキャン設定:          3オプション (推奨: 6オプション)
外部API関数:           4個
ステータスタイプ:      3種類 (info, success, error)
```

---

## 🔗 関連ファイル

- **UserControl.js**: CSI WebFormsシステム統合ライブラリ
- **safari.html**: iOS最適化リファレンス実装
- **qr-inspection.html**: 業務システム統合版QRスキャナー
- **js/qr-scanner.js**: Safari最適化QRスキャナーモジュール

---

**作成者**: GitHub Copilot  
**参照元**: itemqr.html (1,009行)  
**分析バージョン**: v1.0
