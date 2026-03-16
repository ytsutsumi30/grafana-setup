import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../core/services/inventory.service';
import { Inventory } from '../../core/models/inventory.model';
import { NumberJpPipe } from '../../core/pipes/number-jp.pipe';

/**
 * 在庫管理コンポーネント
 */
@Component({
  selector: 'app-inventory',
  imports: [CommonModule, NumberJpPipe],
  template: `
    <div class="container-fluid mt-4">
      <h2 class="mb-4"><i class="fas fa-warehouse me-2"></i>在庫管理</h2>

      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      } @else {
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>製品コード</th>
                  <th>製品名</th>
                  <th class="text-end">現在庫</th>
                  <th class="text-end">引当済み</th>
                  <th class="text-end">有効在庫</th>
                </tr>
              </thead>
              <tbody>
                @for (item of inventory(); track item.id) {
                  <tr>
                    <td><code>{{ item.product_code || '-' }}</code></td>
                    <td>{{ item.product_name || '-' }}</td>
                    <td class="text-end">{{ item.current_stock | numberJp }}</td>
                    <td class="text-end">{{ item.reserved_stock | numberJp }}</td>
                    <td class="text-end fw-bold"
                        [class.text-danger]="item.available_stock <= 0"
                        [class.text-success]="item.available_stock > 0">
                      {{ item.available_stock | numberJp }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted py-4">在庫データがありません</td>
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
export class InventoryComponent implements OnInit {
  loading = signal(true);
  inventory = signal<Inventory[]>([]);

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.inventoryService.getInventory().subscribe({
      next: (data) => {
        this.inventory.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('在庫の取得に失敗:', err);
        this.loading.set(false);
      }
    });
  }
}
