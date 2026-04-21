// src/common/utils/serialize.util.ts

/**
 * Serialize an object safely, handling circular references and limiting string length.
 * @param value - The value to serialize
 * @param maxDepth - Maximum depth for nested objects (default 5)
 * @returns Serialized safe object or primitive
 */
export function safeSerialize(value: unknown, maxDepth: number = 5): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object') {
    if (typeof value === 'string') {
      return value.slice(0, 1000); // Limit string length
    }
    return value;
  }

  const seen = new WeakSet<object>();
  const serialize = (obj: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return { _truncated: true, _reason: 'max depth exceeded' };
    }

    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (typeof obj !== 'object') {
      if (typeof obj === 'string') return obj.slice(0, 1000);
      return obj;
    }

    // Sau các kiểm tra, obj chắc chắn là object (không null/undefined)
    if (seen.has(obj)) {
      return '[Circular]';
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => serialize(item, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = serialize(val, depth + 1);
    }
    return result;
  };

  try {
    const serialized = serialize(value, 0);
    const jsonString = JSON.stringify(serialized);
    if (jsonString.length > 5000) {
      return { _truncated: true, _size: jsonString.length };
    }
    return serialized;
  } catch {
    return { _error: 'Failed to serialize response body' };
  }
}
