/**
 * 在庫モデル - inventory テーブルに対応
 */
export interface Inventory {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;  // GENERATED列
  updated_at?: string;
}
