#!/bin/bash

###############################################################################
# リリースノート自動生成スクリプト
# 最新のGitコミットからリリースノートを生成
###############################################################################

set -e

# 色設定
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION="2.1.1"
BUILD_DATE=$(date +"%Y-%m-%d")
GIT_COMMIT=$(git rev-parse --short HEAD)

RELEASE_FILE="RELEASE_NOTES_${VERSION}.md"

echo -e "${CYAN}リリースノート生成中...${NC}"

cat > "$RELEASE_FILE" << EOF
# リリースノート v${VERSION}

**リリース日**: ${BUILD_DATE}  
**Git Commit**: ${GIT_COMMIT}

## 📋 概要

QR同梱物検品システムのリリース v${VERSION}

## ✨ 新機能

$(git log --oneline --grep="^feat:" --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD 2>/dev/null || echo "- カメラ切り替え機能追加 (61743a8)")

## 🐛 バグ修正

$(git log --oneline --grep="^fix:" --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD 2>/dev/null || echo "- なし")

## 🔧 改善

$(git log --oneline --grep="^refactor:\|^perf:" --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD 2>/dev/null || echo "- Safari最適化QRスキャナー統合")

## 📝 主な変更点

### QR同梱物検品システム (qr-inspection.html)

- **バージョン管理**: v${VERSION}
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
  - \`window.QR_INSPECTION_VERSION\` でアクセス可能

## 🚀 デプロイ手順

\`\`\`bash
# 1. デプロイ前検証
./verify-deployment.sh

# 2. EC2にデプロイ
./quick-deploy.sh

# 3. ブラウザで確認
# http://<EC2-IP>/qr-inspection.html

# 4. コンソールでバージョン確認
# window.QR_INSPECTION_VERSION
\`\`\`

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

\`\`\`
$(git diff --stat $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~5")..HEAD 2>/dev/null | head -20 || echo "web/qr-inspection.html
web/qr-inspection2.html
verify-deployment.sh (新規)
generate-release-notes.sh (新規)")
\`\`\`

## 🔗 関連ドキュメント

- [QR_SCANNER_COMPARISON.md](QR_SCANNER_COMPARISON.md) - QRスキャナー比較
- [QR_INSPECTION_REBUILD_REPORT.md](QR_INSPECTION_REBUILD_REPORT.md) - 再構築レポート
- [DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md) - AWS デプロイガイド

## 👥 貢献者

- $(git log --pretty=format:"%an" $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD 2>/dev/null | sort -u | tr '\n' ', ' || echo "開発チーム")

---

**次のバージョン予定**: v2.2.0  
**計画機能**:
- 複数QRコード同時検出
- オフライン対応
- 統計ダッシュボード

EOF

echo -e "${GREEN}✓${NC} リリースノート生成完了: ${CYAN}$RELEASE_FILE${NC}"
cat "$RELEASE_FILE"
