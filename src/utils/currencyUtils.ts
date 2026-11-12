// BUG-02: Currency Utilities — SAR Default (Saudi Riyal), 15% VAT, no type="number" money inputs

export type CurrencyCode = 'SAR' | 'AED' | 'EGP' | 'KWD' | 'QAR' | 'BHD' | 'OMR' | 'USD';

export function formatSAR(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = typeof num === 'number' && !isNaN(num) ? num : 0;
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'SAR'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = typeof num === 'number' && !isNaN(num) ? num : 0;
  const locale = currency === 'SAR' ? 'ar-SA' : currency === 'EGP' ? 'ar-EG' : 'ar-AE';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

export function parseMoneyInput(val: string): number {
  const normalized = val
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^0-9.]/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function sanitizeMoneyText(val: string): string {
  return val
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1');
}
