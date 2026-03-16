import { Component, Input } from '@angular/core';

/**
 * ステータスバッジコンポーネント
 *
 * 【学習ポイント】
 * - @Component: UIの部品を定義するデコレータ
 * - @Input(): 親コンポーネントからデータを受け取る
 * - 既存の utils.getStatusBadge() をコンポーネント化
 *
 * 使い方: <app-status-badge [status]="'pending'"></app-status-badge>
 */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [ngClass]="'status-' + status">{{ statusText }}</span>`,
  styles: [`.badge { font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 1rem; }`]
})
export class StatusBadgeComponent {
  @Input() status = '';

  private readonly statusMap: Record<string, string> = {
    'pending': '待機中',
    'processing': '処理中',
    'shipped': '出荷済み',
    'delivered': '配送完了',
    'approved': '承認済み',
    'rejected': '却下'
  };

  get statusText(): string {
    return this.statusMap[this.status] || this.status;
  }
}
