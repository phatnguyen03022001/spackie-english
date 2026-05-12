// src/modules/queue-monitor/queue-monitor.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QueueMonitorService } from '@modules/queue-monitor/queue-monitor.service';
import { Roles } from '@common/decorators/roles.decorator';
import { SuccessResponseDto } from '@common/dto/success-response.dto';

@ApiTags('Admin - Queue Monitor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/queues')
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get()
  @ApiOperation({ summary: 'Get queue statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Queue stats' })
  async getStats(): Promise<SuccessResponseDto<unknown>> {
    const stats = await this.queueMonitorService.getStats();
    return new SuccessResponseDto(stats, 'Queue stats fetched');
  }

  @Get(':queueName/failed')
  @ApiOperation({ summary: 'Get failed jobs for a queue' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiQuery({ name: 'start', required: false, type: Number })
  @ApiQuery({ name: 'end', required: false, type: Number })
  async getFailedJobs(
    @Param('queueName') queueName: string,
    @Query('start') start?: number,
    @Query('end') end?: number,
  ): Promise<SuccessResponseDto<unknown>> {
    const jobs = await this.queueMonitorService.getFailedJobs(
      queueName,
      start || 0,
      end || 20,
    );
    return new SuccessResponseDto(jobs, 'Failed jobs fetched');
  }

  @Post(':queueName/jobs/:jobId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async retryFailedJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.queueMonitorService.retryFailedJob(queueName, jobId);
    return new SuccessResponseDto(null, 'Job retry initiated');
  }

  @Post(':queueName/clean')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Clean completed/failed jobs from a queue' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  async cleanQueue(
    @Param('queueName') queueName: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.queueMonitorService.cleanQueue(queueName);
    return new SuccessResponseDto(null, 'Queue cleaned');
  }
}
