// src/modules/auth/auth-2fa.controller.ts
import {
  Controller,
  Post,
  Body,
  Delete,
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
import { TwoFactorService } from '@modules/auth/two-factor.service';
import {
  Enable2faResponseDto,
  Verify2faDto,
  Disable2faDto,
} from '@modules/auth/dto/enable-2fa.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class Auth2faController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA - returns secret and QR code' })
  @ApiResponse({
    status: 200,
    description: '2FA setup started',
    type: SuccessResponseDto<Enable2faResponseDto>,
  })
  @ApiResponse({ status: 409, description: 'TWO_FACTOR_ALREADY_ENABLED' })
  async enable(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<Enable2faResponseDto>> {
    const result = await this.twoFactorService.enable(user.id);
    return new SuccessResponseDto(result, '2FA setup started');
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP to complete 2FA activation' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'TWO_FACTOR_INVALID_OTP' })
  async verify(
    @CurrentUser() user: RequestUser,
    @Body() dto: Verify2faDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.twoFactorService.verifyAndEnable(user.id, dto.otp);
    return new SuccessResponseDto(null, '2FA enabled successfully');
  }

  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires OTP)' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  @ApiResponse({ status: 400, description: 'TWO_FACTOR_INVALID_OTP' })
  async disable(
    @CurrentUser() user: RequestUser,
    @Body() dto: Disable2faDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.twoFactorService.disable(user.id, dto.otp);
    return new SuccessResponseDto(null, '2FA disabled');
  }

  @Post('recovery')
  @ApiOperation({ summary: 'Get new recovery codes' })
  @ApiResponse({
    status: 200,
    description: 'Recovery codes generated',
    type: SuccessResponseDto<String>,
  })
  async recovery(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<string[]>> {
    const codes = await this.twoFactorService.getRecoveryCodes(user.id);
    return new SuccessResponseDto(codes, 'Recovery codes generated');
  }
}
