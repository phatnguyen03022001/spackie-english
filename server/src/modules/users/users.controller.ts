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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateAvatarUseCase } from './use-cases/update-avatar.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CacheTTL } from '../../common/decorators/cache-ttl.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import { CACHE_TTL } from '../../common/utils/cache.util';
import { AppException } from '../../common/filters/app-exception';
import { ERROR_CODES } from '../../common/constants/error-codes.const';

@ApiTags('Users')
@ApiBearerAuth() // Thêm bearer auth cho Swagger
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
  ) {}

  @Public()
  @Post()
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
  async findAll(
    @Query() query: UserListQueryDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const { data, total } = await this.usersService.findAll(query);
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Get('me')
  async getProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const profile = await this.usersService.findById(user.id);
    return new SuccessResponseDto(profile);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'Access denied',
      );
    }
    const user = await this.usersService.findById(id);
    return new SuccessResponseDto(user);
  }

  @Patch('me')
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
  async updateAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpeg|png|webp)/ })
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
  async deleteOwnAccount(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<null>> {
    await this.usersService.softDelete(user.id, user);
    return new SuccessResponseDto(null, 'Account soft-deleted');
  }

  @Post(':id/ban')
  @Roles('ADMIN')
  async banUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.ban(id);
    return new SuccessResponseDto(user, 'User banned');
  }

  @Post(':id/unban')
  @Roles('ADMIN')
  async unbanUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.usersService.unban(id);
    return new SuccessResponseDto(user, 'User unbanned');
  }

  @Delete(':id/hard')
  @Roles('ADMIN')
  async hardDeleteUser(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.usersService.hardDelete(id);
    return new SuccessResponseDto(null, 'User permanently deleted');
  }
}
