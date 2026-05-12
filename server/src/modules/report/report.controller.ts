// src/modules/report/report.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ReportService } from '@modules/report/report.service';
import { CreateReportDto } from '@modules/report/dto/create-report.dto';
import { ReportQueryDto } from '@modules/report/dto/report-query.dto';
import { ResolveReportDto } from '@modules/report/dto/resolve-report.dto';
import { ReportResponseDto } from '@modules/report/dto/report-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('reports')
  @ApiOperation({ summary: 'Create a report (authenticated user)' })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateReportDto,
  ): Promise<SuccessResponseDto<ReportResponseDto>> {
    const report = await this.reportService.create(user.id, dto);
    return new SuccessResponseDto(report, 'Report created successfully');
  }

  @Get('admin/reports')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get paginated reports (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated reports' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN)' })
  async findAll(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: ReportResponseDto[]; total: number }> {
    return this.reportService.findAll(query);
  }

  @Get('admin/reports/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get report detail by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report detail' })
  @ApiResponse({ status: 404, description: 'REPORT_NOT_FOUND' })
  async findById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<ReportResponseDto>> {
    const report = await this.reportService.findById(id);
    return new SuccessResponseDto(report);
  }

  @Post('admin/reports/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resolve or reject a report (admin only)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report resolved' })
  @ApiResponse({ status: 404, description: 'REPORT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'REPORT_ALREADY_RESOLVED' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ResolveReportDto,
  ): Promise<SuccessResponseDto<ReportResponseDto>> {
    const report = await this.reportService.resolve(id, user.id, dto);
    return new SuccessResponseDto(report, `Report ${dto.status.toLowerCase()}`);
  }
}
