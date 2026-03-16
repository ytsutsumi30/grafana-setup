import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

/**
 * ルートコンポーネント
 *
 * 【学習ポイント】
 * - これがアプリ全体の「外枠」
 * - <app-navbar>: 全ページ共通のナビゲーションバー
 * - <router-outlet>: ルーティングで切り替わるコンテンツ部分
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class App {}
