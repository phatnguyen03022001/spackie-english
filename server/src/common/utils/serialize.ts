export function safeSerialize(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;

  if (typeof value !== 'object') {
    if (typeof value === 'string') return value.slice(0, 1000);
    return value;
  }

  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(value, (key, val: unknown) => {
      if (val !== null && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    });
    return json.length > 5000
      ? { _truncated: true, _size: json.length }
      : JSON.parse(json);
  } catch {
    return { _error: 'Failed to serialize response body' };
  }
}
