import { Routes } from '@angular/router';

/**
 * ルーティング定義
 *
 * 【学習ポイント】
 * - Routes: URLパスとコンポーネントの対応を定義
 * - loadComponent: 遅延読み込み（必要な時だけロード → パフォーマンス向上）
 * - redirectTo: リダイレクト設定
 * - 既存の navigateToPage() 関数をAngular Routerに置き換え
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'shipping',
    loadComponent: () =>
      import('./features/shipping-instructions/shipping-instructions.component').then(m => m.ShippingInstructionsComponent)
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/products.component').then(m => m.ProductsComponent)
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
