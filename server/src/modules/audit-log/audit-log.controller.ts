// src/modules/audit-log/audit-log.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { AuditLogQueryDto } from '@modules/audit-log/dto/audit-log-query.dto';
import { AuditLogResponseDto } from '@modules/audit-log/dto/audit-log-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('Admin - Audit Log')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated audit logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN)' })
  async findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<{ data: AuditLogResponseDto[]; total: number }> {
    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log detail by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Audit log detail' })
  @ApiResponse({ status: 404, description: 'AUDIT_LOG_NOT_FOUND' })
  async findById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<AuditLogResponseDto>> {
    const log = await this.auditLogService.findById(id);
    return new SuccessResponseDto(log);
  }
}
