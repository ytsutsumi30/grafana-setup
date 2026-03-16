/**
 * 出荷指示モデル - shipping_instructions テーブルに対応
 */
export interface ShippingInstruction {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  shipping_date: string;
  destination?: string;
  shipping_location_name?: string;
  delivery_location_name?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
