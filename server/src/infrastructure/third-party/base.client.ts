import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type { LoggerService } from '@common/logger/logger.service';
import { CircuitBreaker } from '@infrastructure/common/circuit-breaker';
import { requestContext } from '@common/context/request-context';

export abstract class BaseApiClient {
  protected readonly client: AxiosInstance;
  protected readonly logger: LoggerService;
  protected readonly circuitBreaker?: CircuitBreaker;

  constructor(
    baseURL: string,
    timeoutMs: number,
    logger: LoggerService,
    retries = 3,
    retryDelay = 1000,
    useCircuitBreaker = false,
    breakerName?: string,
  ) {
    this.logger = logger;
    this.client = axios.create({
      baseURL,
      timeout: timeoutMs,
    });

    // Inject requestId từ context vào headers
    this.client.interceptors.request.use((config) => {
      const ctx = requestContext.getStore();
      if (ctx?.requestId) {
        config.headers['X-Request-Id'] = ctx.requestId;
      }
      return config;
    });

    // Retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & {
          _retryCount?: number;
        };
        if (!config) return Promise.reject(error);
        config._retryCount = config._retryCount ?? 0;
        if (config._retryCount < retries && this.shouldRetry(error)) {
          config._retryCount++;
          await this.delay(retryDelay * config._retryCount);
          return this.client(config);
        }
        return Promise.reject(error);
      },
    );

    if (useCircuitBreaker && breakerName) {
      this.circuitBreaker = new CircuitBreaker(breakerName, this.logger);
    }
  }

  protected shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 && status !== 501;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const execute = () =>
      this.client.get(url, config).then((res) => res.data as T);
    return this.circuitBreaker ? this.circuitBreaker.call(execute) : execute();
  }

  protected async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const execute = () =>
      this.client.post(url, data, config).then((res) => res.data as T);
    return this.circuitBreaker ? this.circuitBreaker.call(execute) : execute();
  }
}
