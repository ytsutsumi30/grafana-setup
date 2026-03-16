import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * ナビゲーションバーコンポーネント
 *
 * 【学習ポイント】
 * - RouterLink: Angularのページ遷移ディレクティブ（<a href>の代替）
 * - RouterLinkActive: 現在のページに対応するリンクをハイライト
 * - 既存の navigateToPage() をRouter連携に置き換え
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" routerLink="/">
          <i class="fas fa-industry me-2"></i>生産管理システム
        </a>
        <button class="navbar-toggler" type="button"
                data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">
                <i class="fas fa-chart-line me-1"></i>ダッシュボード
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/shipping" routerLinkActive="active">
                <i class="fas fa-truck me-1"></i>出荷指示
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/products" routerLinkActive="active">
                <i class="fas fa-boxes-stacked me-1"></i>製品マスタ
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/inventory" routerLinkActive="active">
                <i class="fas fa-warehouse me-1"></i>在庫管理
              </a>
            </li>
          </ul>
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <span class="nav-link text-light opacity-75">
                <i class="fas fa-code me-1"></i>Angular版
              </span>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {}
