// src/modules/metrics/prometheus.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';

/**
 * Simple Prometheus metrics service.
 * In production, use prom-client for full Prometheus support.
 * This simplified version provides basic metrics in text format.
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  private metrics: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private startTime!: number;

  constructor(
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  onModuleInit(): void {
    this.startTime = Date.now();
  }

  /**
   * Increment a counter.
   */
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);
  }

  /**
   * Set a gauge value.
   */
  setGauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  /**
   * Record HTTP request duration in ms.
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.incrementCounter(
      `http_requests_total{method="${method}",path="${path}",status="${statusCode}"}`,
    );
    this.setGauge(
      `http_request_duration_ms{method="${method}",path="${path}"}`,
      durationMs,
    );
  }

  /**
   * Get all metrics in Prometheus text format.
   */
  async getMetrics(): Promise<string> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const lines: string[] = [];

    // App info
    lines.push('# HELP app_uptime_seconds App uptime in seconds');
    lines.push('# TYPE app_uptime_seconds gauge');
    lines.push(`app_uptime_seconds ${uptime}`);
    lines.push('');

    // Gauges
    lines.push('# HELP app_gauges Custom application gauges');
    lines.push('# TYPE app_gauges gauge');
    for (const [name, value] of this.metrics) {
      lines.push(`${name} ${value}`);
    }
    lines.push('');

    // Counters
    lines.push('# HELP app_counters_total Custom application counters');
    lines.push('# TYPE app_counters_total counter');
    for (const [name, value] of this.counters) {
      lines.push(`${name} ${value}`);
    }
    lines.push('');

    // Redis ping (basic health)
    try {
      const redisPing = await this.cacheManager.ping();
      lines.push('# HELP redis_up Redis is reachable');
      lines.push('# TYPE redis_up gauge');
      lines.push(`redis_up ${redisPing === 'PONG' ? 1 : 0}`);
    } catch {
      lines.push('# HELP redis_up Redis is reachable');
      lines.push('# TYPE redis_up gauge');
      lines.push('redis_up 0');
    }
    lines.push('');

    return lines.join('\n');
  }
}
