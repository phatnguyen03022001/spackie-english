// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { UsersService } from '@modules/users/users.service';
import { UpdateAvatarUseCase } from '@modules/users/use-cases/update-avatar.use-case';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UpdateUserRoleDto } from '@modules/users/dto/update-user-role.dto';
import { UserListQueryDto } from '@modules/users/dto/user-list-query.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CacheTTL } from '@common/decorators/cache-ttl.decorator';
import { ApiPagination } from '@common/decorators/api-pagination.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { PaginationResponseDto } from '@common/dto/pagination-response.dto';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { CACHE_TTL } from '@common/utils/cache.util';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';

import { UsersGdprService } from '@modules/users/users-gdpr.service';
import { GdprExportDto } from '@modules/users/dto/gdpr-export.dto';
import { HardDeleteAccountDto } from '@modules/users/dto/hard-delete-account.dto';

import { Throttle } from '@nestjs/throttler';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto, SuccessResponseDto)
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
    private readonly usersGdprService: UsersGdprService,
  ) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new user (public registration)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.create(createUserDto);
    return new SuccessResponseDto(user, 'User created successfully');
  }

  @Get()
  @Roles('ADMIN')
  @ApiPagination()
  @CacheTTL(CACHE_TTL.LIST)
  @ApiOperation({
    summary:
      'List all users (admin only) with pagination, search, filter, sort',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: PaginationResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  async findAll(
    @Query() query: UserListQueryDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const { data, total } = await this.usersService.findAll(query);
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const profile = await this.usersService.findById(user.id);
    return new SuccessResponseDto(profile);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin or own profile)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'Access denied',
      );
    }
    const user = await this.usersService.findById(id);
    return new SuccessResponseDto(user);
  }

  @Patch('me')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const updated = await this.usersService.update(
      user.id,
      updateUserDto,
      user,
    );
    return new SuccessResponseDto(updated, 'Profile updated');
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Update current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image (jpeg, png, webp) - max 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({
    status: 422,
    description: 'UNPROCESSABLE_ENTITY - invalid file type or size',
  })
  async updateAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          fallbackToMimetype: true,
        })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const updated = await this.updateAvatarUseCase.execute(user.id, file);
    return new SuccessResponseDto(updated, 'Avatar updated');
  }

  @Delete('me')
  @ApiOperation({ summary: 'Soft delete own account' })
  @ApiResponse({ status: 200, description: 'Account soft-deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteOwnAccount(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<null>> {
    await this.usersService.softDelete(user.id, user);
    return new SuccessResponseDto(null, 'Account soft-deleted');
  }

  @Post(':id/ban')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID to ban' })
  @ApiResponse({
    status: 200,
    description: 'User banned',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  async banUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.ban(id);
    return new SuccessResponseDto(user, 'User banned');
  }

  @Post(':id/unban')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID to unban' })
  @ApiResponse({
    status: 200,
    description: 'User unbanned',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  async unbanUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.unban(id);
    return new SuccessResponseDto(user, 'User unbanned');
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID to update role' })
  @ApiResponse({
    status: 200,
    description: 'Role updated',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({
    status: 403,
    description: 'AUTH_INSUFFICIENT_PERMISSIONS or CANNOT_DEMOTE_SELF',
  })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  async updateRole(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.updateRole(admin.id, id, dto);
    return new SuccessResponseDto(user, 'Role updated');
  }

  @Delete(':id/hard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Permanently delete a user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID to permanently delete' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  async hardDeleteUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.usersService.hardDelete(id);
    return new SuccessResponseDto(null, 'User permanently deleted');
  }

  // ── GDPR API ────────────────────────────────────────────

  @Get('me/export')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 86400000 } }) // once per day per user
  @ApiOperation({ summary: 'Export all personal data (GDPR)' })
  @ApiResponse({
    status: 200,
    description: 'Personal data exported',
    type: SuccessResponseDto<GdprExportDto>,
  })
  async exportData(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<GdprExportDto>> {
    const data = await this.usersGdprService.exportUserData(user.id);
    return new SuccessResponseDto(data, 'Personal data exported');
  }

  @Delete('me/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete own account (GDPR)' })
  @ApiResponse({ status: 204, description: 'Account permanently deleted' })
  @ApiResponse({ status: 400, description: 'INVALID_PASSWORD' })
  async hardDeleteOwnAccount(
    @CurrentUser() user: RequestUser,
    @Body() dto: HardDeleteAccountDto,
  ): Promise<void> {
    // Verify password before allowing hard delete
    await this.usersService.verifyPassword(user.id, dto.password);
    await this.usersService.hardDelete(user.id);
  }
}
