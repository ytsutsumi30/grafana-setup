# Angular SES参入 学習・移行統合計画

## 目的

SES（SE）としてAngular案件に参入するために、本プロジェクト（生産管理システム）を教材として
**Angular実践スキルを習得**しつつ、**ポートフォリオとしても提示可能な成果物**を作る。

---

## あなたのスキルマップと Angular への橋渡し

```
┌─────────────────────────────────────────────────────────┐
│  あなたの既存スキル          →  Angularでの対応          │
├─────────────────────────────────────────────────────────┤
│  Java Spring (DI/MVC)       →  Angular DI / Component   │
│  JavaScript (ES6+)          →  TypeScript (上位互換)     │
│  Bootstrap 5                →  そのまま使える            │
│  REST API設計               →  HttpClient で呼ぶだけ     │
│  HTML/DOM操作               →  テンプレート構文に置換     │
│  SQL/DB設計                 →  変更なし                  │
└─────────────────────────────────────────────────────────┘
```

**重要: Spring経験者はAngularの習得が最も速い。**
DI、コンポーネント指向、ライフサイクル管理、テスト手法の概念がほぼ同じ。

| Spring の概念 | Angular の対応概念 |
|---|---|
| `@Component` | `@Component` (同じ名前!) |
| `@Service` | `@Injectable` |
| `@Autowired` (DI) | コンストラクタインジェクション |
| `@RequestMapping` | `Routes` (ルーティング) |
| `@Valid` (バリデーション) | `Validators` (Reactive Forms) |
| `application.properties` | `environment.ts` |
| Maven/Gradle | Angular CLI (`ng build`, `ng serve`) |
| JUnit | Jasmine + Karma / Vitest |

---

## 学習フェーズ（8週間）

### Week 1: TypeScript基礎 + Angular環境構築

**目標:** TypeScriptの型システムを理解し、Angularプロジェクトを起動する

#### Day 1-2: TypeScript入門
```typescript
// Java経験者なら直感的に理解できる
// Java:  String name = "hello";
// TS:    let name: string = "hello";

// インターフェース（Javaのinterfaceと同じ概念）
interface Product {
  id: number;
  product_name: string;
  quantity?: number;        // ? = nullable (Javaの@Nullable相当)
}

// ジェネリクス（Javaと同じ）
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

**やること:**
- [ ] TypeScript公式ハンドブックを読む（型、インターフェース、ジェネリクス）
- [ ] 本プロジェクトの `angular-app/src/app/core/models/` を読み、型定義を理解する

#### Day 3-4: Angular環境構築と起動
```bash
# 本プロジェクトで実際に動かす
docker compose --profile angular up -d
# → http://localhost:4200 でAngular版にアクセス
```

**やること:**
- [ ] `docker compose --profile angular up -d` でAngularを起動
- [ ] ブラウザで確認、Chrome DevToolsでコンポーネント構造を確認
- [ ] `angular-app/src/app/app.ts` を読み、ルートコンポーネントの仕組みを理解

#### Day 5-7: コンポーネントの基礎
**教材:** 本プロジェクトの `StatusBadgeComponent` を読み解く

```typescript
// Java の考え方で理解する
// StatusBadgeComponent = 再利用可能なUIパーツ（Javaの共通部品クラスに相当）
@Component({
  selector: 'app-status-badge',    // HTMLタグ名 = <app-status-badge>
  template: `<span>{{ statusText }}</span>`  // JSPのEL式に似ている
})
export class StatusBadgeComponent {
  @Input() status = '';  // Springの@RequestParamに似た「外から値を受け取る」仕組み
}
```

**やること:**
- [ ] `shared/components/status-badge/` のコードを読む
- [ ] 新しいコンポーネントを1つ自作（例: `loading-spinner`）
- [ ] `@Input()` と `@Output()` を使った親子間のデータ受け渡しを試す

---

### Week 2: Service / DI / HttpClient

**目標:** API通信をAngular流で実装できるようになる

#### Day 1-3: ServiceとDI（Spring経験が直結）

```typescript
// Spring:
// @Service
// public class ProductService {
//     @Autowired private RestTemplate restTemplate;
// }

// Angular:（ほぼ同じ構造！）
@Injectable({ providedIn: 'root' })  // ≒ @Service + @Singleton
export class ProductService {
  constructor(private http: HttpClient) {}  // ≒ @Autowired
}
```

**やること:**
- [ ] `core/services/api.service.ts` を読み、共通API基盤を理解
- [ ] `core/services/product.service.ts` を読み、個別サービスの実装パターンを理解
- [ ] 新しいサービス（例: `shipping-location.service.ts`）を自作

#### Day 4-5: Observable / RxJS（最重要かつ最大の学習コスト）

```typescript
// Java Stream API に似ているが「非同期」
// Java:   list.stream().filter(x -> x > 5).map(x -> x * 2).collect(toList())
// RxJS:   observable$.pipe(filter(x => x > 5), map(x => x * 2)).subscribe()

// 実用例: API呼び出し
this.productService.getProducts().subscribe({
  next: (data) => this.products = data,      // 成功時
  error: (err) => console.error(err)          // 失敗時
});
```

**やること:**
- [ ] `features/dashboard/dashboard.component.ts` の `subscribe()` パターンを読む
- [ ] RxJS の `Observable`, `subscribe`, `pipe`, `map`, `filter` を学ぶ
- [ ] 既存のダッシュボードに新しい統計カードを追加してみる

#### Day 6-7: Router（ページ遷移）

```typescript
// Spring MVC の @RequestMapping に相当
// Spring:  @GetMapping("/products") → ProductController
// Angular: { path: 'products', component: ProductsComponent }
```

**やること:**
- [ ] `app.routes.ts` を読み、ルーティング定義を理解
- [ ] 新しいルート（例: `/shipping-locations`）を追加
- [ ] `routerLink`, `routerLinkActive` の使い方を体験

---

### Week 3-4: フォーム + CRUD操作

**目標:** データの登録・編集・削除をAngularで実装できる

#### Reactive Forms（Springのフォームバリデーションに相当）

```typescript
// Spring: @Valid @RequestBody ProductForm form
// Angular:
this.productForm = this.fb.group({
  product_code: ['', [Validators.required, Validators.maxLength(50)]],
  product_name: ['', Validators.required],
  quantity: [0, [Validators.required, Validators.min(1)]]
});
```

**実践課題:**
- [ ] 製品登録フォームをAngularで作成（Reactive Forms使用）
- [ ] バリデーションエラーの表示
- [ ] 編集モード（既存データの読み込み → フォームにセット）
- [ ] 削除確認ダイアログ

---

### Week 5-6: 実画面の移行実践

**目標:** 本プロジェクトの画面をAngularに1つずつ移行する

| 週 | 移行対象 | 学べること |
|---|---|---|
| Week 5前半 | 出荷先マスタ画面 | シンプルなCRUD画面の移行パターン |
| Week 5後半 | 納品先マスタ画面 | 同様のパターンを反復（定着） |
| Week 6前半 | 出荷指示の詳細・編集 | 複雑なフォーム、セレクトボックス連携 |
| Week 6後半 | 検品画面 | 状態遷移のあるワークフロー |

**各移行で行うこと:**
1. 既存HTMLファイルの構造を分析
2. Angularコンポーネントとして再実装
3. 同じAPIを呼び出して動作確認
4. 既存画面とAngular版を並べて表示比較

---

### Week 7-8: 実務で使う応用技術

**目標:** SES現場で即戦力になるための技術を習得

#### Week 7: テスト + エラーハンドリング
```typescript
// JUnitに相当するテストの書き方
describe('ProductService', () => {
  it('should fetch products', () => {
    // Spring MockMvc に似た HttpClient のモック
    const httpMock = TestBed.inject(HttpTestingController);
    service.getProducts().subscribe(products => {
      expect(products.length).toBe(3);
    });
    httpMock.expectOne('/api/products').flush(mockProducts);
  });
});
```

**やること:**
- [ ] 既存コンポーネントにユニットテストを追加
- [ ] HttpClientのモックテスト
- [ ] グローバルエラーハンドラー（`ErrorHandler`）の実装
- [ ] HTTPインターセプター（認証トークン付与、エラー共通処理）

#### Week 8: 状態管理 + パフォーマンス
- [ ] Signal による状態管理（本プロジェクトで既に使用中）
- [ ] `OnPush` 変更検知戦略
- [ ] 遅延読み込み（`loadComponent`、本プロジェクトで既に使用中）
- [ ] Angular DevTools での パフォーマンス分析

---

## SES現場で求められるスキルチェックリスト

### 必須スキル（参入前に習得）

| # | スキル | 本プロジェクトでの対応 | チェック |
|---|---|---|---|
| 1 | TypeScript の型定義 | `core/models/*.model.ts` | [ ] |
| 2 | Component の作成と利用 | 全 `features/` 配下 | [ ] |
| 3 | Service / DI | `core/services/*.service.ts` | [ ] |
| 4 | HttpClient でのAPI通信 | `api.service.ts` | [ ] |
| 5 | Router でのページ遷移 | `app.routes.ts` | [ ] |
| 6 | Reactive Forms | Week 3-4 で実装 | [ ] |
| 7 | `@Input` / `@Output` | `StatusBadgeComponent` | [ ] |
| 8 | Pipe の作成 | `core/pipes/` | [ ] |
| 9 | `@for` / `@if` 制御構文 | 全テンプレート | [ ] |
| 10 | Angular CLI の操作 | `ng serve`, `ng build`, `ng generate` | [ ] |

### あると強いスキル（現場参入後に深める）

| # | スキル | 説明 |
|---|---|---|
| 1 | RxJS オペレータ | `switchMap`, `debounceTime`, `combineLatest` 等 |
| 2 | ガード（Route Guard） | 認証チェック、権限制御 |
| 3 | インターセプター | 共通ヘッダー、エラーハンドリング |
| 4 | Angular Material | Google製UIコンポーネントライブラリ |
| 5 | NgRx / Signal Store | 大規模状態管理 |
| 6 | SSR (Angular Universal) | SEO対応 |
| 7 | i18n (国際化) | 多言語対応 |
| 8 | テスト（Jasmine/Karma） | ユニットテスト、E2Eテスト |

---

## 日次学習スケジュール（平日の場合）

```
┌─────────────────────────────────────────────────┐
│  時間          内容                              │
├─────────────────────────────────────────────────┤
│  朝 30分      Angular公式ドキュメントを読む      │
│  昼休み 15分  前日の復習・メモ整理               │
│  夜 1-2時間   本プロジェクトで実装練習            │
│  週末 3-4時間 まとまった機能の移行実装            │
├─────────────────────────────────────────────────┤
│  合計: 平日 約2時間 + 週末 約4時間               │
│  8週間合計: 約110時間                            │
└─────────────────────────────────────────────────┘
```

---

## SES面談での想定Q&A

### Q1: 「Angularの経験年数は？」
> **回答例:** 「実務としてのAngular経験は浅いですが、Java Springで5年以上の開発経験があり、
> DIやコンポーネント指向の設計思想は同じです。自主的にAngularで生産管理システムの
> フロントエンドを移行するプロジェクトを進めており、Component、Service、Router、
> HttpClient、Reactive Forms を使った CRUD 画面を実装済みです。」

### Q2: 「TypeScriptはどの程度使えますか？」
> **回答例:** 「Javaの型システムに慣れているため、TypeScriptの型定義、インターフェース、
> ジェネリクスは自然に使えます。自主プロジェクトでは全てTypeScriptで
> 型安全な実装を行っています。」

### Q3: 「RxJSは理解していますか？」
> **回答例:** 「基本的なObservable、subscribe、pipe操作は理解しています。
> Java Stream APIと概念が近く、非同期処理の考え方は掴んでいます。
> switchMap や combineLatest などの応用オペレータも学習中です。」

### Q4: 「Angularのバージョンは？」
> **回答例:** 「最新のAngular 17+（スタンドアロンコンポーネント、新制御構文 `@for`/`@if`、
> Signal）を使って開発しています。NgModule方式も理解しているので、
> レガシープロジェクトにも対応可能です。」

### Q5: 「Spring経験はAngularにどう活きますか？」
> **回答例:**
> - DI（依存性注入）の概念がそのまま通用する
> - MVC設計 → Component + Service の分離に自然に適応
> - REST API設計の知識 → フロント・バック両面から設計できる
> - テスト文化（JUnit → Jasmine/Karma）が共通

---

## ポートフォリオとして見せる成果物

本プロジェクトの Angular 移行成果を以下の形でまとめる：

```
見せるもの:
1. GitHub リポジトリ（angular-app/ ディレクトリ）
2. 動作するデモ（Docker一発起動）
3. 既存 Vanilla JS → Angular の比較表
4. 技術選定の理由（なぜAngularか）

アピールポイント:
- 「既存システムを止めずに段階移行」の設計力
- TypeScript による型安全な実装
- Spring的な設計思想の踏襲（DI, Service層分離）
- Docker + nginx による本番想定の構成
```

---

## 参考リソース

### 最優先（この順番で進める）
1. **Angular公式 Tour of Heroes** - https://angular.dev/tutorials
2. **本プロジェクトの angular-app/ ソースコード**（コメント付き学習教材）
3. **TypeScript公式ハンドブック** - https://www.typescriptlang.org/docs/

### 補助教材
4. RxJS公式 - https://rxjs.dev/guide/overview
5. Angular日本語コミュニティ - https://community.angular.jp/
