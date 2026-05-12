// src/modules/health/health-admin.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SkipTransform } from '@common/decorators/skip-transform.decorator';
import { HealthDependenciesService } from '@modules/health/health-dependencies.service';
import { DependencyHealthDto } from '@modules/health/dto/dependency-health.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin/health', version: VERSION_NEUTRAL })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class HealthAdminController {
  constructor(
    private readonly healthDependenciesService: HealthDependenciesService,
  ) {}

  @Get('dependencies')
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  @ApiOperation({
    summary: 'Check detailed health of all dependencies (admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dependency health details',
    type: [DependencyHealthDto],
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  async checkDependencies(): Promise<DependencyHealthDto[]> {
    return this.healthDependenciesService.checkAll();
  }
}
