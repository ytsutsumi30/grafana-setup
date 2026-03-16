import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShippingService } from '../../core/services/shipping.service';
import { ProductService } from '../../core/services/product.service';
import { InventoryService } from '../../core/services/inventory.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DateJpPipe } from '../../core/pipes/date-jp.pipe';
import { NumberJpPipe } from '../../core/pipes/number-jp.pipe';
import { ShippingInstruction } from '../../core/models/shipping-instruction.model';

/**
 * ダッシュボードコンポーネント
 *
 * 【学習ポイント】
 * - OnInit: コンポーネント初期化時のライフサイクルフック
 * - signal(): Angular 16+のリアクティブ状態管理
 * - subscribe(): Observableからデータを受け取る方法
 *
 * 既存の dashboard 部分（pendingShipments, totalInspections 等の統計表示）に対応
 */
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, StatusBadgeComponent, DateJpPipe, NumberJpPipe],
  template: `
    <div class="container-fluid mt-4">
      <h2 class="mb-4"><i class="fas fa-chart-line me-2"></i>ダッシュボード</h2>

      <!-- 統計カード -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card text-white bg-warning">
            <div class="card-body">
              <h5 class="card-title">出荷待ち</h5>
              <p class="display-6">{{ pendingCount() }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-info">
            <div class="card-body">
              <h5 class="card-title">処理中</h5>
              <p class="display-6">{{ processingCount() }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-success">
            <div class="card-body">
              <h5 class="card-title">出荷済み</h5>
              <p class="display-6">{{ shippedCount() }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-primary">
            <div class="card-body">
              <h5 class="card-title">製品数</h5>
              <p class="display-6">{{ productCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近の出荷指示 -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">最近の出荷指示</h5>
          <a routerLink="/shipping" class="btn btn-sm btn-outline-primary">全て表示</a>
        </div>
        <div class="card-body">
          @if (loading()) {
            <div class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">読み込み中...</span>
              </div>
            </div>
          } @else if (recentShipments().length === 0) {
            <p class="text-muted text-center py-4">出荷指示がありません</p>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>製品名</th>
                    <th>数量</th>
                    <th>出荷日</th>
                    <th>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of recentShipments(); track item.id) {
                    <tr>
                      <td>{{ item.id }}</td>
                      <td>{{ item.product_name || '-' }}</td>
                      <td>{{ item.quantity | numberJp }}</td>
                      <td>{{ item.shipping_date | dateJp }}</td>
                      <td><app-status-badge [status]="item.status"></app-status-badge></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  recentShipments = signal<ShippingInstruction[]>([]);
  pendingCount = signal(0);
  processingCount = signal(0);
  shippedCount = signal(0);
  productCount = signal(0);

  constructor(
    private shippingService: ShippingService,
    private productService: ProductService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // 出荷指示データを取得
    this.shippingService.getShippingInstructions().subscribe({
      next: (data) => {
        this.recentShipments.set(data.slice(0, 10));
        this.pendingCount.set(data.filter(d => d.status === 'pending').length);
        this.processingCount.set(data.filter(d => d.status === 'processing').length);
        this.shippedCount.set(data.filter(d => d.status === 'shipped').length);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('出荷指示の取得に失敗:', err);
        this.loading.set(false);
      }
    });

    // 製品数を取得
    this.productService.getProducts().subscribe({
      next: (data) => this.productCount.set(data.length),
      error: (err) => console.error('製品の取得に失敗:', err)
    });
  }
}
