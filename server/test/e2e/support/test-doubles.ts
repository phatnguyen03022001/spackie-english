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
    scan: jest.fn().mockImplementation((...args) => {
      // Handle both positional and object-style Redis scan calls
      // ioredis scan(cursor, 'MATCH', pattern, 'COUNT', count, callback?)
      let pattern: string;
      let callback:
        | ((err: Error | null, result: [string, string[]]) => void)
        | undefined;

      if (typeof args[0] === 'string' || typeof args[0] === 'number') {
        // Find MATCH and pattern in positional args
        const matchIdx = args.indexOf('MATCH');
        pattern = matchIdx >= 0 ? args[matchIdx + 1] : '*';
        // Find callback (last arg if it's a function)
        callback =
          typeof args[args.length - 1] === 'function'
            ? args[args.length - 1]
            : undefined;
      } else {
        pattern = '*';
        callback = undefined;
      }

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
  // Map lưu OTP theo email để tránh ghi đè khi có nhiều email cùng lúc
  const otpByEmail = new Map<string, string>();

  const send = jest.fn(
    (email: string, _subject: string, html: string, _text: string) => {
      // Extract 6-digit OTP from HTML
      const match = html.match(/<b>(\d{6})<\/b>/);
      if (match) {
        lastOtp = match[1];
        otpByEmail.set(email, match[1]);
      }
      return Promise.resolve();
    },
  );

  return {
    send,
    getLastOtp: () => lastOtp,
    getOtpForEmail: (email: string) => otpByEmail.get(email),
    ping: jest.fn().mockResolvedValue(undefined),
    reset: () => {
      lastOtp = undefined;
      otpByEmail.clear();
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

/**
 * Creates a mock Bull queue that prevents actual Redis connections in tests.
 * Bull queues try to connect to Redis on instantiation, causing timeouts
 * when Redis is not available in the test environment.
 */
export const createMockQueue = () => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  empty: jest.fn().mockResolvedValue(undefined),
  isReady: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  client: { ping: jest.fn().mockResolvedValue('PONG') },
});

/**
 * List of all Bull queue names used in the application.
 * These queues need to be mocked in e2e tests to prevent
 * actual Redis connections that would cause timeouts.
 */
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  AI_ENRICHMENT: 'ai-enrichment',
  MEDIA_ENRICHMENT: 'media-enrichment',
  PAYMENT_WEBHOOK: 'payment-webhook',
  FAILED_TTS: 'failed-tts',
} as const;

/**
 * Creates a mock PusherService that prevents actual Pusher connections in tests.
 * PusherService tries to connect to Pusher API on onModuleInit, causing failures
 * when Pusher is not available in the test environment.
 */
export const createMockPusherService = () => ({
  trigger: jest.fn().mockResolvedValue(undefined),
  triggerToUser: jest.fn().mockResolvedValue(undefined),
  authenticate: jest.fn().mockReturnValue({ auth: 'mock-auth' }),
  ping: jest.fn().mockResolvedValue(true),
});

/**
 * Creates a single mock queue instance and returns an array of
 * override providers for all known Bull queues.
 * Note: getQueueToken is imported inline to avoid circular dependencies.
 */
export const createMockQueueOverrides = () => {
  const mockQueue = createMockQueue();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getQueueToken } = require('@nestjs/bull');
  return Object.values(QUEUE_NAMES).map((name) => ({
    provide: getQueueToken(name),
    useValue: mockQueue,
  }));
};
