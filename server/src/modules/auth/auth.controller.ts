// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  SendOtpDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { Public } from '@common/decorators/public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── REGISTER ────────────────────────────────────────
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('otp/register')
  @HttpCode(HttpStatus.OK)
  async sendRegisterOtp(@Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(dto, 'REGISTER');
  }

  @Post('verify-register-otp')
  @HttpCode(HttpStatus.OK)
  async verifyRegisterOtp(@Body() dto: VerifyOtpDto) {
    return await this.authService.verifyRegisterOtp(dto);
  }

  // ── LOGIN ───────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('otp/login')
  @HttpCode(HttpStatus.OK)
  async sendLoginOtp(@Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(dto, 'LOGIN');
  }

  @Post('verify-login-otp')
  @HttpCode(HttpStatus.OK)
  async verifyLoginOtp(@Body() dto: VerifyOtpDto) {
    return await this.authService.verifyLoginOtp(dto);
  }

  // ── FORGOT PASSWORD ─────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Post('otp/forgot-password')
  @HttpCode(HttpStatus.OK)
  async sendForgotOtp(@Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(dto, 'FORGOT_PASSWORD');
  }

  @Post('verify-forgot-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotOtp(@Body() dto: VerifyOtpDto) {
    return await this.authService.verifyForgotOtp(dto);
  }
}
