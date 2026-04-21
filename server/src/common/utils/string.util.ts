// src/common/utils/string.util.ts

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(
  str: string,
  length: number,
  suffix: string = '...',
): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}
