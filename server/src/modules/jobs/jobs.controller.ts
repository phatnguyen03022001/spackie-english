// src/modules/jobs/jobs.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JobsService } from '@modules/jobs/jobs.service';
import {
  JobHistoryQueryDto,
  JobHistoryItemDto,
} from '@modules/jobs/dto/job-history-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { PaginationResponseDto } from '@common/dto/pagination-response.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Get job history for current user (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated job history',
    type: PaginationResponseDto<JobHistoryItemDto>,
  })
  async getUserJobs(
    @CurrentUser() user: RequestUser,
    @Query() query: JobHistoryQueryDto,
  ): Promise<PaginationResponseDto<JobHistoryItemDto>> {
    const { data, total } = await this.jobsService.getUserJobs(user.id, query);
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }
}
