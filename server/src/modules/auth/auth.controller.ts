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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
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
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: SuccessResponseDto<UserResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or EMAIL_ALREADY_EXISTS',
  })
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
  @ApiResponse({ status: 204, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'INVALID_OTP or OTP_EXPIRED' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Resend verification OTP' })
  @ApiResponse({ status: 202, description: 'Verification OTP sent' })
  @ApiResponse({ status: 429, description: 'TOO_MANY_REQUESTS' })
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
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns tokens and user',
    type: SuccessResponseDto<AuthLoginResponse>,
  })
  @ApiResponse({
    status: 401,
    description: 'INVALID_CREDENTIALS or DEVICE_NOT_AUTHORIZED',
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
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'INVALID_REFRESH_TOKEN' })
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
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
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
    const fullProfile: UserResponseDto = await this.authService.getMe(user.id);
    return new SuccessResponseDto(fullProfile, 'Profile fetched');
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Change password (requires old password)' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({
    status: 400,
    description: 'INVALID_OLD_PASSWORD or VALIDATION_FAILED',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({
    status: 202,
    description: 'If email exists, OTP has been sent',
  })
  @ApiResponse({ status: 429, description: 'TOO_MANY_REQUESTS' })
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
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'INVALID_OTP or OTP_EXPIRED' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @Get('admin/devices')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of authorized devices for admin' })
  @ApiResponse({
    status: 200,
    description: 'List of devices',
    type: SuccessResponseDto<DeviceResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
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
  @ApiResponse({
    status: 201,
    description: 'Device added',
    type: SuccessResponseDto<DeviceResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
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
  @ApiParam({ name: 'deviceId', description: 'Device ID to remove' })
  @ApiResponse({ status: 204, description: 'Device removed' })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'DEVICE_NOT_FOUND' })
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
  @ApiResponse({ status: 202, description: 'OTP sent to your email' })
  @ApiResponse({ status: 429, description: 'TOO_MANY_REQUESTS' })
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
  @ApiResponse({ status: 200, description: 'Device verified and logged in' })
  @ApiResponse({ status: 400, description: 'INVALID_OTP or OTP_EXPIRED' })
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
  @ApiResponse({ status: 204, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.logoutAll(user.id);
  }
}
