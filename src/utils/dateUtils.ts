// BUG-01: Strict Date/Time Safety Utilities — NEVER display "Invalid date" or save invalid values.

export function isValidDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  return !isNaN(d.getTime());
}

export function safeSave(datetimeLocalValue: string): string {
  if (!datetimeLocalValue || !datetimeLocalValue.trim()) {
    throw new Error('تاريخ غير صالح');
  }
  const d = new Date(datetimeLocalValue);
  if (isNaN(d.getTime())) {
    throw new Error('تاريخ غير صالح');
  }
  return d.toISOString();
}

export function safeSaveOptional(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function toArabicDateTime(isoString?: string | null): string {
  if (!isoString) return 'تاريخ غير محدد';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'تاريخ غير محدد';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toArabicDate(isoString?: string | null): string {
  if (!isoString) return 'تاريخ غير محدد';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'تاريخ غير محدد';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function toNumericDate(isoString?: string | null): string {
  if (!isoString) return 'غير محدد';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'غير محدد';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function toInputValue(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInputValue(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysUntil(isoString?: string | null): number | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getCountdownArabic(isoString?: string | null): {
  label: string;
  urgency: 'danger' | 'warning' | 'success' | 'muted';
} {
  if (!isoString) return { label: 'تاريخ غير محدد', urgency: 'muted' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { label: 'تاريخ غير محدد', urgency: 'muted' };
  const diffMs = d.getTime() - Date.now();
  if (diffMs < 0) return { label: 'منقضية', urgency: 'muted' };
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const urgency = totalHours < 24 ? 'danger' : totalHours <= 48 ? 'warning' : 'success';
  if (days > 0) {
    return { label: `بعد ${days} يوم و ${hours} ساعة`, urgency };
  }
  return { label: `بعد ${hours} ساعة و ${minutes} دقيقة`, urgency };
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
