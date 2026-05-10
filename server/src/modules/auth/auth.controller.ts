// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '@modules/auth/auth.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { ChangePasswordDto } from '@modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/auth/dto/reset-password.dto';
import { AddDeviceDto } from '@modules/auth/dto/add-device.dto';
import { VerifyEmailDto } from '@modules/auth/dto/verify-email.dto';
import { ResendVerificationDto } from '@modules/auth/dto/resend-verification.dto';
import { DeviceResponseDto } from '@modules/auth/dto/device-response.dto';
import { RequestDeviceOtpDto } from '@modules/auth/dto/request-device-otp.dto';
import { VerifyDeviceOtpDto } from '@modules/auth/dto/verify-device-otp.dto';

import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { AuthLoginResponse } from '@modules/auth/interfaces/auth-response.interface';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';

import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const user = await this.authService.register(dto);
    return new SuccessResponseDto(user, 'Registration successful');
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify email using OTP' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Resend verification OTP' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.authService.resendVerification(dto);
    return new SuccessResponseDto(null, 'Verification OTP sent');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Login with email/password (admin requires deviceId)',
  })
  async login(
    @Body() dto: LoginDto,
  ): Promise<SuccessResponseDto<AuthLoginResponse>> {
    const result = await this.authService.login(dto);
    return new SuccessResponseDto(result, 'Login successful');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<
    SuccessResponseDto<{ accessToken: string; refreshToken: string }>
  > {
    const tokens = await this.authService.refresh(dto.refreshToken);
    return new SuccessResponseDto(tokens, 'Token refreshed');
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<UserResponseDto>> {
    const fullProfile: UserResponseDto = await this.authService.getMe(user.id);
    return new SuccessResponseDto(fullProfile, 'Profile fetched');
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Change password (requires old password)' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Request OTP to reset password' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.authService.forgotPassword(dto);
    return new SuccessResponseDto(null, 'If email exists, OTP has been sent');
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Reset password using OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @Get('admin/devices')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of authorized devices for admin' })
  async getDevices(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<DeviceResponseDto[]>> {
    const devices = await this.authService.getAdminDevices(user.id);
    return new SuccessResponseDto(devices);
  }

  @Post('admin/devices')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new authorized device' })
  async addDevice(
    @CurrentUser() user: RequestUser,
    @Body() dto: AddDeviceDto,
  ): Promise<SuccessResponseDto<DeviceResponseDto>> {
    const device = await this.authService.addAdminDevice(user.id, dto);
    return new SuccessResponseDto(device, 'Device added');
  }

  @Delete('admin/devices/:deviceId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an authorized device' })
  async removeDevice(
    @CurrentUser() user: RequestUser,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    await this.authService.removeAdminDevice(user.id, deviceId);
  }

  @Public()
  @Post('admin/request-device-otp')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Request OTP to authorize a new device for admin' })
  async requestDeviceOtp(
    @Body() dto: RequestDeviceOtpDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.authService.sendDeviceOtp(
      dto.email,
      dto.deviceId,
      dto.deviceName,
    );
    return new SuccessResponseDto(null, 'OTP sent to your email');
  }

  @Public()
  @Post('admin/verify-device')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP and login with new device' })
  async verifyDevice(
    @Body() dto: VerifyDeviceOtpDto,
  ): Promise<SuccessResponseDto<AuthLoginResponse>> {
    const result = await this.authService.verifyDeviceOtp(
      dto.email,
      dto.deviceId,
      dto.otp,
    );
    return new SuccessResponseDto(result, 'Device verified and logged in');
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.logoutAll(user.id);
  }
}
