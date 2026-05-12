// src/modules/pusher-auth/pusher-auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PusherAuthService } from '@modules/pusher-auth/pusher-auth.service';
import {
  PusherAuthDto,
  PusherAuthResponseDto,
} from '@modules/pusher-auth/dto/pusher-auth.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';

@ApiTags('Pusher Auth')
@ApiBearerAuth()
@Controller('pusher/auth')
@UseGuards(JwtAuthGuard)
export class PusherAuthController {
  constructor(private readonly pusherAuthService: PusherAuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a Pusher private channel' })
  @ApiResponse({
    status: 200,
    description: 'Channel authenticated',
    type: SuccessResponseDto<PusherAuthResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'Access denied to channel' })
  async authenticate(
    @CurrentUser() user: RequestUser,
    @Body() dto: PusherAuthDto,
  ): Promise<SuccessResponseDto<PusherAuthResponseDto>> {
    const result = await this.pusherAuthService.authenticate(user, dto);
    return new SuccessResponseDto(result, 'Channel authenticated');
  }
}
