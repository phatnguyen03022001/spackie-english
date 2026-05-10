export const createMockRedisService = () => {
  const store = new Map<string, string>();
  const matchesPattern = (key: string, pattern: string) => {
    const regex = new RegExp(
      `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`,
    );

    return regex.test(key);
  };

  const client = {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          deleted += 1;
        }
      }
      return Promise.resolve(deleted);
    }),
    incr: jest.fn((key: string) => {
      const nextValue = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(nextValue));
      return Promise.resolve(nextValue);
    }),
    expire: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
    scan: jest
      .fn()
      .mockImplementation((cursor, match, pattern, count, callback) => {
        const keys = [...store.keys()].filter((key) =>
          matchesPattern(key, pattern),
        );
        const result: [string, string[]] = ['0', keys];

        if (typeof callback === 'function') {
          callback(null, result);
          return undefined;
        }

        return Promise.resolve(result);
      }),
    flushall: jest.fn(() => {
      store.clear();
      return Promise.resolve('OK');
    }),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  };

  return {
    client,
    ping: jest.fn().mockResolvedValue('PONG'),
    reset: () => {
      store.clear();
    },
  };
};

export const createMockMailService = () => {
  let lastOtp: string | undefined;

  const send = jest.fn(
    (_email: string, _subject: string, html: string, _text: string) => {
      // Extract 6-digit OTP from HTML
      const match = html.match(/<b>(\d{6})<\/b>/);
      if (match) lastOtp = match[1];
      return Promise.resolve();
    },
  );

  return {
    send,
    getLastOtp: () => lastOtp,
    ping: jest.fn().mockResolvedValue(undefined),
    reset: () => {
      lastOtp = undefined;
    },
  };
};

export const createMockStorageService = () => {
  let counter = 0;
  return {
    upload: jest
      .fn()
      .mockImplementation(
        (
          buffer: Buffer,
          _originalName: string,
          options?: { folder?: string },
        ) => {
          counter++;
          const folder = options?.folder || 'uploads';
          const uniqueId = `mock-${Date.now()}-${counter}`;
          return Promise.resolve({
            url: `https://example.com/${folder}/${uniqueId}.png`,
            publicId: `${folder}/${uniqueId}`,
            format: 'png',
            size: buffer.length,
          });
        },
      ),
    delete: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://example.com/signed-url.jpg'),
  };
};
