import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

/**
 * アプリケーション設定
 *
 * 【学習ポイント】
 * - provideRouter: ルーティング機能を有効化
 * - provideHttpClient: HttpClient（API通信）を有効化
 * - Angular 17+のスタンドアロン方式（NgModule不要）
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient()
  ]
};
