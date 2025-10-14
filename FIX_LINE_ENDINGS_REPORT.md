# 改行コード問題とRDSバージョン修正

## 🔧 修正内容

### 1. **改行コード問題の解決** ✅

#### 問題
```bash
./deploy.sh 
bash: ./deploy.sh: /bin/bash^M: bad interpreter: No such file or directory
```

#### 原因
- Windows形式の改行コード（CRLF = `\r\n`）が含まれている
- Bashインタープリタが`\r`（キャリッジリターン）を認識できない

#### 解決方法
全shellスクリプトの改行コードをLFに変換：

```bash
sed -i 's/\r$//' <ファイル名>
```

#### 対象ファイル（9個）
```
✓ ./test-qr-iphone.sh
✓ ./iphone-https-guide.sh
✓ ./setup-ssl.sh
✓ ./terraform/deploy.sh
✓ ./terraform/modules/ec2/user_data.sh
✓ ./setup-complete.sh
✓ ./manage.sh
✓ ./github-pages-qr-test/deploy.sh
✓ ./fix-line-endings.sh
```

---

### 2. **RDS PostgreSQLバージョン修正** ✅

#### 問題
```
Error: creating RDS DB Instance (poc-production-db): 
Cannot find version 15.5 for postgres
```

#### 原因
- PostgreSQL 15.5は利用不可
- AWS RDSで利用可能なバージョン:
  - 15.7, 15.8, 15.10, 15.12, 15.13, **15.14**

#### 修正内容
`terraform/modules/rds/main.tf` 87行目:

```diff
- engine_version = "15.5"
+ engine_version = "15.14"  # Latest stable version in 15.x series
```

---

## 📋 修正手順

### 自動修正（推奨）

```bash
cd ~/grafana-setup

# 全shellスクリプトの改行コード修正
./fix-line-endings-all.sh

# またはワンライナー
find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} \;
```

### 手動修正

個別ファイルごとに修正：

```bash
cd ~/grafana-setup

# deploy.sh
sed -i 's/\r$//' terraform/deploy.sh

# manage.sh
sed -i 's/\r$//' manage.sh

# その他
sed -i 's/\r$//' setup-ssl.sh
sed -i 's/\r$//' iphone-https-guide.sh
# ...
```

---

## ✅ 修正確認

### 改行コードの確認

```bash
# 方法1: fileコマンド
file terraform/deploy.sh
# 正常: "Bourne-Again shell script, UTF-8 text executable"
# 異常: "with CRLF line terminators" が含まれる

# 方法2: odコマンド（先頭10バイト確認）
od -c terraform/deploy.sh | head -1
# 正常: \n のみ
# 異常: \r\n が含まれる

# 方法3: grep確認
grep -P '\r$' terraform/deploy.sh
# 正常: 何も出力されない
# 異常: マッチする行が表示される
```

### RDSバージョンの確認

```bash
# 利用可能なPostgreSQLバージョン確認
aws rds describe-db-engine-versions \
    --engine postgres \
    --engine-version 15 \
    --query 'DBEngineVersions[*].EngineVersion' \
    --output table

# Terraformファイル確認
grep engine_version terraform/modules/rds/main.tf
# 出力: engine_version = "15.14"
```

### 実行テスト

```bash
cd ~/grafana-setup/terraform

# deploy.shが実行可能か確認
./deploy.sh --help 2>&1 | head -5

# 改行コードがLFか確認
head -1 deploy.sh && file deploy.sh
```

---

## 🛠️ トラブルシューティング

### Q1: "bad interpreter" エラーが残る

```bash
# shebang行を確認
head -1 terraform/deploy.sh
# 出力: #!/bin/bash

# 改行コードを再修正
sed -i 's/\r$//' terraform/deploy.sh

# 実行権限を確認
ls -la terraform/deploy.sh
chmod +x terraform/deploy.sh
```

### Q2: sed: command not found

Windowsのsedを使用している可能性があります：

```bash
# WSL/Linuxのsedを使用
/usr/bin/sed -i 's/\r$//' terraform/deploy.sh

# またはdos2unix利用
sudo apt-get install dos2unix
dos2unix terraform/deploy.sh
```

### Q3: RDSバージョンエラーが残る

```bash
cd ~/grafana-setup/terraform

# Terraformキャッシュをクリア
rm -rf .terraform .terraform.lock.hcl

# 再初期化
terraform init

# 修正確認
terraform plan | grep engine_version
```

---

## 📊 修正前後の比較

### 改行コード

| 状態 | 改行 | ファイルコマンド出力 |
|------|------|---------------------|
| **修正前** | CRLF (`\r\n`) | `with CRLF line terminators` |
| **修正後** | LF (`\n`) | `UTF-8 text executable` |

### RDSバージョン

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| **バージョン** | 15.5 | 15.14 |
| **利用可能性** | ❌ 利用不可 | ✅ 利用可能 |
| **リリース日** | - | 最新安定版 |

---

## 🎯 予防策

### 開発環境での設定

#### Git設定（推奨）

```bash
# Gitで自動変換を無効化
cd ~/grafana-setup
git config core.autocrlf false

# .gitattributes作成
cat > .gitattributes << 'EOF'
# Shell scripts must use LF
*.sh text eol=lf

# Markdown and config files
*.md text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.json text eol=lf

# Binary files
*.png binary
*.jpg binary
EOF
```

#### VSCode設定

```json
{
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

#### エディタ設定（vim）

```bash
# ~/.vimrc に追加
set fileformat=unix
```

### CIでのチェック

```bash
# .github/workflows/check-line-endings.yml
name: Check Line Endings
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for CRLF
        run: |
          if grep -r $'\r' . --include='*.sh' --exclude-dir='.git'; then
            echo "Error: CRLF line endings found"
            exit 1
          fi
```

---

## 📚 参考情報

### 改行コードについて

- **LF** (`\n`): Unix/Linux/macOS標準
- **CRLF** (`\r\n`): Windows標準
- **CR** (`\r`): 古いMac OS (9以前)

### RDSバージョン管理

```bash
# 最新バージョン確認
aws rds describe-db-engine-versions \
    --engine postgres \
    --query 'DBEngineVersions[?starts_with(EngineVersion, `15.`)].EngineVersion' \
    --output text | tr '\t' '\n' | sort -V | tail -1

# 出力: 15.14
```

### 便利なコマンド

```bash
# 全.shファイルの改行コード確認
find . -name "*.sh" -exec file {} \; | grep -i crlf

# 全.shファイルに実行権限付与
find . -name "*.sh" -exec chmod +x {} \;

# 全.shファイルのshebang確認
find . -name "*.sh" -exec head -1 {} \; | sort | uniq -c
```

---

## ✅ 完了チェックリスト

修正完了後、以下を確認：

- [ ] 全shellスクリプトの改行コードがLFに変換済み
- [ ] `file`コマンドで"CRLF"が表示されない
- [ ] `./deploy.sh`が実行できる（エラーなし）
- [ ] RDSバージョンが15.14に変更済み
- [ ] `terraform plan`がエラーなく完了
- [ ] 実行権限が全スクリプトに付与済み
- [ ] Git設定で今後のCRLF混入を防止

---

**最終更新:** 2025年10月13日  
**修正ファイル数:** 9個のshellスクリプト + 1個のTerraformファイル

