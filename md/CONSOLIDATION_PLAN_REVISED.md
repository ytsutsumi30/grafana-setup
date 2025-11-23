# ソースファイル統廃合計画（修正版）

**作成日**: 2025-11-23
**修正日**: 2025-11-23
**バックアップ**: `backups/pre-consolidation-20251123-114056/project-backup.tar.gz` (1.1MB)

---

## 🔍 依存関係調査結果

主要HTMLファイルから参照されているファイルを調査し、**実際に使用中のファイルは削除対象から除外**しました。

### 使用中のHTMLファイルとその依存関係

| HTMLファイル | 参照しているローカルファイル | 備考 |
|------------|----------------------|------|
| **web/index.html** | js/index-app.js, js/qr-scanner.js | メイン検品画面 ✅ |
| **web/qr-inspection-v2.1.html** | なし（インラインスクリプト） | QR検品最新版 ✅ |
| **web/safari.html** | なし（インラインスクリプト） | Safari QRスキャナー ✅ |
| **web/android.html** | なし（インラインスクリプト） | Android QRスキャナー ✅ |
| **web/itemqr.html** | ../scripts/UserControl.js（存在しない） | ピッキング作業 ⚠️ |
| **web/products.html** | なし（インラインスクリプト） | 製品マスタ ✅ |
| **web/shipping-instructions.html** | なし（インラインスクリプト） | 出荷指示 ✅ |
| **web/order.html** | なし（インラインスクリプト） | 受注オーダー ✅ |
| **web/ocr.html** | なし（インラインスクリプト） | OCR ✅ |
| **web/inventory.html** | なし（インラインスクリプト） | 在庫管理 ✅ |
| **web/index-org.html** | js/app.js | ❓ 使用状況要確認 |

### JavaScript依存関係ツリー

```
web/index.html
  └─ js/index-app.js (module)
       ├─ js/qr-scanner.js (import)
       └─ js/qr-scanner-worker.min.js (used by qr-scanner.js)

web/index-org.html
  └─ js/app.js (module)
       ├─ js/modules/delivery-map.js (import) - 24行、スタブ
       ├─ js/modules/qr-scanner.js (import) - 17行、スタブ
       └─ js/modules/inventory-manager.js (import) - 14行、スタブ

実装ファイル（web/modules/配下）:
  ├─ modules/qr-scanner.js - 690行、実装
  ├─ modules/inventory-manager.js - 495行、実装
  └─ modules/delivery-map.js - 384行、実装
```

---

## ⚠️ 重要な確認事項

統廃合を進める前に、以下の点をご確認ください：

### 質問1: 使用中のHTMLファイル

以下のHTMLファイルは**現在実際に使用されていますか？**

1. **web/index-org.html**
   - 現在のindex.htmlとは別のバージョン
   - `js/app.js`と`js/modules/`配下のファイルを参照
   - ✅ 使用中 → 保持
   - ❌ 未使用 → 削除（関連するjs/app.js、js/modules/配下も削除可能）

2. **web/index-original.html**
   - 1,500行の大規模な実装
   - 現在どこからも参照されていない
   - ✅ 使用中 → 保持
   - ❌ 未使用 → 削除

### 質問2: その他の削除候補HTMLファイル

以下のファイルは旧バージョン・テスト版と思われますが、**削除してよろしいですか？**

**QRスキャナー旧バージョン（9ファイル）:**
- web/safari2.html, safari3.html, safari31.html, safari4.html
- web/qr-inspection.html, qr-inspection2.html, qr-inspection3.html
- web/qr-inspection-backup-20251017-040209.html
- web/qr.html

**その他（3ファイル）:**
- order-picking-list_org.html
- shipping-instruction-mockup2.html（ルートディレクトリ、web/配下に同一ファイル存在）

---

## 📊 修正版 統廃合計画

### シナリオA: index-org.html は未使用（削除する場合）

| カテゴリ | 削除ファイル数 | 削減効果 |
|---------|------------:|---------|
| HTMLファイル | 14 | -27% |
| JavaScriptファイル | 7 | -23% |
| マークダウンファイル | 56 | -67% |
| **合計** | **77** | **-42%** |

**削除対象HTML（14ファイル）:**
```
✗ web/index-org.html
✗ web/index-original.html
✗ web/safari2.html, safari3.html, safari31.html, safari4.html (4ファイル)
✗ web/qr-inspection.html, qr-inspection2.html, qr-inspection3.html (3ファイル)
✗ web/qr-inspection-backup-20251017-040209.html
✗ web/qr.html
✗ order-picking-list_org.html
✗ shipping-instruction-mockup2.html (ルート)
```

**削除対象JavaScript（7ファイル）:**
```
✗ web/js/app.js - index-org.htmlから参照（index-org.html削除時）
✗ web/js/app-backup.js - バックアップ
✗ web/js/modules/delivery-map.js (24行) - スタブ
✗ web/js/modules/qr-scanner.js (17行) - スタブ
✗ web/js/modules/inventory-manager.js (14行) - スタブ
✗ web/js/modules/ ディレクトリを削除
```

### シナリオB: index-org.html は使用中（保持する場合）

| カテゴリ | 削除ファイル数 | 削減効果 |
|---------|------------:|---------|
| HTMLファイル | 13 | -25% |
| JavaScriptファイル | 1 | -3% |
| マークダウンファイル | 56 | -67% |
| **合計** | **70** | **-38%** |

**削除対象HTML（13ファイル）:**
```
✓ web/index-org.html - 保持
✗ web/index-original.html
✗ web/safari2.html, safari3.html, safari31.html, safari4.html (4ファイル)
✗ web/qr-inspection.html, qr-inspection2.html, qr-inspection3.html (3ファイル)
✗ web/qr-inspection-backup-20251017-040209.html
✗ web/qr.html
✗ order-picking-list_org.html
✗ shipping-instruction-mockup2.html (ルート)
```

**削除対象JavaScript（1ファイル）:**
```
✓ web/js/app.js - 保持（index-org.htmlから参照）
✗ web/js/app-backup.js - バックアップ
✓ web/js/modules/ - 保持（app.jsから参照）
```

---

## 🛡️ 保護されたファイル（削除対象外）

以下のファイルは**実際に使用されているため削除しません：**

### HTMLファイル（保持）
```
✅ web/index.html - メイン検品画面
✅ web/qr-inspection-v2.1.html - QR検品システム最新版
✅ web/safari.html - Safari QRスキャナー最新版
✅ web/android.html - Android QRスキャナー
✅ web/itemqr.html - ピッキング作業
✅ web/products.html - 製品マスタ管理
✅ web/shipping-instructions.html - 出荷指示管理
✅ web/order.html - 受注オーダー出荷
✅ web/ocr.html - AI伝票読み取り
✅ web/inventory.html - 在庫管理
✅ (その他マスタ管理・システム管理画面)
```

### JavaScriptファイル（保持）
```
✅ web/js/index-app.js - index.htmlから参照
✅ web/js/qr-scanner.js - index-app.jsから参照
✅ web/js/qr-scanner-worker.min.js - qr-scanner.jsから使用
✅ web/modules/qr-scanner.js (690行) - 実装ファイル
✅ web/modules/inventory-manager.js (495行) - 実装ファイル
✅ web/modules/delivery-map.js (384行) - 実装ファイル
✅ (その他業務ロジック実装ファイル)
```

---

## 📄 マークダウンファイルの統廃合（変更なし）

マークダウンファイルの統廃合計画は当初の計画から変更ありません：

- **56ファイル削除 → 10統合ドキュメント作成**
- 削減率: **67%**

詳細は `md/CONSOLIDATION_PLAN.md` を参照。

---

## ✅ 実行前の確認チェックリスト

統廃合を実行する前に、以下をご確認ください：

### HTMLファイル

- [ ] **web/index-org.html**は現在使用されていますか？
  - はい → シナリオB（保持）を選択
  - いいえ → シナリオA（削除）を選択

- [ ] **web/index-original.html**は現在使用されていますか？
  - はい → 削除対象から除外
  - いいえ → 削除対象に含める

- [ ] 以下のQRスキャナー旧バージョン9ファイルを削除してよろしいですか？
  ```
  web/safari2.html, safari3.html, safari31.html, safari4.html
  web/qr-inspection.html, qr-inspection2.html, qr-inspection3.html
  web/qr-inspection-backup-20251017-040209.html
  web/qr.html
  ```
  - はい → 削除実行
  - いいえ → 保持するファイルを指定

### 実行シナリオの選択

どちらのシナリオで統廃合を実行しますか？

- [ ] **シナリオA**: index-org.html未使用（77ファイル削除、42%削減）
- [ ] **シナリオB**: index-org.html使用中（70ファイル削除、38%削減）
- [ ] **カスタム**: 個別に削除対象を指定

---

## 🚀 実行手順

承認後、以下の順序で実行します：

### Phase 1: HTMLファイルの削除
1. 削除対象HTMLファイルのリストを確認
2. `git rm`コマンドで削除
3. コミット

### Phase 2: JavaScriptファイルの削除
1. 削除対象JavaScriptファイルのリストを確認
2. `git rm`コマンドで削除
3. コミット

### Phase 3: マークダウンファイルの統合と削除
1. 統合ドキュメント10ファイルを作成
2. 元のマークダウンファイル56ファイルを削除
3. コミット

### Phase 4: 最終確認とプッシュ
1. 主要機能の動作確認（推奨）
2. リモートリポジトリにプッシュ

---

## ⚠️ 注意事項

1. **バックアップ確保**: `backups/pre-consolidation-20251123-114056/project-backup.tar.gz` に全体バックアップ済み
2. **Git履歴保持**: 削除されたファイルはgitの履歴から復元可能
3. **動作確認**: 統廃合後、主要機能（QRスキャン、検品、出荷指示）の動作確認を推奨
4. **ロールバック**: 問題が発生した場合、`git revert`または`git reset`で元に戻すことが可能

---

**ご確認お願いします**: 上記のチェックリストにご回答いただき、実行するシナリオを選択してください。
