# Claude Skills プレゼンテーション

---

## 📋 目次

1. Claude Skillsとは
2. 主要な特徴
3. Skills vs Slash Commands vs MCP Servers
4. Skillsの構造
5. 作成方法（3つの方法）
6. ベストプラクティス
7. ユースケース例
8. まとめ

---

## 🎯 Claude Skillsとは

**Skills**は、Claude AIが自動的に発見して読み込むことができる、モジュール化された再利用可能なタスクパッケージです。

### キーポイント

- **リリース日**: 2025年10月16日
- **利用可能**: Pro、Max、Team、Enterpriseユーザー
- **自動起動**: Claudeがリクエストとスキルの説明に基づいて自律的に判断
- **構成**: 指示、スクリプト、リソースを含むフォルダー

### 基本コンセプト

```
スキル = ドメイン知識 + プロセス + 実行可能コード
```

Skillsは、専門知識をパッケージ化し、Claudeが関連性があると判断したときに自動的にロードします。

---

## ✨ 主要な特徴

### 1. **モデル起動型（Model-invoked）**

- ユーザーが明示的にトリガーする必要がない
- Claudeが自然言語の会話から自動的に適切なスキルを選択
- スラッシュコマンド（ユーザー起動型）とは異なる

### 2. **トークン効率的**

- 起動時はメタデータ（name/description）のみをスキャン
- 必要なときだけフルコンテンツをロード
- コンテキストウィンドウを効率的に使用

### 3. **ファイルシステムベース**

- ディスク上のMarkdownファイルとして保存
- ターミナルコマンド（curl、grep、python等）を活用可能
- ローカルファイルやスクリプトとの統合が容易

### 4. **スコープ管理**

```
~/.claude/skills/          # 個人用Skills（全プロジェクトで利用可能）
.claude/skills/            # プロジェクト固有のSkills
```

---

## 🔄 Skills vs Slash Commands vs MCP Servers

### 比較表

| 特徴 | Skills | Slash Commands | MCP Servers |
|------|--------|----------------|-------------|
| **起動方法** | 自動（モデル判断） | ユーザー入力 (/command) | プロトコル経由 |
| **構成** | フォルダー + SKILL.md | .mdファイル | JSON-RPCサーバー |
| **コンテキスト負荷** | 低（メタデータのみ） | 低 | 高（全MCP詳細） |
| **用途** | 知識基盤・ワークフロー | 頻繁なプロンプト | ツール・リソース統合 |
| **可搬性** | ローカル | ローカル | クロスクライアント |
| **発見性** | 自動 | ユーザー依存 | 起動時全スキャン |

### 使い分けのガイド

- **Skills**: ドメイン専門知識を教える、反復可能なワークフローを定義
- **Slash Commands**: 頻繁に使用する特定タスクのショートカット
- **MCP Servers**: ベンダー中立的な統合、複数AIシステムで再利用

**💡 ヒント**: SkillsとSlash Commandsは共存可能。ニーズに応じて使い分ける。

---

## 📁 Skillsの構造

### 必須コンポーネント: SKILL.md

```markdown
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions

Provide clear, step-by-step guidance for Claude.
```

### 2部構成

1. **YAMLフロントマター（必須）**
   - `name`: 小文字、数字、ハイフンのみ（最大64文字）
   - `description`: スキルの内容と使用タイミング（最大1024文字）

2. **Markdownコンテンツ**
   - Claudeへの具体的な指示
   - ステップバイステップのガイダンス

### ディレクトリ構造例

```
my-skill/
├── SKILL.md              # 必須: コアプロンプト
├── reference.md          # オプション: 参照ドキュメント
├── examples.md           # オプション: 使用例
├── scripts/
│   └── helper.py         # オプション: ヘルパースクリプト
└── templates/
    └── template.txt      # オプション: テンプレート
```

### 実践例: レポート生成スキル

```markdown
---
name: "standardized-report-generator"
description: "Create a structured, branded report with Executive Summary,
Findings, Recommendations, and Appendix; use when the user asks for a
standardized report."
---

# Standardized Report Generator

## Instructions

1. Collect inputs:
   - report_title
   - audience
   - required_sections
   - page_length

2. Generate structure:
   - Executive Summary (1 page)
   - Key Findings (2-3 pages)
   - Recommendations (1-2 pages)
   - Appendix (as needed)

3. Apply branding guidelines:
   - Use company color scheme
   - Include logo placement
   - Follow typography standards
```

---

## 🛠️ 作成方法（3つの方法）

### 1. **会話型作成（最も簡単）** ⭐推奨

Claudeとの会話でスキルを作成：

```
例: 「四半期ビジネスレビュー用のスキルを作成したい」
```

**手順:**
- Claudeに作成したいスキルを説明
- テンプレート、例、ブランドガイドラインなどをアップロード
- Claudeが対話的に質問してSKILL.mdを生成

**メリット:**
- 「skill-creator」スキルが対話的にガイド
- フォルダー構造を自動生成
- SKILL.mdを適切にフォーマット

### 2. **手動作成**

ファイルシステムで直接作成：

```bash
# 個人用スキル
mkdir -p ~/.claude/skills/my-custom-skill
cd ~/.claude/skills/my-custom-skill
touch SKILL.md

# プロジェクト固有スキル
mkdir -p .claude/skills/project-skill
cd .claude/skills/project-skill
touch SKILL.md
```

**手順:**
1. ディレクトリ作成
2. SKILL.mdファイルを作成
3. YAMLフロントマターを記述
4. 指示内容を記述

### 3. **Claude Code経由**

Claude Codeの対話セッション内で作成：

```
例: 「データ分析用のスキルを作成してください」
```

Claude Codeがファイルシステム操作でスキルを構築。

---

## 📝 ベストプラクティス

### 1. **明確な説明文を書く** ⭐最重要

```markdown
# ❌ 悪い例
description: "Reports tool"

# ✅ 良い例
description: "Generate quarterly business reports with executive summary,
financial analysis, and recommendations; use when user requests formal
business reporting or QBR preparation"
```

**重要**: `description`はClaudeがスキルを発見するための鍵！

### 2. **段階的に学ぶ**

1. Anthropicの公式スキルから始める
2. 既存スキルの動作を理解
3. カスタムスキルを作成
4. 複数のプロンプトでテスト

### 3. **単一責任原則**

```
❌ 避ける: すべてを行う1つの巨大なスキル
✅ 推奨: 目的ごとに分離された複数のスキル
```

**例:**
- `customer-analysis` - 顧客データ分析
- `report-generator` - レポート生成
- `code-reviewer` - コードレビュー

### 4. **テストとイテレーション**

- 異なるプロンプトでテスト
- エッジケースを確認
- フィードバックに基づいて改善
- バージョン管理で変更を追跡

### 5. **リソースを効果的に活用**

```
my-skill/
├── SKILL.md                    # メイン指示
├── examples/
│   ├── good-example.md        # 良い例
│   └── bad-example.md         # 悪い例（避けるべきパターン）
├── templates/
│   └── output-template.md     # 出力フォーマット
└── scripts/
    └── data-processor.py      # データ処理スクリプト
```

---

## 💡 ユースケース例

### 1. **開発ワークフロー**

```markdown
---
name: "code-review-workflow"
description: "Perform comprehensive code review including style, security,
performance, and testing; use when user asks for code review or PR analysis"
---

# Code Review Workflow

## Instructions

1. Analyze code structure and patterns
2. Check for security vulnerabilities
3. Evaluate performance implications
4. Review test coverage
5. Generate detailed feedback with examples
```

### 2. **ビジネスプロセス**

```markdown
---
name: "customer-feedback-analyzer"
description: "Analyze customer feedback, categorize issues, identify trends,
and generate actionable insights; use for customer feedback analysis or
sentiment analysis tasks"
---

# Customer Feedback Analyzer

## Instructions

1. Load feedback data from provided files
2. Categorize by: Product, Service, UX, Pricing
3. Perform sentiment analysis
4. Identify top 5 trends
5. Generate executive summary with recommendations
```

### 3. **データ分析**

```markdown
---
name: "quarterly-metrics-dashboard"
description: "Generate quarterly business metrics dashboard with KPIs,
trends, and visualizations; use when preparing quarterly reviews or
executive dashboards"
---

# Quarterly Metrics Dashboard

## Instructions

1. Import data from CSV/JSON
2. Calculate KPIs: Revenue, Growth Rate, Churn, NPS
3. Generate trend analysis charts
4. Create executive summary
5. Export to PowerPoint/PDF format
```

---

## 🎓 まとめ

### Claude Skillsの価値

✅ **効率性**: ワークフローを再利用可能なパッケージ化
✅ **自動化**: Claudeが自動的に適切なスキルを選択
✅ **スケーラビリティ**: チーム全体で知識を共有
✅ **柔軟性**: プロジェクト固有または個人用に設定可能
✅ **統合性**: 既存のツールやスクリプトとシームレスに連携

### 始め方

1. **学習**: 公式スキルリポジトリを探索
   - GitHub: https://github.com/anthropics/skills

2. **実験**: 簡単なスキルから作成
   - 会話型作成を使用

3. **共有**: チームでスキルを共有
   - プロジェクトディレクトリに配置

4. **改善**: フィードバックを基に継続的に改善

### リソース

- 📖 公式ドキュメント: https://docs.claude.com/en/docs/claude-code/skills
- 🔧 GitHubリポジトリ: https://github.com/anthropics/skills
- 💬 ヘルプセンター: https://support.claude.com
- 🌟 Awesome Skills: https://github.com/travisvn/awesome-claude-skills

---

## Q&A

質問はありますか？

**Thank you!** 🙏

---

## 補足資料

### ファイル配置場所

```bash
# 確認コマンド
ls ~/.claude/skills/          # 個人用Skills
ls .claude/skills/            # プロジェクト固有Skills
```

### よくある質問

**Q: SkillsとMCPは競合しますか？**
A: いいえ、補完的です。Skillsは知識基盤、MCPは統合レイヤーです。

**Q: 既存のSlash Commandsはどうなりますか？**
A: 引き続き使用可能。両方とも併用できます。

**Q: Skillsはトークンを多く消費しますか？**
A: いいえ、起動時はメタデータのみ。必要時にフルコンテンツをロード。

**Q: チームでSkillsを共有できますか？**
A: はい、プロジェクトディレクトリ（.claude/skills/）に配置することで共有可能。

### 詳細情報

- Simon Willison's Blog: "Claude Skills are awesome, maybe a bigger deal than MCP"
- Engineering Blog: "Equipping agents for the real world with Agent Skills"
- Medium: 実践的なSkills活用例

---

**作成日**: 2025年11月1日
**バージョン**: 1.0
**対象**: Claude Pro/Max/Team/Enterprise ユーザー
