# マークダウンファイル統廃合計画（最終版）

**作成日**: 2025-11-23
**対象**: マークダウンファイルのみ（HTML・JavaScriptは除外）
**バックアップ**: `backups/pre-consolidation-20251123-114056/project-backup.tar.gz` (1.1MB)

---

## 📋 方針変更

**HTMLファイル**: ✅ すべて保持（削除対象外）
**JavaScriptファイル**: ✅ すべて保持（削除対象外）
**マークダウンファイル**: 📝 統廃合実施（83 → 32ファイル）

---

## 📊 統廃合サマリー

| 項目 | 統廃合前 | 統廃合後 | 削減数 | 削減率 |
|------|---------|---------|--------|--------|
| **マークダウンファイル** | 83 | 32 | -51 | **-61%** |
| HTMLファイル | 51 | 51 | 0 | 0% |
| JavaScriptファイル | 30 | 30 | 0 | 0% |
| **総ファイル数** | 184 | 133 | -51 | **-28%** |

---

## 📄 マークダウンファイル統廃合計画

### ステップ1: 統合ドキュメントの作成（10ファイル新規作成）

#### 1. `docs/QR_SCANNER_GUIDE.md` ★新規作成★
**統合元**: 15ファイル

```
md/QR_SCANNER_BRUSHUP_REPORT.md (623行)
md/QR_SCANNER_COMPARISON.md (516行)
md/QR_COMPARISON_ANALYSIS.md (576行)
md/QRSCAN_COMPARISON_INDEX_VS_MODULE.md (378行)
md/QRSCAN_INTEGRATION_ANALYSIS.md (379行)
md/QR_SCAN_ANALYSIS_20251016.md (245行)
md/web/QR_SCANNER_UPGRADE.md (301行)
md/web/ITEMQR_QRSCAN_ANALYSIS.md (611行)
md/web/QR_SCAN_COMPARISON_REPORT.md (393行)
md/QRPOC_VS_PRODUCTION_COMPARISON.md (970行)
```

**内容構成**:
- QRスキャナーアーキテクチャ概要
- 各バージョン比較（safari.html、safari2.html、qr-inspection.html等）
- パフォーマンス改善履歴（+26%改善など）
- 実装技術詳細（BarcodeDetector API、jsQR、カメラ制約）
- ベストプラクティス

#### 2. `docs/QR_INSPECTION_GUIDE.md` ★新規作成★
**統合元**: 12ファイル

```
md/QR_INSPECTION_VERSION_COMPARISON.md (621行)
md/QR_INSPECTION_REBUILD_REPORT.md (387行)
md/QR_INSPECTION_ISSUE_ANALYSIS_20251016.md (377行)
md/web/QR_INSPECTION_V21_COMPLETE_REPORT.md (472行)
md/web/QR_INSPECTION_V21_UPGRADE_GUIDE.md (393行)
md/web/QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md (561行)
md/web/QR_INSPECTION_INTEGRATION_REPORT.md (481行)
md/web/QR_IMPLEMENTATION_REPORT.md (360行)
```

**内容構成**:
- QR検品システム概要
- バージョン履歴（v1.0 → v2.1）
- 検品フロー仕様
- API統合ガイド（docs/QR_INSPECTION_API_INTEGRATION.mdと連携）
- トラブルシューティング

#### 3. `docs/SAFARI_IOS_OPTIMIZATION.md` ★新規作成★
**統合元**: 10ファイル

```
md/SAFARI_INTEGRATION_COMPLETE.md (420行)
md/SAFARI_DEPLOY_COMPLETE_20251016.md (259行)
md/SAFARI_HTML_INTEGRATION_20251016.md (273行)
md/SAFARI_QRSCAN_FEATURES_LIST.md (309行)
md/SAFARI2_INTEGRATION_REPORT.md (472行)
md/SAFARI2_INTEGRATION_SUMMARY.md (111行)
md/SAFARI2_CAMERA_INIT_FIX.md (291行)
md/SAFARI2_CACHE_AND_QR_FIX.md (383行)
md/IPAD_SAFARI_OPTIMIZATION_DEPLOY.md (473行)
md/IOS_QRSCANNER_FIX.md (425行)
md/IOS_QRSCANNER_FIX_REPORT.md (331行)
md/IOS_CACHE_CLEAR_GUIDE.md (429行)
md/web/SAFARI2_PHASE1_PHASE2_REPORT.md (722行)
md/web/SAFARI2_INTEGRATION_REPORT.md (483行)
md/web/QR_SCAN_IPHONE_GUIDE.md (179行)
```

**内容構成**:
- iOS Safari技術的課題と対応策
- カメラAPI最適化（初期化、制約設定）
- キャッシュ問題の完全解決方法
- デバイス別対応（iPad Mini、iPhone 6、Safari 18.6+）
- BarcodeDetector API対応

#### 4. `docs/DEPLOYMENT_GUIDE.md` ★新規作成★
**統合元**: 8ファイル

```
md/DEPLOYMENT_AWS.md (624行)
md/DEPLOYMENT_GUIDE.md (307行)
md/DEPLOYMENT_STATUS_20251016.md (187行)
md/HTTPS_SETUP_COMPLETE.md (163行)
md/RDS_SSL_FIX_REPORT.md (179行)
md/SSL_CERTIFICATE_UPDATED.md (105行)
md/FIX_LINE_ENDINGS_REPORT.md (330行)
md/RSYNC_SETUP_COMPLETE.md (195行)
```

**内容構成**:
- AWSデプロイメント完全手順
- Terraform実行ガイド
- SSL/TLS証明書設定
- RDSデータベース設定
- rsyncデプロイ設定
- トラブルシューティング

#### 5. `CHANGELOG.md` ★新規作成（ルートディレクトリ）★
**統合元**: 8ファイル

```
md/RELEASE_NOTES_2.1.1.md (117行)
md/QR_DEPLOY_COMPLETE_REPORT.md (356行)
md/QR_SCAN_FIX_DEPLOY_20251016.md (348行)
md/QR_SCAN_MANUAL_INPUT_DEPLOY.md (304行)
md/QR_SEPARATE_TAB_DEPLOY_20251016.md (307行)
md/QR_INSPECTION_MOCK_DEPLOY_20251016.md (288行)
md/QR_CAMERA_ERROR_FIX_REPORT.md (306行)
```

**内容構成**:
- バージョン履歴（v2.1.1 ← v2.1 ← v2.0 ← v1.0）
- 各リリースの変更内容
- デプロイ日時と担当者
- 修正履歴・バグフィックス

#### 6. `docs/MOBILE_OPTIMIZATION.md` ★新規作成★
**統合元**: 3ファイル

```
md/web/MOBILE_OPTIMIZATION.md (380行)
md/web/MOBILE_SUMMARY.md (353行)
md/web/DEVICE_MODE_GUIDE.md (471行)
```

**内容構成**:
- モバイルデバイス対応方針
- デバイスモード選択機能（iPad Mini / iPhone 6）
- レスポンシブデザイン実装
- ビューポート設定
- パフォーマンス最適化

#### 7. `docs/AWS_DEPLOYMENT_GUIDE.md` ★新規作成★
**統合元**: 6ファイル

```
doc/aws/AWS_DEPLOYMENT.md (774行)
doc/aws/AWS_DEPLOYMENT_GUIDE.md (726行)
doc/aws/AWS_STARTUP_GUIDE.md (587行)
doc/aws/AWS_README.md (267行)
doc/aws/AWS_QUICKSTART.md (110行)
doc/aws/QUICKSTART_AWS.md (92行)
```

**内容構成**:
- クイックスタート（5分で起動）
- 詳細セットアップ手順
- aws-startup.sh使用方法
- EC2/RDS/ALB設定
- トラブルシューティング

#### 8. `README.md` ★既存更新（ルートディレクトリ）★
**統合元**: 3ファイル

```
doc/README.md (327行)
doc/README2.md (312行)
doc/README3.md (1,066行)
```

**内容構成**:
- プロジェクト概要
- システムアーキテクチャ
- クイックスタート
- 主要機能一覧
- ディレクトリ構造
- 開発ガイド
- ライセンス

#### 9. `docs/OPERATIONS_MANUAL.md` ★移動・統合★
**統合元**: 3ファイル

```
doc/guides/OPERATION_MANUAL.md (732行) - 移動
md/CAMERA_API_ERROR_GUIDE.md (356行) - 統合
```

**内容構成**:
- システム操作手順書
- 各画面の使い方
- カメラAPIエラー解決ガイド
- よくある質問（FAQ）

#### 10. `docs/DATABASE_DESIGN.md` ★既存更新★
**統合元**: 1ファイル

```
md/DATABASE_SCHEMA.md (686行) - 統合
```

**内容構成**:
- 既存のdocs/DATABASE_DESIGN.md（741行）に
- md/DATABASE_SCHEMA.md（686行）を統合
- PostgreSQLスキーマ定義
- テーブル関係図
- インデックス設計

---

### ステップ2: 保持するマークダウンファイル（22ファイル）

以下のファイルは**重要なため保持**します：

#### トップレベル（4ファイル）
```
✅ CLAUDE.md (190行) - Claude Code向けガイド
✅ copilot-instructions.md (263行) - GitHub Copilot向け指示書
✅ claude-skills-presentation.md (417行) - プレゼンテーション資料
✅ README.md (更新版)
✅ CHANGELOG.md (新規作成)
```

#### docs/ ディレクトリ（10ファイル）
```
✅ docs/DATABASE_DESIGN.md (更新版)
✅ docs/QR_INSPECTION_API_INTEGRATION.md (563行) - API統合ドキュメント
✅ docs/HARDCODED_DATA_ANALYSIS.md (969行) - データ分析レポート
✅ docs/AWS_TEXTRACT_SETUP.md (159行) - AWS Textractセットアップ
✅ docs/QR_SCANNER_GUIDE.md (新規作成)
✅ docs/QR_INSPECTION_GUIDE.md (新規作成)
✅ docs/SAFARI_IOS_OPTIMIZATION.md (新規作成)
✅ docs/DEPLOYMENT_GUIDE.md (新規作成)
✅ docs/MOBILE_OPTIMIZATION.md (新規作成)
✅ docs/AWS_DEPLOYMENT_GUIDE.md (新規作成)
✅ docs/OPERATIONS_MANUAL.md (移動・更新版)
```

#### md/ ディレクトリ（7ファイル - 重要レポートのみ）
```
✅ md/SOURCE_FILES_INVENTORY.md (691行) - 本レポート
✅ md/CONSOLIDATION_PLAN.md - 統廃合計画（参考）
✅ md/CONSOLIDATION_PLAN_REVISED.md - 修正版（参考）
✅ md/SYSTEM_SPECIFICATION.md (1,422行) - システム仕様書
✅ md/SCHEDULER_ANALYSIS_REPORT.md (355行) - スケジューラ分析
✅ md/DEPLOY_GUIDE.md (187行) - Quick Deployガイド
✅ md/deploylog.md (209行) - デプロイログ
```

#### terraform/ ディレクトリ（1ファイル）
```
✅ terraform/README.md (373行) - Terraform構成ガイド
```

#### md/terraform/ ディレクトリ（3ファイル）
```
✅ md/terraform/DEPLOY_GUIDE.md (394行) - Terraformデプロイスクリプト
✅ md/terraform/COST_OPTIMIZATION.md (318行) - コスト最適化ガイド
✅ md/terraform/QUICK_START.md (69行) - クイックスタート
```

#### doc/ ディレクトリ（4ファイル）
```
✅ doc/guides/PROMPT_TEMPLATES.md (877行) - プロンプトテンプレート
✅ doc/guides/FLYER_PROMPT.md (322行) - チラシ作成用照会文
✅ doc/ocr/OCR_USAGE_GUIDE.md (411行) - OCR使い方ガイド
✅ doc/ocr/OCR_IMPROVEMENT_ROADMAP.md (273行) - OCR改善ロードマップ
```

#### github-pages-qr-test/ ディレクトリ（1ファイル）
```
✅ github-pages-qr-test/README.md (191行) - QRテストデモ
```

**保持ファイル合計**: 32ファイル

---

### ステップ3: 削除するマークダウンファイル（51ファイル）

以下のファイルは統合ドキュメントに内容を移行後、**削除**します：

#### md/ ディレクトリ（35ファイル削除）

**QRスキャナー関連（15ファイル）:**
```
❌ md/QR_SCANNER_BRUSHUP_REPORT.md
❌ md/QR_SCANNER_COMPARISON.md
❌ md/QR_COMPARISON_ANALYSIS.md
❌ md/QRSCAN_COMPARISON_INDEX_VS_MODULE.md
❌ md/QRSCAN_INTEGRATION_ANALYSIS.md
❌ md/QR_SCAN_ANALYSIS_20251016.md
❌ md/QRPOC_VS_PRODUCTION_COMPARISON.md
```

**QR検品関連（8ファイル）:**
```
❌ md/QR_INSPECTION_VERSION_COMPARISON.md
❌ md/QR_INSPECTION_REBUILD_REPORT.md
❌ md/QR_INSPECTION_ISSUE_ANALYSIS_20251016.md
❌ md/QR_INSPECTION_SAFARI_UPGRADE.md (空ファイル)
```

**Safari/iOS最適化関連（12ファイル）:**
```
❌ md/SAFARI_INTEGRATION_COMPLETE.md
❌ md/SAFARI_DEPLOY_COMPLETE_20251016.md
❌ md/SAFARI_HTML_INTEGRATION_20251016.md
❌ md/SAFARI_QRSCAN_FEATURES_LIST.md
❌ md/SAFARI2_INTEGRATION_REPORT.md
❌ md/SAFARI2_INTEGRATION_SUMMARY.md
❌ md/SAFARI2_CAMERA_INIT_FIX.md
❌ md/SAFARI2_CACHE_AND_QR_FIX.md
❌ md/IPAD_SAFARI_OPTIMIZATION_DEPLOY.md
❌ md/IOS_QRSCANNER_FIX.md
❌ md/IOS_QRSCANNER_FIX_REPORT.md
❌ md/IOS_CACHE_CLEAR_GUIDE.md
```

**デプロイ・リリース関連（8ファイル）:**
```
❌ md/RELEASE_NOTES_2.1.1.md
❌ md/QR_DEPLOY_COMPLETE_REPORT.md
❌ md/QR_SCAN_FIX_DEPLOY_20251016.md
❌ md/QR_SCAN_MANUAL_INPUT_DEPLOY.md
❌ md/QR_SEPARATE_TAB_DEPLOY_20251016.md
❌ md/QR_INSPECTION_MOCK_DEPLOY_20251016.md
❌ md/QR_CAMERA_ERROR_FIX_REPORT.md
❌ md/DEPLOYMENT_STATUS_20251016.md
```

**その他（7ファイル）:**
```
❌ md/DEPLOYMENT_AWS.md
❌ md/DEPLOYMENT_GUIDE.md
❌ md/HTTPS_SETUP_COMPLETE.md
❌ md/RDS_SSL_FIX_REPORT.md
❌ md/SSL_CERTIFICATE_UPDATED.md
❌ md/FIX_LINE_ENDINGS_REPORT.md
❌ md/RSYNC_SETUP_COMPLETE.md
❌ md/DATABASE_SCHEMA.md
❌ md/CAMERA_API_ERROR_GUIDE.md
❌ md/README2.md
```

#### md/web/ ディレクトリ（14ファイル削除）

```
❌ md/web/SAFARI2_PHASE1_PHASE2_REPORT.md
❌ md/web/SAFARI2_INTEGRATION_REPORT.md
❌ md/web/QR_SCAN_IPHONE_GUIDE.md
❌ md/web/QR_SCAN_COMPARISON_REPORT.md
❌ md/web/QR_INSPECTION_V21_UPGRADE_GUIDE.md
❌ md/web/QR_SCANNER_UPGRADE.md
❌ md/web/QR_INSPECTION_SAFARI_INTEGRATION_REPORT.md
❌ md/web/QR_INSPECTION_V21_COMPLETE_REPORT.md
❌ md/web/QR_INSPECTION_INTEGRATION_REPORT.md
❌ md/web/QR_IMPLEMENTATION_REPORT.md
❌ md/web/ITEMQR_QRSCAN_ANALYSIS.md
❌ md/web/MOBILE_OPTIMIZATION.md
❌ md/web/MOBILE_SUMMARY.md
❌ md/web/DEVICE_MODE_GUIDE.md
```

#### doc/ ディレクトリ（9ファイル削除）

**README系（3ファイル）:**
```
❌ doc/README.md
❌ doc/README2.md
❌ doc/README3.md
```

**AWS系（6ファイル）:**
```
❌ doc/aws/AWS_DEPLOYMENT.md
❌ doc/aws/AWS_DEPLOYMENT_GUIDE.md
❌ doc/aws/AWS_STARTUP_GUIDE.md
❌ doc/aws/AWS_README.md
❌ doc/aws/AWS_QUICKSTART.md
❌ doc/aws/QUICKSTART_AWS.md
```

**運用ガイド（1ファイル - 移動）:**
```
❌ doc/guides/OPERATION_MANUAL.md (docs/に移動)
```

**削除ファイル合計**: 51ファイル

---

## 📁 統廃合後のディレクトリ構造

```
grafana-setup/
├── README.md ★更新★
├── CHANGELOG.md ★新規作成★
├── CLAUDE.md
├── copilot-instructions.md
├── claude-skills-presentation.md
│
├── docs/ (主要ドキュメント統合先)
│   ├── DATABASE_DESIGN.md ★更新★
│   ├── QR_INSPECTION_API_INTEGRATION.md
│   ├── HARDCODED_DATA_ANALYSIS.md
│   ├── AWS_TEXTRACT_SETUP.md
│   ├── QR_SCANNER_GUIDE.md ★新規作成★
│   ├── QR_INSPECTION_GUIDE.md ★新規作成★
│   ├── SAFARI_IOS_OPTIMIZATION.md ★新規作成★
│   ├── DEPLOYMENT_GUIDE.md ★新規作成★
│   ├── MOBILE_OPTIMIZATION.md ★新規作成★
│   ├── AWS_DEPLOYMENT_GUIDE.md ★新規作成★
│   └── OPERATIONS_MANUAL.md ★移動・更新★
│
├── md/ (重要レポート・ログのみ)
│   ├── SOURCE_FILES_INVENTORY.md
│   ├── CONSOLIDATION_PLAN.md
│   ├── SYSTEM_SPECIFICATION.md
│   ├── SCHEDULER_ANALYSIS_REPORT.md
│   ├── DEPLOY_GUIDE.md
│   ├── deploylog.md
│   └── terraform/
│       ├── DEPLOY_GUIDE.md
│       ├── COST_OPTIMIZATION.md
│       └── QUICK_START.md
│
├── doc/ (補足ガイド)
│   ├── guides/
│   │   ├── PROMPT_TEMPLATES.md
│   │   └── FLYER_PROMPT.md
│   └── ocr/
│       ├── OCR_USAGE_GUIDE.md
│       └── OCR_IMPROVEMENT_ROADMAP.md
│
├── terraform/
│   └── README.md
│
├── github-pages-qr-test/
│   └── README.md
│
├── web/ (すべてのHTML・JS保持)
└── api/ (すべてのJS保持)
```

---

## 🚀 実行計画

### Phase 1: 統合ドキュメントの作成（10ファイル）

1. docs/QR_SCANNER_GUIDE.md作成
2. docs/QR_INSPECTION_GUIDE.md作成
3. docs/SAFARI_IOS_OPTIMIZATION.md作成
4. docs/DEPLOYMENT_GUIDE.md作成
5. CHANGELOG.md作成
6. docs/MOBILE_OPTIMIZATION.md作成
7. docs/AWS_DEPLOYMENT_GUIDE.md作成
8. README.md更新
9. docs/OPERATIONS_MANUAL.md作成（移動・統合）
10. docs/DATABASE_DESIGN.md更新

### Phase 2: 旧ファイルの削除（51ファイル）

- md/ ディレクトリ: 35ファイル削除
- md/web/ ディレクトリ: 14ファイル削除
- doc/ ディレクトリ: 9ファイル削除（移動含む）

### Phase 3: コミットとプッシュ

各フェーズ完了後にコミットし、最後にプッシュ

---

## ✅ 承認確認

この計画で統廃合を実行してよろしいですか？

- [x] HTMLファイル: すべて保持（削除なし）
- [x] JavaScriptファイル: すべて保持（削除なし）
- [ ] マークダウンファイル: 83 → 32ファイル（51ファイル削除、10ファイル新規作成）

承認後、Phase 1から順次実行します。
