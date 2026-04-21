// src/common/utils/date.util.ts

export function formatDate(
  date: Date | string | number,
  locale: string = 'vi-VN',
): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(
  date: Date | string | number,
  locale: string = 'vi-VN',
): string {
  const d = new Date(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function isExpired(date: Date | string | number): boolean {
  return new Date(date) < new Date();
}
