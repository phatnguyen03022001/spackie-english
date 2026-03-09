// src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  SendOtpDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { Public } from '@common/decorators/public.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';

@Public()
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── REGISTER ────────────────────────────────────────
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return ApiResponseDto.success(result, 'Đăng ký tài khoản thành công');
  }

  @Post('otp/register')
  async sendRegisterOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto, 'REGISTER');
    return ApiResponseDto.success(null, 'Mã OTP đăng ký đã được gửi');
  }

  @Post('verify-register-otp')
  async verifyRegisterOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyRegisterOtp(dto);
    return ApiResponse.success(result, 'Xác thực OTP đăng ký thành công');
  }

  // ── LOGIN ───────────────────────────────────────────
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return ApiResponse.success(result, 'Đăng nhập thành công');
  }

  @Post('otp/login')
  async sendLoginOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto, 'LOGIN');
    return ApiResponse.success(null, 'Mã OTP đăng nhập đã được gửi');
  }

  @Post('verify-login-otp')
  async verifyLoginOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyLoginOtp(dto);
    return ApiResponse.success(result, 'Xác thực OTP đăng nhập thành công');
  }

  // ── FORGOT PASSWORD ─────────────────────────────────
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto);
    return ApiResponse.success(
      result,
      'Yêu cầu đặt lại mật khẩu đã được ghi nhận',
    );
  }

  @Post('otp/forgot-password')
  async sendForgotOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto, 'FORGOT_PASSWORD');
    return ApiResponse.success(null, 'Mã OTP quên mật khẩu đã được gửi');
  }

  @Post('verify-forgot-otp')
  async verifyForgotOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyForgotOtp(dto);
    return ApiResponse.success(result, 'Xác thực OTP quên mật khẩu thành công');
  }
}
