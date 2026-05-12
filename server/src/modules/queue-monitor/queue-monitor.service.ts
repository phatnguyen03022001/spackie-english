// src/modules/queue-monitor/queue-monitor.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService } from '@common/logger/logger.service';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class QueueMonitorService {
  constructor(
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(QueueMonitorService.name);
  }

  async getStats(): Promise<QueueStats[]> {
    const queues = [this.notificationQueue];
    const stats: QueueStats[] = [];

    for (const queue of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.push({
        name: queue.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
      });
    }

    return stats;
  }

  async getFailedJobs(
    queueName: string,
    start = 0,
    end = 20,
  ): Promise<unknown[]> {
    const queue = this.getQueue(queueName);
    if (!queue) return [];
    const jobs = await queue.getFailed(start, end);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    }));
  }

  async retryFailedJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) return;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  async cleanQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) return;
    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
  }

  private getQueue(name: string): Queue | null {
    if (name === 'notification') {
      return this.notificationQueue;
    }
    return null;
  }
}
