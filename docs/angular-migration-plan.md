# Angular移行計画書

## 概要

現行のVanilla JavaScript + Bootstrap 5フロントエンドを、Angularに段階的に移行する。
既存システムはそのまま稼働し続け、Angular版は別ポート(4200)で並行稼働する。

## 現行システム構成

```
ポート80 (nginx) → 既存 Vanilla JS フロントエンド
ポート3000      → Node.js API (Express) ← 変更なし（共有）
```

## 移行後の構成

```
ポート80   (nginx) → 既存 Vanilla JS フロントエンド（そのまま維持）
ポート4200 (nginx) → Angular フロントエンド（新規）
ポート3000         → Node.js API (Express) ← 両方から共有
```

---

## フェーズ1: 環境構築とAngular基礎学習（Week 1-2）

### 1.1 Angular開発環境のセットアップ
- [ ] `angular-app/` ディレクトリにAngularプロジェクトを作成
- [ ] DockerコンテナでAngular開発サーバーを起動
- [ ] nginx経由でポート4200にルーティング設定
- [ ] 既存APIへの接続確認

### 1.2 Angular基礎を学ぶ（実践しながら）
学ぶべき概念（順序通り）:

| 順序 | 概念 | 説明 | 既存コードとの対応 |
|------|------|------|-------------------|
| 1 | **Component** | UIの部品（HTMLテンプレート + TypeScript） | 各HTMLページに相当 |
| 2 | **Template構文** | `{{ }}`, `*ngFor`, `*ngIf` | DOM操作の代替 |
| 3 | **Module** | コンポーネントのグループ化 | (JSには無い概念) |
| 4 | **Service / DI** | API通信やビジネスロジックの分離 | `app.js`のAPI呼び出し部分 |
| 5 | **Router** | SPA内のページ遷移 | `navigateToPage()` |
| 6 | **HttpClient** | API通信 | `fetch('/api/...')` |
| 7 | **Reactive Forms** | フォーム管理 | 各フォームのDOM操作 |
| 8 | **Pipe** | データ表示の変換 | `utils.formatDate()` 等 |

---

## フェーズ2: コア画面の移行（Week 3-6）

### 移行対象（優先度順）

| 優先度 | 画面 | 既存ファイル | Angularコンポーネント |
|--------|------|-------------|---------------------|
| 1 | ダッシュボード | `index.html` (dashboard部分) | `DashboardComponent` |
| 2 | 出荷指示一覧 | `shipping-instructions.html` | `ShippingInstructionsComponent` |
| 3 | 製品マスタ | `products.html` | `ProductsComponent` |
| 4 | 在庫管理 | `inventory.html` | `InventoryComponent` |
| 5 | 出荷先マスタ | `shipping-locations.html` | `ShippingLocationsComponent` |
| 6 | 納品先マスタ | `delivery-locations.html` | `DeliveryLocationsComponent` |

### 2.1 共通部品の作成
```
angular-app/src/app/
├── core/                          # コアモジュール
│   ├── services/
│   │   ├── api.service.ts         # API通信の共通サービス
│   │   ├── product.service.ts     # 製品関連API
│   │   ├── shipping.service.ts    # 出荷関連API
│   │   └── inventory.service.ts   # 在庫関連API
│   ├── models/                    # TypeScript型定義
│   │   ├── product.model.ts
│   │   ├── shipping-instruction.model.ts
│   │   └── inventory.model.ts
│   └── pipes/
│       ├── date-jp.pipe.ts        # 日本語日付フォーマット
│       └── number-jp.pipe.ts      # 日本語数値フォーマット
├── shared/                        # 共有コンポーネント
│   ├── components/
│   │   ├── status-badge/          # ステータスバッジ
│   │   ├── data-table/            # 汎用テーブル
│   │   └── confirm-dialog/        # 確認ダイアログ
│   └── shared.module.ts
├── features/                      # 各画面（機能別）
│   ├── dashboard/
│   ├── shipping/
│   ├── products/
│   ├── inventory/
│   └── inspections/
├── app-routing.module.ts          # ルーティング定義
├── app.component.ts               # ルートコンポーネント
└── app.module.ts                  # ルートモジュール
```

### 2.2 既存 → Angular対応表

#### API通信
```javascript
// 既存 (Vanilla JS)
const response = await fetch('/api/products');
const data = await response.json();
```
```typescript
// Angular
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }
}
```

#### テンプレート表示
```javascript
// 既存 (innerHTML直接操作)
element.innerHTML = products.map(p => `<tr><td>${p.name}</td></tr>`).join('');
```
```html
<!-- Angular (テンプレート構文) -->
<tr *ngFor="let product of products">
  <td>{{ product.name }}</td>
</tr>
```

#### 状態管理
```javascript
// 既存 (グローバル変数)
let products = [];
let shippingInstructions = [];
```
```typescript
// Angular (Service内で管理)
@Injectable({ providedIn: 'root' })
export class ProductService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$ = this.productsSubject.asObservable();
}
```

---

## フェーズ3: 高度な機能の移行（Week 7-10）

### 移行対象
| 優先度 | 機能 | 既存ファイル | 備考 |
|--------|------|-------------|------|
| 1 | QR検品 | `qr-inspection.html` | カメラ連携あり |
| 2 | QRスキャナ(iOS) | `safari.html` | BarcodeDetector API |
| 3 | OCR機能 | `ocr*.html` | 画像処理連携 |
| 4 | ピッキング | `ItemPicking.html` | モバイル最適化 |
| 5 | 監視ダッシュボード | `monitoring.html` | Grafana連携 |

### 注意点
- QRスキャナはiOS Safari対応が複雑 → 既存JSの`web/js/qr-scanner.js`をラップして使用
- カメラ系はAngularのライフサイクルに注意（`ngOnDestroy`でストリーム停止）

---

## フェーズ4: 切り替えと既存廃止（Week 11-12）

### 4.1 並行運用テスト
- [ ] Angular版で全画面の動作確認
- [ ] 既存版とAngular版の表示・機能の一致確認
- [ ] パフォーマンス比較

### 4.2 切り替え
```
# nginx設定変更
ポート80 → Angular版に切り替え
ポート8080 → 旧版を残す（しばらくフォールバック用）
```

### 4.3 完全移行後
- 旧`web/`ディレクトリをアーカイブ
- nginx設定をシンプル化
- 旧ポート設定を削除

---

## Docker構成

### docker-compose.yml に追加するサービス

```yaml
# Angular フロントエンド（開発用）
angular-app:
  image: node:18-alpine
  container_name: angular-app
  working_dir: /app
  ports:
    - "4200:4200"
  volumes:
    - ./angular-app:/app
  command: sh -c "npm install && npx ng serve --host 0.0.0.0 --port 4200"
  networks:
    - production-network
```

### nginx追加設定（angular.conf）
```nginx
server {
    listen 4200;
    location / {
        proxy_pass http://angular-app:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://production-api:3000;
    }
}
```

---

## 学習リソース

### 公式ドキュメント（まずここから）
- Angular公式チュートリアル: https://angular.dev/tutorials
- Tour of Heroes（入門向け公式チュートリアル）

### 学習の進め方
1. **Week 1**: Angular CLIでプロジェクト作成、Hello Worldコンポーネント
2. **Week 1**: テンプレート構文（`*ngFor`, `*ngIf`, `{{ }}`）
3. **Week 2**: Service/DIでAPI通信
4. **Week 2**: Routerでページ遷移
5. **Week 3以降**: 実際の画面を1つずつ移行しながら学ぶ

### このプロジェクト固有のポイント
- **Bootstrap 5はAngularでも使える** → `ng-bootstrap`パッケージまたはCDN
- **Font Awesomeも継続利用可能** → `@fortawesome/angular-fontawesome`
- **既存APIは変更不要** → `HttpClient`で同じエンドポイントを呼ぶだけ
