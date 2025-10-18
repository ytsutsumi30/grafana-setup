# カメラAPI「サポートされていません」エラー解決ガイド

## 🔍 エラー症状

QR同梱物検品画面で「QRスキャン開始」ボタンを押すと、以下のエラーメッセージが表示される：

```
この端末ではカメラAPIがサポートできません
```

または

```
カメラAPIを利用できません
```

---

## 📋 原因と解決方法

### 1️⃣ **HTTPでアクセスしている（最も一般的）**

#### 原因
カメラAPI（`getUserMedia`）は**セキュアコンテキスト**でのみ動作します。
- ✅ HTTPS（`https://`）
- ✅ localhost（`http://localhost` または `http://127.0.0.1`）
- ❌ HTTP（`http://192.168.x.x` や `http://172.x.x.x`など）

#### 確認方法
ブラウザのアドレスバーを確認：
```
http://192.168.3.6        ← ❌ HTTPなので動作しない
https://192.168.3.6       ← ✅ HTTPSなら動作する
http://localhost           ← ✅ localhostなら動作する
```

#### 解決方法A: **HTTPS環境のセットアップ（推奨）**

```bash
# SSLセットアップスクリプトを実行
cd /home/tsutsumi/grafana-setup
./setup-ssl.sh
```

実行すると：
1. 自己署名SSL証明書が生成される（有効期間365日）
2. nginx設定が自動的にHTTPSに対応
3. nginxコンテナが再起動される

その後、iPhoneから以下のURLにアクセス：
```
https://192.168.3.6
```

⚠️ **初回アクセス時の注意**
- 「この接続ではプライバシーが保護されません」という警告が出ます
- **「詳細を表示」→「このWebサイトを閲覧」**をタップして続行してください
- 自己署名証明書のため、この警告は正常な動作です

#### 解決方法B: **ローカルアクセス（テスト用）**

サーバーが直接操作できる場合：
```bash
# サーバー上のブラウザで以下にアクセス
http://localhost
```

---

### 2️⃣ **iOSのカメラ権限が許可されていない**

#### 原因
iOSの設定でSafariのカメラアクセスが拒否されている

#### 確認方法
iPhoneの設定アプリを開く：
```
設定 → Safari → カメラ
```

または

```
設定 → プライバシーとセキュリティ → カメラ → Safari
```

#### 解決方法
1. 設定アプリを開く
2. **Safari** → **カメラ** → **「許可」**を選択
3. または**プライバシーとセキュリティ** → **カメラ** → **Safari**をオンにする
4. Safariを再起動して再度アクセス

---

### 3️⃣ **ブラウザのバージョンが古い**

#### 原因
getUserMedia APIは以下のバージョンから対応：
- Safari 11+ (iOS 11+)
- Chrome 53+
- Firefox 36+

#### 確認方法
Safariのバージョンを確認：
```
設定 → 一般 → 情報 → バージョン
```

#### 解決方法
1. iOSを最新バージョンにアップデート
2. または別のブラウザ（Chrome、Firefox）を試す

---

### 4️⃣ **Safariの機能制限がかかっている**

#### 原因
- プライベートブラウズモードで開いている
- コンテンツブロッカーが有効
- 企業の管理プロファイルで制限されている

#### 解決方法
1. **通常モード**でSafariを開く（プライベートモードを解除）
2. コンテンツブロッカーを一時的に無効化
3. 管理プロファイルの場合はIT管理者に確認

---

## 🧪 診断ツールの使用

問題の原因を特定するため、診断ツールを使用してください：

### アクセス方法
```
http://192.168.3.6/camera-test.html
または
https://192.168.3.6/camera-test.html
```

### 診断ツールで確認できること
- ✅ プロトコル（HTTP/HTTPS）
- ✅ セキュアコンテキストの状態
- ✅ カメラAPIの対応状況
- ✅ 利用可能なカメラデバイス
- ✅ 実際のカメラ起動テスト
- ✅ 詳細なエラー情報

### 診断結果の見方

#### ✅ すべて正常な場合
```
プロトコル: https: ✅
セキュアコンテキスト: ✅ はい
getUserMedia: ✅ サポートあり
推奨事項: ✅ すべての条件を満たしています!
```
→ **QRスキャンが使用可能です**

#### ❌ HTTPでアクセスしている場合
```
プロトコル: http: ❌
セキュアコンテキスト: ❌ いいえ（HTTP）
getUserMedia: ❌ サポートなし
推奨事項: 🚫 HTTPSが必要です
```
→ **./setup-ssl.shを実行してHTTPSを有効化してください**

---

## 📱 iPhoneでの完全な設定手順

### ステップ1: サーバー側でHTTPSを有効化

```bash
# SSHでサーバーにログイン
ssh tsutsumi@192.168.3.6

# プロジェクトディレクトリに移動
cd /home/tsutsumi/grafana-setup

# SSLセットアップスクリプトを実行
./setup-ssl.sh

# 完了メッセージを確認
# "SSL証明書のセットアップが完了しました！"と表示されればOK
```

### ステップ2: iPhoneの設定確認

```
1. 設定アプリを開く
2. Safari → カメラ → 「許可」を選択
3. プライバシーとセキュリティ → カメラ → Safari をオン
```

### ステップ3: iPhoneからアクセス

```
1. Safariで https://192.168.3.6 を開く
2. 証明書の警告が出たら「詳細を表示」
3. 「このWebサイトを閲覧」をタップ
4. 出荷指示一覧が表示される
5. 「QR検品」ボタンをタップ
6. 検品者名を入力
7. 「QRスキャン開始」をタップ
8. カメラ権限を求められたら「許可」をタップ
```

### ステップ4: QRコードをスキャン

```
1. カメラが起動し、スキャン枠が表示される
2. QRコードを枠内に収める
3. 自動的に読み取りが開始される
4. 読み取り成功すると緑色で表示される
5. すべてのQRコードをスキャン後、「検品完了」
```

---

## 🔧 トラブルシューティング

### Q1: setup-ssl.shを実行したがHTTPSでアクセスできない

**A:** nginxコンテナが正しく再起動されているか確認：

```bash
# コンテナの状態確認
docker-compose ps

# すべてのコンテナを再起動
docker-compose down
docker-compose up -d

# nginxのログを確認
docker-compose logs nginx
```

### Q2: HTTPSでアクセスすると「接続できません」と出る

**A:** ポート443が開放されているか確認：

```bash
# ファイアウォールの確認
sudo ufw status

# ポート443を開放（必要な場合）
sudo ufw allow 443/tcp

# nginxが443ポートでリッスンしているか確認
docker-compose logs nginx | grep "listening on"
```

### Q3: カメラ権限を許可したのに起動しない

**A:** 以下を試してください：

1. Safariを完全に終了（マルチタスク画面から上にスワイプ）
2. iPhoneを再起動
3. 診断ツール（camera-test.html）で詳細確認
4. 「カメラを起動してテスト」ボタンで実際の動作確認

### Q4: 自己署名証明書の警告を毎回出さないようにしたい

**A:** 本番環境では正式なSSL証明書を使用してください：

```bash
# Let's Encryptの場合（ドメイン名が必要）
sudo certbot --nginx -d yourdomain.com
```

または証明書をiPhoneにインストール：
```
1. server.crt ファイルをiPhoneに送信（メールなど）
2. ファイルをタップしてプロファイルをインストール
3. 設定 → 一般 → 情報 → 証明書信頼設定
4. インストールした証明書をオンにする
```

### Q5: コンテナが起動しない

**A:** ログを確認：

```bash
# 全体のログ確認
docker-compose logs

# nginx固有のログ
docker-compose logs nginx

# ポートの競合確認
sudo netstat -tuln | grep -E ':(80|443|3001|5432)'

# コンテナを完全にクリーンアップして再起動
docker-compose down -v
docker-compose up -d
```

---

## 📊 チェックリスト

問題解決の前に、以下を確認してください：

- [ ] HTTPSでアクセスしている（`https://`で始まるURL）
- [ ] またはlocalhostでアクセスしている
- [ ] iOSの設定でSafariのカメラ権限が「許可」になっている
- [ ] Safariが最新バージョン（iOS 11以降）
- [ ] プライベートブラウズモードではない
- [ ] nginxコンテナが起動している（`docker-compose ps`で確認）
- [ ] ポート80と443が開放されている
- [ ] 診断ツール（camera-test.html）で正常と表示される

---

## 🆘 それでも解決しない場合

以下の情報を収集してサポートに問い合わせてください：

1. **診断ツールの結果**
   ```
   https://192.168.3.6/camera-test.html にアクセス
   「クリップボードにコピー」ボタンをタップ
   ```

2. **サーバーログ**
   ```bash
   docker-compose logs nginx > nginx.log
   docker-compose logs production-api > api.log
   ```

3. **環境情報**
   ```bash
   docker-compose ps > containers.txt
   cat /etc/os-release > os-info.txt
   ```

4. **iPhoneの情報**
   - iOSバージョン
   - Safariバージョン
   - 設定 → Safari → カメラ の状態（スクリーンショット）

---

## 📚 参考情報

- [MDN Web Docs - getUserMedia](https://developer.mozilla.org/ja/docs/Web/API/MediaDevices/getUserMedia)
- [Can I use - getUserMedia](https://caniuse.com/stream)
- [Safari Web Content Guide - Using the Camera](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/Introduction/Introduction.html)

---

**作成日**: 2025-10-12  
**対象バージョン**: grafana-setup v1.0  
**テスト環境**: Ubuntu 22.04, iOS 18.x, Safari 18.x

