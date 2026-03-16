import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product } from '../models/product.model';

/**
 * 製品サービス
 *
 * 【学習ポイント】
 * - 既存のfetch('/api/products')をAngular流に書き換えた例
 * - ApiServiceに委譲することでURL管理を一元化
 */
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private api: ApiService) {}

  /** 製品一覧取得 */
  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('/products');
  }

  /** 製品詳細取得 */
  getProduct(id: number): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  /** 製品追加 */
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.api.post<Product>('/products', product);
  }

  /** 製品更新 */
  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, product);
  }
}
