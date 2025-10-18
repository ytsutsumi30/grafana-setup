# リリースノート v2.1.1

**リリース日**: 2025-10-18  
**Git Commit**: 61743a8

## 📋 概要

QR同梱物検品システムのリリース v2.1.1

## ✨ 新機能

- feat: QR同梱物検品にカメラ切り替え機能を追加 (61743a8)
- feat: safari2.htmlの改善されたQRスキャン機能をqr-inspection.html/qr-inspection2.htmlに適用 (2863970)

## 🐛 バグ修正

- fix: safari2.htmlのキャッシュ問題と初回QR読み取り改善 (04006e2)

## 🔧 改善

- refactor: qr-inspection.htmlをv2.1ベースに戻し、safari2.htmlの全改善を再適用 (ec17079)

## 📝 主な変更点

### QR同梱物検品システム (qr-inspection.html)

- **バージョン管理**: v2.1.1
- **カメラ機能**: 
  - 📷 カメラ切り替えボタン追加（複数カメラ対応）
  - 🔄 背面カメラ優先、手動切り替え可能
  - ⚡ Safari iOS最適化（3スキャン/秒）
  - 🎯 動的スキャン領域計算
  
- **品質向上**:
  - ✅ BFCache完全対応
  - ✅ キャリブレーション機能（初回4秒、以降2秒）
  - ✅ 最初のフレーム待機処理
  - ✅ デバイス検出とフォールバック

### デプロイメント管理

- **検証スクリプト**: verify-deployment.sh
  - ファイル整合性チェック（MD5ハッシュ）
  - Git状態確認
  - Dockerコンテナ状態確認
  - EC2接続テスト
  - デプロイメント情報JSON生成

- **バージョン表示**:
  - HTMLメタタグにバージョン情報
  - ページフッターに表示
  - コンソールログに詳細情報
  - `window.QR_INSPECTION_VERSION` でアクセス可能

## 🚀 デプロイ手順

```bash
# 1. デプロイ前検証
./verify-deployment.sh

# 2. EC2にデプロイ
./quick-deploy.sh

# 3. ブラウザで確認
# http://<EC2-IP>/qr-inspection.html

# 4. コンソールでバージョン確認
# window.QR_INSPECTION_VERSION
```

## ✅ 検証チェックリスト

- [ ] ローカルでの動作確認
  - [ ] QRスキャン機能
  - [ ] カメラ切り替え
  - [ ] 検品完了フロー
  
- [ ] デプロイ検証
  - [ ] ファイルMD5ハッシュ一致
  - [ ] バージョン情報表示
  - [ ] Git状態確認
  
- [ ] EC2での動作確認
  - [ ] HTTPアクセス
  - [ ] カメラ権限
  - [ ] Safari iOS対応
  - [ ] Chrome/Edge対応

## 📊 変更ファイル

```
 QR_INSPECTION_REBUILD_REPORT.md     |  387 ++++++
 QR_INSPECTION_VERSION_COMPARISON.md |  621 ++++++++++
 QR_SCANNER_COMPARISON.md            |  516 ++++++++
 web/qr-inspection.html              | 2211 ++++++++++++++++-------------------
 web/qr-inspection2.html             | 2211 ++++++++++++++++-------------------
 5 files changed, 3524 insertions(+), 2422 deletions(-)
```

## 🔗 関連ドキュメント

- [QR_SCANNER_COMPARISON.md](QR_SCANNER_COMPARISON.md) - QRスキャナー比較
- [QR_INSPECTION_REBUILD_REPORT.md](QR_INSPECTION_REBUILD_REPORT.md) - 再構築レポート
- [DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md) - AWS デプロイガイド

## 👥 貢献者

- y.tsutsumi30@gmail.com,

---

**次のバージョン予定**: v2.2.0  
**計画機能**:
- 複数QRコード同時検出
- オフライン対応
- 統計ダッシュボード

