/**
 * 製品モデル - products テーブルに対応
 */
export interface Product {
  id: number;
  product_code: string;
  product_name: string;
  description?: string;
  unit?: string;
  created_at?: string;
  updated_at?: string;
}
