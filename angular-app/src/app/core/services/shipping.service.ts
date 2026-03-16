import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ShippingInstruction } from '../models/shipping-instruction.model';

/**
 * 出荷指示サービス
 */
@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  constructor(private api: ApiService) {}

  getShippingInstructions(): Observable<ShippingInstruction[]> {
    return this.api.get<ShippingInstruction[]>('/shipping-instructions');
  }

  getShippingInstruction(id: number): Observable<ShippingInstruction> {
    return this.api.get<ShippingInstruction>(`/shipping-instructions/${id}`);
  }
}
