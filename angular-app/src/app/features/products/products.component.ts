import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { DateJpPipe } from '../../core/pipes/date-jp.pipe';

/**
 * 製品マスタコンポーネント
 */
@Component({
  selector: 'app-products',
  imports: [CommonModule, DateJpPipe],
  template: `
    <div class="container-fluid mt-4">
      <h2 class="mb-4"><i class="fas fa-boxes-stacked me-2"></i>製品マスタ</h2>

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
                  <th>ID</th>
                  <th>製品コード</th>
                  <th>製品名</th>
                  <th>説明</th>
                  <th>単位</th>
                  <th>登録日</th>
                </tr>
              </thead>
              <tbody>
                @for (product of products(); track product.id) {
                  <tr>
                    <td>{{ product.id }}</td>
                    <td><code>{{ product.product_code }}</code></td>
                    <td>{{ product.product_name }}</td>
                    <td>{{ product.description || '-' }}</td>
                    <td>{{ product.unit || '-' }}</td>
                    <td>{{ product.created_at | dateJp }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted py-4">製品が登録されていません</td>
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
export class ProductsComponent implements OnInit {
  loading = signal(true);
  products = signal<Product[]>([]);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('製品の取得に失敗:', err);
        this.loading.set(false);
      }
    });
  }
}
