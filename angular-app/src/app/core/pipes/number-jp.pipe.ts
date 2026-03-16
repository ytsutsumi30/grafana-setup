import { Pipe, PipeTransform } from '@angular/core';

/**
 * 日本語数値フォーマットパイプ
 * 使い方: {{ someNumber | numberJp }}
 */
@Pipe({
  name: 'numberJp'
})
export class NumberJpPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toLocaleString('ja-JP');
  }
}
