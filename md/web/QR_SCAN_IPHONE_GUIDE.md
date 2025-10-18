# iPhone Safari向けQR検品機能ガイド

## 概要
iPhone SafariでWebカメラを使用したQRコード検品機能を実装しました。

## 主な改善点

### 1. カメラ初期化の最適化
- **段階的制約トライアル**: 5段階の制約パターンで、iPhoneのカメラアクセスを確実に取得
- **長めのタイムアウト**: iPhone特有の初期化遅延に対応（20秒）
- **readyStateの柔軟な判定**: HAVE_CURRENT_DATA (2) 以上で動作開始

### 2. ビデオ要素の設定
iPhone Safari向けに以下の属性を設定：
```html
<video playsinline webkit-playsinline autoplay muted></video>
```

### 3. UIの改善
- **スキャン前**: 初期メッセージ表示
- **スキャン中**: ビデオコンテナ＋スキャンライン＋ステータスオーバーレイ
- **スキャン枠**: 4隅のコーナーマーカー表示
- **連続スキャン**: 成功後、自動的に次のスキャンへ移行

### 4. フォールバック機能
- **QR Scannerライブラリ**: 優先して使用（maxScansPerSecond: 5）
- **BarcodeDetector API**: ライブラリ失敗時のフォールバック
- **詳細エラーメッセージ**: iOS固有のアドバイス表示

## 使用方法

### 1. システム起動
```bash
cd /home/tsutsumi/grafana-setup
./manage.sh start
```

### 2. ブラウザでアクセス
```
http://localhost（または https://your-domain）
```

### 3. QR検品の流れ
1. 出荷指示カードで **「QR検品」** ボタンをクリック
2. QR検品モーダルで **検品者名** を入力
3. **「QRスキャン開始」** ボタンをクリック
4. カメラへのアクセス許可を承認
5. QRコードを画面中央の枠内に収める
6. 自動認識後、次のQRコードをスキャン
7. すべて完了したら **「QR検品完了」** をクリック

## iPhone Safariでの注意事項

### カメラ許可設定
初回アクセス時にカメラ許可が求められます：
- **Safari上のポップアップ**: 「許可」を選択
- **拒否した場合**: iPhone設定アプリ → Safari → カメラ → 「許可」に変更

### HTTPS必須
カメラAPIはHTTPS環境が必須です：
- ローカル開発: `localhost` は例外として動作
- 本番環境: 必ず HTTPS で配信してください

### トラブルシューティング

#### カメラが起動しない
1. **設定を確認**:
   - 設定 → Safari → カメラ → 「許可」または「確認」
2. **ページを再読み込み**
3. **Safariを再起動**

#### QRコードが認識されない
1. **照明を確認**: 明るい場所で試す
2. **距離を調整**: 10〜30cm程度が最適
3. **角度を変える**: 真正面から撮影
4. **テストスキャン**: 「テストスキャン」ボタンでシミュレーション

#### 連続スキャンが動作しない
- 1つ認識後、1秒ほど待機してから次のQRコードを提示してください

## 技術詳細

### 対応機能
- ✅ iPhone Safari 14+
- ✅ iPad Safari
- ✅ Chrome on iOS
- ✅ Edge on iOS
- ✅ Android Chrome
- ✅ Desktop Safari/Chrome/Edge

### 使用ライブラリ
- **qr-scanner@1.4.2**: メインのQR検出エンジン
- **BarcodeDetector API**: ネイティブフォールバック（iOS 17+で実験的サポート）

### カメラ制約
```javascript
// 優先順位の高い順
1. { facingMode: { exact: 'environment' }, width: 1280, height: 720, frameRate: 30 }
2. { facingMode: 'environment', width: 1280, height: 720 }
3. { facingMode: 'environment', width: 640, height: 480 }
4. { facingMode: 'environment' }
5. { video: true }
```

### キャリブレーション
- 最大3回まで自動キャリブレーション
- 各試行で2秒の調整時間
- readyState と videoWidth/videoHeight をチェック

## デバッグ情報

### ブラウザコンソール
開発者ツール（Safari → 開発 → Webインスペクタ）でログ確認：
```
Camera constraints attempt 1/5...
Video readyState: 4 videoWidth: 1280 videoHeight: 720
QR Scanner started successfully
QR code detected: QR-MAIN-PROD001
```

### シミュレーションモード
本番カメラなしでテスト可能：
- 「テストスキャン」ボタンで未確認アイテムをランダム選択
- APIへの送信は実際に行われます

## API連携

### エンドポイント
```
POST /api/qr-inspections
POST /api/qr-inspections/:id/scan
PATCH /api/qr-inspections/:id/complete
```

### データフロー
1. 検品開始 → QR検品記録作成
2. 各スキャン → 個別スキャン記録作成＋進捗更新
3. 検品完了 → ステータス更新＋在庫更新

## パフォーマンス最適化

### iPhone Safari向け
- スキャン頻度: 5回/秒（デスクトップは10回/秒）
- 検出間隔: 300ms（BarcodeDetectorフォールバック時）
- ビデオ再生待機: 1.5秒

### メモリ管理
- モーダルclose時にストリーム解放
- ページ非表示時にスキャン一時停止
- `visibilitychange`, `pagehide`, `beforeunload` でクリーンアップ

## 既知の制限

### iOS制限事項
- **ポップアップブロック**: 自動遷移機能（safari_qr_with_url_redirect.html）はiOSでブロックされる可能性
- **バックグラウンド復帰**: アプリ切り替え後、カメラの再初期化が必要な場合あり
- **低照度**: 暗い場所では認識精度が低下

### 推奨環境
- iOS 15以降
- 良好な照明条件
- 安定したネットワーク接続

## サポート

問題が発生した場合：
1. ブラウザコンソールのエラーログを確認
2. カメラ・ネットワーク設定を確認
3. システム管理者に問い合わせ

## 更新履歴

### v1.0.0 (2025-10-12)
- iPhone Safari対応QRスキャン機能実装
- 段階的カメラ制約トライアル
- UIの大幅改善（スキャンライン、オーバーレイ）
- 連続スキャン自動再開
- BarcodeDetectorフォールバック
- 詳細ログ＆エラーハンドリング
