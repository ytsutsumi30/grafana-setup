import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Inventory } from '../models/inventory.model';

/**
 * 在庫サービス
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private api: ApiService) {}

  getInventory(): Observable<Inventory[]> {
    return this.api.get<Inventory[]>('/inventory');
  }
}
