# ソースファイル統廃合計画

**作成日**: 2025-11-23
**バックアップ**: `backups/pre-consolidation-20251123-114056/project-backup.tar.gz` (1.1MB)

---

## 📋 統廃合の目的

1. **重複ファイルの削減**: 同一機能の複数実装を整理
2. **保守性の向上**: 管理すべきファイル数を削減
3. **ドキュメントの一元化**: 分散したレポートを主要ドキュメントに統合
4. **プロジェクト構造の改善**: 明確なディレクトリ構造の確立

---

## 🎯 統廃合対象サマリー

| カテゴリ | 削除対象 | 統合対象 | 削減効果 |
|---------|---------|---------|---------|
| **HTMLファイル** | 13ファイル | - | 25% 削減 |
| **JavaScriptファイル** | 3ファイル | - | 10% 削減 |
| **マークダウンファイル** | - | 45→10ファイル | 42% 削減 |
| **合計** | 16ファイル削除 | 35ファイル統合 | **28% 削減** |

---

## 🌐 HTMLファイルの統廃合 (13ファイル削除)

### QRスキャナー関連 (9ファイル削除)

**保持するファイル (最新・最良版):**
- ✅ `web/safari.html` - Safari最適化QRスキャナー最新版（1,296行）
- ✅ `web/qr-inspection-v2.1.html` - QR同梱物検品システム最新版（1,054行）
- ✅ `web/android.html` - Android/Chrome最適化版（1,208行）
- ✅ `web/itemqr.html` - ピッキング作業画面（1,008行）

**削除するファイル (旧バージョン・重複):**
```
❌ web/safari2.html (1,201行) - safari.htmlの旧版
❌ web/safari3.html (1,219行) - safari.htmlの旧版
❌ web/safari31.html (724行) - safari.htmlの旧版
❌ web/safari4.html (230行) - 簡易版、safari.htmlに統合済み
❌ web/qr-inspection.html (1,019行) - v2.1の旧版
❌ web/qr-inspection2.html (1,263行) - v2.1の旧版
❌ web/qr-inspection3.html (601行) - v2.1の旧版
❌ web/qr-inspection-backup-20251017-040209.html (1,054行) - バックアップファイル
❌ web/qr.html (133行) - 簡易テストツール、不要
```

**削減効果**: 9ファイル、約8,444行削除

### その他HTML (4ファイル削除)

```
❌ web/index-org.html (501行) - index-original.htmlの旧版
❌ web/index-original.html (1,500行) - 現在のindex.htmlに統合済み
❌ order-picking-list_org.html (930行) - order-picking-list3.htmlの旧版
❌ shipping-instruction-mockup2.html (2,398行) - web/配下に同一ファイル存在（重複）
```

**削減効果**: 4ファイル、約5,329行削除

---

## 💻 JavaScriptファイルの統廃合 (3ファイル削除)

**削除するファイル (バックアップ・スタブ):**
```
❌ web/js/app-backup.js (712行) - app.jsのバックアップ
❌ web/js/modules/qr-scanner.js (17行) - スタブ実装、web/modules/qr-scanner.js使用
❌ web/js/modules/inventory-manager.js (14行) - スタブ実装、web/modules/inventory-manager.js使用
```

**削減効果**: 3ファイル、約743行削除

---

## 📄 マークダウンファイルの統廃合 (45→10ファイルに統合)

### 統合方針

分散した45個のQR関連レポートを以下の10個の主要ドキュメントに統合します。

### 新規作成する統合ドキュメント

#### 1. `docs/QR_SCANNER_GUIDE.md` (新規作成)
**統合元**: QRスキャナー関連レポート15ファイル

統合するファイル:
```
md/QR_SCANNER_BRUSHUP_REPORT.md
md/QR_SCANNER_COMPARISON.md
md/QR_COMPARISON_ANALYSIS.md
md/QRSCAN_COMPARISON_INDEX_VS_MODULE.md
md/QRSCAN_INTEGRATION_ANALYSIS.md
md/web/QR_SCANNER_UPGRADE.md
md/web/ITEMQR_QRSCAN_ANALYSIS.md
... (計15ファイル)
```

**内容構成**:
- QRスキャナーアーキテクチャ
- Safari/iOS最適化技術
- 実装バージョン比較
- パフォーマンス改善履歴

#### 2. `docs/QR_INSPECTION_GUIDE.md` (新規作成)
**統合元**: QR検品システム関連レポート12ファイル

統合するファイル:
```
md/QR_INSPECTION_VERSION_COMPARISON.md
md/QR_INSPECTION_REBUILD_REPORT.md
md/web/QR_INSPECTION_V21_COMPLETE_REPORT.md
md/web/QR_INSPECTION_V21_UPGRADE_GUIDE.md
md/web/QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md
md/web/QR_INSPECTION_INTEGRATION_REPORT.md
md/web/QR_IMPLEMENTATION_REPORT.md
... (計12ファイル)
```

**内容構成**:
- QR検品システム概要
- バージョン履歴（v1.0 → v2.1）
- 検品フロー仕様
- API統合ガイド

#### 3. `docs/SAFARI_IOS_OPTIMIZATION.md` (新規作成)
**統合元**: Safari/iOS最適化関連レポート10ファイル

統合するファイル:
```
md/SAFARI_INTEGRATION_COMPLETE.md
md/SAFARI_DEPLOY_COMPLETE_20251016.md
md/SAFARI2_INTEGRATION_REPORT.md
md/SAFARI2_CACHE_AND_QR_FIX.md
md/IPAD_SAFARI_OPTIMIZATION_DEPLOY.md
md/IOS_QRSCANNER_FIX.md
md/IOS_QRSCANNER_FIX_REPORT.md
md/IOS_CACHE_CLEAR_GUIDE.md
md/web/SAFARI2_PHASE1_PHASE2_REPORT.md
md/web/SAFARI2_INTEGRATION_REPORT.md
```

**内容構成**:
- iOS Safari技術的課題と対応
- キャッシュ問題の解決方法
- カメラAPI最適化
- デバイス別対応（iPad/iPhone）

#### 4. `docs/DEPLOYMENT_COMPLETE_GUIDE.md` (新規作成)
**統合元**: デプロイ関連レポート8ファイル

統合するファイル:
```
md/DEPLOYMENT_AWS.md
md/DEPLOYMENT_GUIDE.md
md/DEPLOYMENT_STATUS_20251016.md
md/HTTPS_SETUP_COMPLETE.md
md/RDS_SSL_FIX_REPORT.md
md/SSL_CERTIFICATE_UPDATED.md
md/FIX_LINE_ENDINGS_REPORT.md
md/RSYNC_SETUP_COMPLETE.md
```

**内容構成**:
- AWSデプロイメント完全ガイド
- SSL/TLS設定手順
- データベース設定
- トラブルシューティング

#### 5. `CHANGELOG.md` (新規作成、ルートディレクトリ)
**統合元**: リリース・デプロイレポート

統合するファイル:
```
md/RELEASE_NOTES_2.1.1.md
md/QR_DEPLOY_COMPLETE_REPORT.md
md/QR_SCAN_FIX_DEPLOY_20251016.md
md/QR_SCAN_MANUAL_INPUT_DEPLOY.md
md/QR_SEPARATE_TAB_DEPLOY_20251016.md
md/QR_INSPECTION_MOCK_DEPLOY_20251016.md
md/QR_CAMERA_ERROR_FIX_REPORT.md
```

**内容構成**:
- バージョン履歴（v1.0 → v2.1.1）
- 各リリースの変更内容
- デプロイ履歴
- 修正履歴

#### 6. `docs/MOBILE_OPTIMIZATION_GUIDE.md` (新規作成)
**統合元**: モバイル最適化関連3ファイル

統合するファイル:
```
md/web/MOBILE_OPTIMIZATION.md
md/web/MOBILE_SUMMARY.md
md/web/DEVICE_MODE_GUIDE.md
```

**内容構成**:
- モバイルデバイス対応
- デバイスモード選択機能
- レスポンシブデザイン
- パフォーマンス最適化

### 既存ドキュメントの統合・更新

#### 7. `docs/DATABASE_DESIGN.md` (既存、更新)
**統合元**: md/DATABASE_SCHEMA.md

現在のdocs/DATABASE_DESIGN.mdに、md/DATABASE_SCHEMA.mdの内容を統合。

#### 8. `docs/AWS_DEPLOYMENT_GUIDE.md` (既存、更新)
**統合元**: doc/aws/配下の6ファイル

現在複数に分散しているAWSガイドを1つに統合:
```
doc/aws/AWS_DEPLOYMENT.md
doc/aws/AWS_DEPLOYMENT_GUIDE.md
doc/aws/AWS_STARTUP_GUIDE.md
doc/aws/AWS_README.md
doc/aws/AWS_QUICKSTART.md
doc/aws/QUICKSTART_AWS.md
→ docs/AWS_DEPLOYMENT_GUIDE.md (統合版)
```

#### 9. `docs/OPERATIONS_MANUAL.md` (既存、更新)
**統合元**: doc/guides/OPERATION_MANUAL.md + トラブルシューティング系

現在のdoc/guides/OPERATION_MANUAL.mdをdocs/配下に移動し、以下を統合:
```
md/CAMERA_API_ERROR_GUIDE.md
md/web/QR_SCAN_IPHONE_GUIDE.md
```

#### 10. `README.md` (ルート、既存更新)
**統合元**: doc/README.md, doc/README2.md, doc/README3.md

3つのREADMEファイルをルートのREADME.mdに統合。

---

## 🗂️ 削除するマークダウンファイル一覧

統合後、以下のファイルを削除します（内容は統合ドキュメントに移行）:

### md/ ディレクトリ (35ファイル削除)

```
md/QR_SCANNER_BRUSHUP_REPORT.md
md/QR_INSPECTION_VERSION_COMPARISON.md
md/QR_SCANNER_COMPARISON.md
md/QR_COMPARISON_ANALYSIS.md
md/SAFARI_INTEGRATION_COMPLETE.md
md/SAFARI_DEPLOY_COMPLETE_20251016.md
md/SAFARI_HTML_INTEGRATION_20251016.md
md/SAFARI2_INTEGRATION_SUMMARY.md
md/SAFARI2_INTEGRATION_REPORT.md
md/SAFARI2_CAMERA_INIT_FIX.md
md/SAFARI2_CACHE_AND_QR_FIX.md
md/SAFARI_QRSCAN_FEATURES_LIST.md
md/IPAD_SAFARI_OPTIMIZATION_DEPLOY.md
md/IOS_QRSCANNER_FIX.md
md/IOS_QRSCANNER_FIX_REPORT.md
md/IOS_CACHE_CLEAR_GUIDE.md
md/QR_INSPECTION_REBUILD_REPORT.md
md/QR_INSPECTION_MOCK_DEPLOY_20251016.md
md/QR_INSPECTION_ISSUE_ANALYSIS_20251016.md
md/QR_DEPLOY_COMPLETE_REPORT.md
md/QR_CAMERA_ERROR_FIX_REPORT.md
md/QR_SEPARATE_TAB_DEPLOY_20251016.md
md/QR_SCAN_MANUAL_INPUT_DEPLOY.md
md/QR_SCAN_FIX_DEPLOY_20251016.md
md/QR_SCAN_ANALYSIS_20251016.md
md/QRSCAN_COMPARISON_INDEX_VS_MODULE.md
md/QRSCAN_INTEGRATION_ANALYSIS.md
md/QRPOC_VS_PRODUCTION_COMPARISON.md
md/QR_INSPECTION_SAFARI_UPGRADE.md (空ファイル)
md/RELEASE_NOTES_2.1.1.md
md/DEPLOYMENT_STATUS_20251016.md
md/DATABASE_SCHEMA.md
md/CAMERA_API_ERROR_GUIDE.md
md/README2.md
md/RSYNC_SETUP_COMPLETE.md
```

### md/web/ ディレクトリ (11ファイル削除)

```
md/web/SAFARI2_PHASE1_PHASE2_REPORT.md
md/web/SAFARI2_INTEGRATION_REPORT.md
md/web/QR_SCAN_IPHONE_GUIDE.md
md/web/QR_SCAN_COMPARISON_REPORT.md
md/web/QR_INSPECTION_V21_UPGRADE_GUIDE.md
md/web/QR_SCANNER_UPGRADE.md
md/web/QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md
md/web/QR_INSPECTION_V21_COMPLETE_REPORT.md
md/web/QR_INSPECTION_INTEGRATION_REPORT.md
md/web/QR_IMPLEMENTATION_REPORT.md
md/web/ITEMQR_QRSCAN_ANALYSIS.md
md/web/MOBILE_OPTIMIZATION.md
md/web/MOBILE_SUMMARY.md
md/web/DEVICE_MODE_GUIDE.md
```

### doc/ ディレクトリ (10ファイル削除)

```
doc/README.md
doc/README2.md
doc/README3.md
doc/aws/AWS_DEPLOYMENT.md
doc/aws/AWS_DEPLOYMENT_GUIDE.md
doc/aws/AWS_STARTUP_GUIDE.md
doc/aws/AWS_README.md
doc/aws/AWS_QUICKSTART.md
doc/aws/QUICKSTART_AWS.md
doc/guides/OPERATION_MANUAL.md
```

**マークダウン削減効果**: 56ファイル削除 → 10ファイルに統合 (67% 削減)

---

## 📁 統廃合後のディレクトリ構造

```
grafana-setup/
├── README.md (統合・更新版)
├── CHANGELOG.md (新規作成)
├── CLAUDE.md (保持)
├── copilot-instructions.md (保持)
│
├── docs/ (主要ドキュメント統合先)
│   ├── DATABASE_DESIGN.md (既存、更新)
│   ├── QR_INSPECTION_API_INTEGRATION.md (保持)
│   ├── HARDCODED_DATA_ANALYSIS.md (保持)
│   ├── AWS_TEXTRACT_SETUP.md (保持)
│   ├── AWS_DEPLOYMENT_GUIDE.md (統合版)
│   ├── QR_SCANNER_GUIDE.md (新規作成)
│   ├── QR_INSPECTION_GUIDE.md (新規作成)
│   ├── SAFARI_IOS_OPTIMIZATION.md (新規作成)
│   ├── DEPLOYMENT_COMPLETE_GUIDE.md (新規作成)
│   ├── MOBILE_OPTIMIZATION_GUIDE.md (新規作成)
│   └── OPERATIONS_MANUAL.md (移動・統合)
│
├── md/ (開発ログ・レポート類)
│   ├── SOURCE_FILES_INVENTORY.md (保持)
│   ├── CONSOLIDATION_PLAN.md (本ドキュメント)
│   ├── SYSTEM_SPECIFICATION.md (保持)
│   ├── DEPLOYMENT_AWS.md (保持)
│   ├── SCHEDULER_ANALYSIS_REPORT.md (保持)
│   ├── HTTPS_SETUP_COMPLETE.md (保持)
│   ├── RDS_SSL_FIX_REPORT.md (保持)
│   ├── SSL_CERTIFICATE_UPDATED.md (保持)
│   ├── FIX_LINE_ENDINGS_REPORT.md (保持)
│   ├── DEPLOY_GUIDE.md (保持)
│   └── deploylog.md (保持)
│
├── web/
│   ├── index.html (保持)
│   ├── safari.html (保持 - 最新QRスキャナー)
│   ├── android.html (保持)
│   ├── qr-inspection-v2.1.html (保持 - 最新QR検品)
│   ├── itemqr.html (保持)
│   ├── (その他マスタ管理・OCR等のHTMLファイル保持)
│   ├── js/
│   │   ├── app.js (保持)
│   │   ├── index-app.js (保持)
│   │   ├── qr-scanner.js (保持)
│   │   ├── qr-inspection-app.js (保持)
│   │   └── (その他JSファイル保持)
│   └── modules/
│       ├── qr-scanner.js (保持)
│       ├── inventory-manager.js (保持)
│       └── delivery-map.js (保持)
│
├── api/
│   ├── server.js (保持)
│   ├── routes/ (保持)
│   └── services/ (保持)
│
└── terraform/ (保持)
```

---

## 📊 統廃合効果サマリー

### ファイル数削減

| カテゴリ | 統廃合前 | 統廃合後 | 削減率 |
|---------|---------|---------|--------|
| HTMLファイル | 51 | 38 | -25% |
| JavaScriptファイル | 30 | 27 | -10% |
| マークダウンファイル | 83 | 27 | -67% |
| **合計** | **184** | **92** | **-50%** |

### 行数削減（推定）

| カテゴリ | 統廃合前 | 削減行数 | 削減率 |
|---------|---------|---------|--------|
| HTML | 40,386行 | -13,773行 | -34% |
| JavaScript | 14,841行 | -743行 | -5% |
| マークダウン | 30,665行 | -15,000行（推定） | -49% |
| **合計** | **87,398行** | **-29,516行** | **-34%** |

---

## ⚠️ 注意事項

1. **バックアップ確保**: `backups/pre-consolidation-20251123-114056/project-backup.tar.gz` に全体バックアップ済み
2. **Git履歴保持**: 削除されたファイルはgitの履歴から復元可能
3. **段階的実行**: 統廃合は以下の順序で実行
   - Phase 1: HTMLファイルの削除
   - Phase 2: JavaScriptファイルの削除
   - Phase 3: マークダウンファイルの統合と削除
4. **テスト必須**: 統廃合後、主要機能の動作確認が必要

---

## ✅ 承認確認

この統廃合計画を実行してよろしいですか？

- [ ] Phase 1: HTMLファイルの削除（13ファイル）
- [ ] Phase 2: JavaScriptファイルの削除（3ファイル）
- [ ] Phase 3: マークダウンファイルの統合と削除（56ファイル削除、10ファイル新規作成）

承認後、順次実行します。
