import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * API通信の基盤サービス
 *
 * 【学習ポイント】
 * - @Injectable: Angularの依存性注入(DI)で使うデコレータ
 * - providedIn: 'root' → アプリ全体でシングルトンとして提供
 * - HttpClient: Angularの標準HTTP通信モジュール（fetch()の代替）
 * - Observable: RxJSのデータストリーム（Promiseの進化版）
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // 既存APIと同じベースURL（nginx proxy経由）
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}
