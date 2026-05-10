import type { LoggerService } from '@common/logger/logger.service';

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly timeout: number;

  constructor(
    private readonly name: string,
    private readonly logger: LoggerService,
    failureThreshold = 3,
    timeout = 60000,
  ) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.logger.setContext?.(`CircuitBreaker:${name}`);
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.logger.warn?.(
          `Circuit breaker ${this.name} is half-open, allowing one request`,
        );
      } else {
        this.logger.warn?.(
          `Circuit breaker ${this.name} is open, rejecting request`,
        );
        throw new Error(`Service ${this.name} is unavailable (circuit open)`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.logger.log?.(
        `Circuit breaker ${this.name} closed after successful request`,
      );
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.lastFailureTime = Date.now();
      this.logger.error?.(
        `Circuit breaker ${this.name} opened after half-open failure`,
      );
    } else if (
      this.state === 'CLOSED' &&
      this.failureCount >= this.failureThreshold
    ) {
      this.state = 'OPEN';
      this.lastFailureTime = Date.now();
      this.logger.error?.(
        `Circuit breaker ${this.name} opened after ${this.failureThreshold} failures`,
      );
    }
  }
}
