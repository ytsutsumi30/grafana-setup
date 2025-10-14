# 📱 デバイスモード選択機能 - 実装ガイド

## 🎯 概要

iPad MiniとiPhone 6の2つのデバイスモードを選択できる機能を実装しました。
アプリ起動時に最適なモードを選択し、そのモードに最適化されたUIで在庫照合システムを利用できます。

---

## ✨ 主な機能

### 1. **初回起動時のモード選択**
- アプリを初めて起動すると、モード選択画面が表示されます
- iPad MiniモードまたはiPhone 6モードを選択できます
- 選択したモードはローカルストレージに保存されます

### 2. **モードの特徴**

#### 📱 iPad Mini モード
```
画面サイズ: 7.9インチ (768×1024)
推奨用途: タブレット・大画面

特徴:
✓ 2カラムレイアウト
✓ 大きな文字サイズ
✓ 広い作業エリア
✓ QRスキャンガイド: 240×240px
✓ ボタンサイズ: 大きめ
✓ 横並びコントロール
```

#### 📱 iPhone 6 モード
```
画面サイズ: 4.7インチ (375×667)
推奨用途: スマートフォン・小画面

特徴:
✓ 1カラムレイアウト
✓ コンパクト表示
✓ 片手操作対応
✓ QRスキャンガイド: 180×180px
✓ ボタンサイズ: 最適化
✓ 縦並びコントロール
```

### 3. **モード切り替え機能**
- ヘッダー右上のボタンからいつでもモード変更可能
- 現在のモードが表示されます
- スムーズなトランジションアニメーション

### 4. **自動保存・復元**
- 選択したモードは自動的に保存されます
- 次回起動時は保存されたモードで自動起動
- LocalStorageを使用（ブラウザごとに保存）

---

## 🎨 UI/UX デザイン

### モード選択画面

```
┌─────────────────────────────────────┐
│   🚚 出荷指示管理システム           │
│   デバイスモードを選択してください  │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐    ┌──────────┐     │
│  │ 📱       │    │ 📱       │     │
│  │ iPad Mini│    │ iPhone 6 │     │
│  │ モード   │    │ モード   │     │
│  │          │    │          │     │
│  │ 7.9インチ│    │ 4.7インチ│     │
│  │ 768×1024 │    │ 375×667  │     │
│  │          │    │          │     │
│  │ ✓ 2カラム│    │ ✓ 1カラム│     │
│  │ ✓ 大文字 │    │ ✓ コンパ │     │
│  │ ✓ 広いエ │    │ ✓ 片手操 │     │
│  └──────────┘    └──────────┘     │
│                                     │
│  💡 選択したモードは設定から変更    │
│     できます                        │
└─────────────────────────────────────┘
```

### カードデザイン
- **ホバー効果**: 浮き上がるアニメーション
- **選択状態**: 青い枠線と✓マーク
- **タップフィードバック**: スケールダウン

---

## 🔧 技術実装

### ファイル構成

```
web/
├── index.html                     # モード選択UI追加
├── css/
│   └── device-mode.css            # モード選択・切り替えスタイル（新規）
└── js/
    └── device-mode.js             # モード管理ロジック（新規）
```

### 主要クラス: DeviceModeManager

```javascript
class DeviceModeManager {
    // モード選択と管理を担当
    
    init()              // 初期化（保存モードの復元）
    selectMode(mode)    // モードを選択
    applyMode(mode)     // モードを適用
    showSelection()     // 選択画面を表示
    hideSelection()     // 選択画面を非表示
    saveMode(mode)      // LocalStorageに保存
    getSavedMode()      // 保存されたモードを取得
    resetMode()         // モードをリセット
}
```

### グローバル関数

```javascript
// HTMLから直接呼び出し可能
selectDeviceMode(mode)      // モードを選択
showModeSelection()         // モード選択画面を表示
```

### カスタムイベント

```javascript
// モード変更時に発火
window.addEventListener('deviceModeChanged', (event) => {
    console.log('Mode:', event.detail.mode);
    console.log('Info:', event.detail.modeInfo);
});
```

---

## 📱 使用方法

### 初回起動

1. **アプリを開く**
   ```
   https://your-domain.com/index.html
   ```

2. **モード選択画面が表示される**
   - iPad Mini モード
   - iPhone 6 モード
   から選択

3. **カードをタップ**
   - 選択したモードが適用されます
   - 自動的にメイン画面に遷移

### モード変更

1. **ヘッダー右上のボタンをタップ**
   ```
   📱 [現在のモード名]
   ```

2. **モード選択画面が表示される**

3. **別のモードを選択**
   - スムーズに切り替わります

### モードリセット（開発用）

```javascript
// ブラウザのコンソールで実行
window.debugDeviceMode.resetMode();
```

---

## 🎨 CSS クラス構成

### Body クラス

選択されたモードに応じて、bodyに自動的にクラスが追加されます：

```css
/* iPad Mini モード */
body.device-mode-ipad-mini { }

/* iPhone 6 モード */
body.device-mode-iphone-6 { }
```

### モード別スタイル例

```css
/* iPad Mini: 2カラムレイアウト */
body.device-mode-ipad-mini .form-grid {
    grid-template-columns: repeat(2, 1fr);
}

/* iPhone 6: 1カラムレイアウト */
body.device-mode-iphone-6 .form-grid {
    grid-template-columns: 1fr;
}
```

---

## 📊 モード比較表

| 項目 | iPad Mini | iPhone 6 |
|------|-----------|----------|
| **画面サイズ** | 768×1024px | 375×667px |
| **レイアウト** | 2カラム | 1カラム |
| **フォントサイズ** | 大きめ | 標準 |
| **QRガイド** | 240×240px | 180×180px |
| **ボタン配置** | 横並び | 縦並び |
| **ボタンサイズ** | 1rem / 0.75rem | 0.9375rem / 0.625rem |
| **コンテナ幅** | max-width: 1024px | 100% |
| **パディング** | 1.5rem | 0.5rem |

---

## 🔄 データフロー

```
起動
 ↓
LocalStorageチェック
 ↓
保存済み？
 ├─ Yes → モード適用 → メイン画面表示
 └─ No  → モード選択画面表示
           ↓
        ユーザーがモード選択
           ↓
        LocalStorageに保存
           ↓
        モード適用
           ↓
        メイン画面表示
```

---

## 🎯 実装の特徴

### 1. **LocalStorageによる永続化**
```javascript
// 保存
localStorage.setItem('shipping-app-device-mode', mode);

// 読み込み
const savedMode = localStorage.getItem('shipping-app-device-mode');
```

### 2. **スムーズなトランジション**
```javascript
// アニメーション付きでモード切り替え
playTransitionAnimation() {
    container.style.opacity = '0';
    container.style.transform = 'scale(0.95)';
    // ... アニメーション処理
}
```

### 3. **イベント駆動アーキテクチャ**
```javascript
// カスタムイベントで通知
const event = new CustomEvent('deviceModeChanged', {
    detail: { mode, modeInfo }
});
window.dispatchEvent(event);
```

### 4. **アプリとの統合**
```javascript
// ShippingApp内で自動調整
adjustForDeviceMode(mode) {
    if (mode === 'ipad-mini') {
        this.optimizeForIPadMini();
    } else if (mode === 'iphone-6') {
        this.optimizeForIPhone6();
    }
}
```

---

## 🔧 カスタマイズ

### 新しいモードの追加

```javascript
// device-mode.js
this.modes = {
    'ipad-mini': { /* ... */ },
    'iphone-6': { /* ... */ },
    'custom-mode': {  // 新規追加
        name: 'Custom',
        displayName: 'カスタムモード',
        icon: '🎨',
        viewport: { width: 600, height: 800 }
    }
};
```

### スタイルのカスタマイズ

```css
/* device-mode.css */
body.device-mode-custom-mode {
    /* カスタムモードのスタイル */
}

body.device-mode-custom-mode .container {
    max-width: 600px;
}
```

### HTMLにカードを追加

```html
<button class="mode-selection-card" data-mode="custom-mode" 
        onclick="selectDeviceMode('custom-mode')">
    <div class="mode-icon">🎨</div>
    <h2>カスタムモード</h2>
    <!-- ... -->
</button>
```

---

## 🐛 トラブルシューティング

### 問題: モード選択画面が表示されない

**解決策:**
1. JavaScriptが正しく読み込まれているか確認
   ```html
   <script src="js/device-mode.js"></script>
   ```
2. ブラウザのコンソールでエラーを確認
3. LocalStorageが有効か確認

### 問題: モードが保存されない

**解決策:**
1. ブラウザがLocalStorageをサポートしているか確認
2. プライベートブラウジングモードでないか確認
3. ブラウザのストレージ設定を確認

### 問題: モード切り替えがうまく動作しない

**解決策:**
1. CSSファイルが正しく読み込まれているか確認
   ```html
   <link rel="stylesheet" href="css/device-mode.css">
   ```
2. bodyにクラスが正しく適用されているか確認
3. ブラウザのキャッシュをクリア

### 問題: スタイルが適用されない

**解決策:**
1. CSS読み込み順序を確認
   - device-mode.css は最後に読み込む
2. ブラウザの開発者ツールでCSSを確認
3. `!important` の使用を確認

---

## 🎓 ベストプラクティス

### 1. **モード判定**
```javascript
// Good: DeviceModeManagerを使用
const mode = window.deviceModeManager.getCurrentMode();

// Bad: 直接判定
if (window.innerWidth < 768) { }
```

### 2. **スタイル定義**
```css
/* Good: モード別クラスを使用 */
body.device-mode-iphone-6 .btn {
    font-size: 0.9375rem;
}

/* Bad: メディアクエリのみ */
@media (max-width: 375px) {
    .btn { font-size: 0.9375rem; }
}
```

### 3. **イベントリスナー**
```javascript
// Good: カスタムイベントを使用
window.addEventListener('deviceModeChanged', handler);

// Bad: グローバル変数を監視
setInterval(() => checkModeChange(), 1000);
```

---

## 📈 パフォーマンス最適化

### 1. **初期化の最適化**
- device-mode.jsを最初に読み込む
- DOMContentLoadedで初期化
- 非同期処理を避ける

### 2. **トランジションの最適化**
- CSS Transformを使用（GPU加速）
- アニメーション時間は300ms以下
- Will-changeプロパティの活用

### 3. **LocalStorageアクセスの最適化**
- キャッシュ機構の実装
- エラーハンドリング
- try-catchで保護

---

## 🔮 今後の拡張予定

### Phase 2
- [ ] 自動モード検出（デバイス特性から推測）
- [ ] カスタムモードの作成機能
- [ ] モードプリセットの追加
- [ ] クラウド同期（複数デバイス対応）

### Phase 3
- [ ] モード別の詳細設定
- [ ] テーマカスタマイズ
- [ ] ショートカットキー対応
- [ ] A/Bテスト機能

---

## 📚 関連ファイル

### 新規作成
- `/web/css/device-mode.css` - モード選択・切り替えスタイル
- `/web/js/device-mode.js` - モード管理ロジック
- `/web/DEVICE_MODE_GUIDE.md` - このドキュメント

### 更新
- `/web/index.html` - モード選択UIの追加
- `/web/js/app.js` - デバイスモード対応

---

## 🎉 完成！

デバイスモード選択機能が完全に実装されました！

### 主な成果
- 📱 iPad MiniとiPhone 6の2モード対応
- 🎨 美しいモード選択UI
- 💾 自動保存・復元機能
- 🔄 スムーズなモード切り替え
- 🎯 モード別最適化

**Happy Device Mode Selection! 📱✨**
