import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShippingService } from '../../core/services/shipping.service';
import { ShippingInstruction } from '../../core/models/shipping-instruction.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DateJpPipe } from '../../core/pipes/date-jp.pipe';
import { NumberJpPipe } from '../../core/pipes/number-jp.pipe';

/**
 * 出荷指示一覧コンポーネント
 *
 * 【学習ポイント】
 * - @for: Angularの新しいループ構文（*ngForの後継、Angular 17+）
 * - @if / @else: 新しい条件分岐構文（*ngIfの後継）
 * - track: ループ内の要素を一意に識別（パフォーマンス最適化）
 */
@Component({
  selector: 'app-shipping-instructions',
  imports: [CommonModule, StatusBadgeComponent, DateJpPipe, NumberJpPipe],
  template: `
    <div class="container-fluid mt-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2><i class="fas fa-truck me-2"></i>出荷指示一覧</h2>
      </div>

      <!-- フィルターバー -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <select class="form-select" (change)="filterByStatus($event)">
                <option value="">全てのステータス</option>
                <option value="pending">待機中</option>
                <option value="processing">処理中</option>
                <option value="shipped">出荷済み</option>
                <option value="delivered">配送完了</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- データテーブル -->
      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted">読み込み中...</p>
        </div>
      } @else {
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>製品コード</th>
                  <th>製品名</th>
                  <th>数量</th>
                  <th>出荷日</th>
                  <th>出荷先</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr>
                    <td>{{ item.id }}</td>
                    <td><code>{{ item.product_code || '-' }}</code></td>
                    <td>{{ item.product_name || '-' }}</td>
                    <td>{{ item.quantity | numberJp }}</td>
                    <td>{{ item.shipping_date | dateJp }}</td>
                    <td>{{ item.shipping_location_name || '-' }}</td>
                    <td><app-status-badge [status]="item.status"></app-status-badge></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted py-4">データがありません</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class ShippingInstructionsComponent implements OnInit {
  loading = signal(true);
  allItems = signal<ShippingInstruction[]>([]);
  filteredItems = signal<ShippingInstruction[]>([]);
  private currentFilter = '';

  constructor(private shippingService: ShippingService) {}

  ngOnInit(): void {
    this.shippingService.getShippingInstructions().subscribe({
      next: (data) => {
        this.allItems.set(data);
        this.filteredItems.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('出荷指示の取得に失敗:', err);
        this.loading.set(false);
      }
    });
  }

  filterByStatus(event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    this.currentFilter = status;
    if (!status) {
      this.filteredItems.set(this.allItems());
    } else {
      this.filteredItems.set(this.allItems().filter(i => i.status === status));
    }
  }
}
