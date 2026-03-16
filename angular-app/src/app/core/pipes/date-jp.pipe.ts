import { Pipe, PipeTransform } from '@angular/core';

/**
 * 日本語日付フォーマットパイプ
 *
 * 【学習ポイント】
 * - Pipe: テンプレート内でデータを変換するAngularの仕組み
 * - 既存の utils.formatDate() をAngular流に書き換え
 * - 使い方: {{ someDate | dateJp }}
 */
@Pipe({
  name: 'dateJp'
})
export class DateJpPipe implements PipeTransform {
  transform(value: string | null | undefined, includeTime = false): string {
    if (!value) return '-';
    const date = new Date(value);
    return includeTime
      ? date.toLocaleString('ja-JP')
      : date.toLocaleDateString('ja-JP');
  }
}
