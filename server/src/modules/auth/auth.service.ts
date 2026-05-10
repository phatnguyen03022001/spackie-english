// src/modules/auth/auth.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { DeviceService } from '@modules/auth/device.service';
import { EmailQuotaService } from '@modules/auth/email-quota.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { UserMapper } from '@modules/users/mappers/user.mapper';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { ChangePasswordDto } from '@modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/auth/dto/reset-password.dto';
import { AddDeviceDto } from '@modules/auth/dto/add-device.dto';
import { DeviceResponseDto } from '@modules/auth/dto/device-response.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  AuthLoginResponse,
  AuthTokensResponse,
} from '@modules/auth/interfaces/auth-response.interface';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { Role } from '@prisma/client';
import { ResendVerificationDto } from '@modules/auth/dto/resend-verification.dto';
import { VerifyEmailDto } from '@modules/auth/dto/verify-email.dto';
import { UsersRepository } from '@modules/users/users.repository';
import { OtpRepository } from '@modules/auth/repositories/otp.repository';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';

interface RefreshTokenPayload {
  sub: string;
  deviceId: string;
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 3600;
  private readonly DEVICE_OTP_TTL = 10 * 60; // 10 minutes in seconds
  private readonly PENDING_DEVICE_PREFIX = 'pending_admin:';

  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly otpRepository: OtpRepository,
    private readonly adminDeviceRepository: AdminDeviceRepository,
    private readonly userMapper: UserMapper,
    private readonly deviceService: DeviceService,
    private readonly emailQuotaService: EmailQuotaService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.email.split('@')[0],
      password: dto.password,
      displayName: dto.name,
    });

    return user;
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const otpRecord = await this.otpRepository.findFirst(
      {
        email: dto.email,
        type: 'VERIFY_EMAIL',
        expiresAt: { gt: new Date() },
      },
      { createdAt: 'desc' },
    );
    if (!otpRecord) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'OTP_INVALID',
        'Invalid or expired OTP',
      );
    }
    const match = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!match) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'OTP_INVALID',
        'Invalid OTP',
      );
    }
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }
    await this.usersRepository.update(user.id, { isVerified: true });
    this.eventEmitter.emit('user.email_verified', {
      userId: user.id,
      email: user.email,
    });
    await this.otpRepository.delete(otpRecord.id);
  }

  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      this.logger.log(
        `[ResendOTP] Email not found: "${email}". Returning 202 silently.`,
      );
      return;
    }

    if (user.isVerified) {
      this.logger.log(
        `[ResendOTP] Email "${email}" already verified. Returning 202.`,
      );
      return;
    }

    this.logger.log(
      `[ResendOTP] User found: ${user.id}. Sending OTP to ${email}`,
    );

    // Rate limit: 3 lần/giờ
    const rateKey = `verify:resend:${dto.email}`;
    const rateCount = await this.cacheManager.get<number>(rateKey);
    if (rateCount && rateCount >= 3) {
      throw new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests',
      );
    }
    await this.cacheManager.set(rateKey, (rateCount || 0) + 1, 3600);

    // Gọi hàm đã sửa – sẽ throw lỗi nếu không gửi được
    await this.sendVerificationOtp(dto.email);
  }

  async login(dto: LoginDto): Promise<AuthLoginResponse> {
    const email = dto.email.trim().toLowerCase();
    // Point 1 & 12: Use repository
    const user = await this.usersRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }
    if (!user.isVerified) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'USER_NOT_VERIFIED',
        'Please verify your email first',
      );
    }
    if (user.isBanned) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'USER_ACCOUNT_BANNED',
        'Your account has been banned',
      );
    }
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    const isAdmin = user.role === Role.ADMIN;
    let deviceId = dto.deviceId;
    if (isAdmin) {
      if (!deviceId) {
        throw new BusinessException(
          HttpStatus.BAD_REQUEST,
          'DEVICE_ID_REQUIRED',
          'Admin login requires deviceId',
        );
      }
      const valid = await this.deviceService.validateDevice(user.id, deviceId);
      if (!valid) {
        // Return special error with requiresOtp flag
        throw new BusinessException(
          HttpStatus.FORBIDDEN,
          'DEVICE_NOT_AUTHORIZED',
          'This device is not authorized. Please verify OTP first.',
          { requiresOtp: true, deviceId, email: user.email },
        );
      }
    } else {
      // Point 7: Ignore deviceId from client for regular users
      deviceId = randomUUID();
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role as string,
      deviceId,
    );
    const userResponse = this.userMapper.toResponseDto(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        },
      );
      const { sub: userId, deviceId } = payload;
      const key = `auth:refresh:${userId}:${deviceId}`;
      const storedHash = await this.cacheManager.get<string>(key);

      if (!storedHash) {
        throw new Error(`Refresh token not found in Redis for key: ${key}`);
      }

      const currentHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      if (storedHash !== currentHash) {
        // Nếu hash không khớp, có thể là tấn công reuse token
        await this.revokeAllUserSessions(userId);
        throw new BusinessException(
          HttpStatus.UNAUTHORIZED,
          ERROR_CODES.AUTH_REFRESH_TOKEN_REUSED,
          'Refresh token reuse detected or invalid',
        );
      }
      await this.cacheManager.del(`auth:refresh:${userId}:${deviceId}`);

      // Point 10: Use repository
      const user = await this.usersRepository.findById(userId);

      if (!user || user.deletedAt || user.isBanned) {
        throw new Error(
          !user
            ? 'User not found in DB'
            : user.isBanned
              ? 'User is banned'
              : 'User is deleted',
        );
      }
      return this.generateTokens(userId, user.email, user.role, deviceId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[RefreshError] ${errorMessage}`);

      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.AUTH_INVALID_TOKEN,
        errorMessage.includes('expired')
          ? 'Refresh token expired'
          : 'Invalid refresh token',
      );
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        },
      );
      await this.cacheManager.del(
        `auth:refresh:${payload.sub}:${payload.deviceId}`,
      );
    } catch {
      // ignore invalid token
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllUserSessions(userId);
    this.logger.log(`User ${userId} logged out from all devices`);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'USER_NO_PASSWORD',
        'Cannot change password for OAuth account',
      );
    }
    const match = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!match) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid old password',
      );
    }
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.update(userId, { passwordHash: newHash });
    await this.revokeAllUserSessions(userId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      this.logger.debug(`Forgot password for non-existent email: ${dto.email}`);
      return;
    }
    const rateKey = `otp:rate:${dto.email}`;
    const rateCount = await this.cacheManager.get<number>(rateKey);
    if (rateCount && rateCount >= 3) {
      throw new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests',
      );
    }
    await this.cacheManager.set(rateKey, (rateCount || 0) + 1, 3600);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Point 5: Send email first
    const canSend = await this.emailQuotaService.canSend('otp');
    if (!canSend) {
      this.logger.error(
        `Email quota exceeded, cannot send OTP to ${dto.email}`,
      );
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'EMAIL_QUOTA_EXCEEDED',
        'Email service temporarily unavailable',
      );
    }

    await this.mailService.send(
      dto.email,
      'Password Reset OTP',
      `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
      `Your OTP is ${otp}`,
    );
    await this.emailQuotaService.increment();

    // Only save OTP after successful email delivery
    await this.otpRepository.deleteMany({
      email: dto.email,
      type: 'FORGOT_PASSWORD',
    });
    await this.otpRepository.create({
      email: dto.email,
      otpHash,
      type: 'FORGOT_PASSWORD',
      expiresAt,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const otpRecord = await this.otpRepository.findFirst(
      {
        email: dto.email,
        type: 'FORGOT_PASSWORD',
        expiresAt: { gt: new Date() },
      },
      { createdAt: 'desc' },
    );
    if (!otpRecord) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'OTP_INVALID',
        'Invalid or expired OTP',
      );
    }
    const match = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!match) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'OTP_INVALID',
        'Invalid OTP',
      );
    }
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.update(user.id, { passwordHash: newHash });
    this.eventEmitter.emit('user.password_reset', {
      userId: user.id,
      email: user.email,
    });
    await this.otpRepository.delete(otpRecord.id);
    await this.revokeAllUserSessions(user.id);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    return this.usersService.findById(userId);
  }

  async getAdminDevices(userId: string): Promise<DeviceResponseDto[]> {
    return this.deviceService.findAllByUser(userId);
  }

  async addAdminDevice(
    userId: string,
    dto: AddDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.deviceService.addDevice(userId, dto);
  }

  async removeAdminDevice(userId: string, deviceId: string): Promise<void> {
    // Point 11: Revoke session for this device
    await this.cacheManager.del(`auth:refresh:${userId}:${deviceId}`);
    await this.deviceService.removeDevice(userId, deviceId);
  }

  /**
   * Internal method used by AuthListener or resend verification
   */
  async sendVerificationOtp(email: string): Promise<void> {
    this.logger.log(`[OTP] Generating verification OTP for ${email}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const canSend = await this.emailQuotaService.canSend('otp');
    if (!canSend) {
      this.logger.error(
        `Email quota exceeded, cannot send verification OTP to ${email}`,
      );
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'EMAIL_QUOTA_EXCEEDED',
        'Cannot send verification email at this time. Please try later.',
      );
    }

    try {
      await this.mailService.send(
        email,
        'Verify your email',
        `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`,
        `Your verification code is ${otp}`,
      );
      await this.emailQuotaService.increment();

      // Point 5: Only save OTP after successful email delivery
      await this.otpRepository.deleteMany({ email, type: 'VERIFY_EMAIL' });
      await this.otpRepository.create({
        email,
        otpHash,
        type: 'VERIFY_EMAIL',
        expiresAt,
      });

      this.logger.log(`OTP sent successfully to ${email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Mail error: ${errorMessage}`);
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'EMAIL_SEND_FAILED',
        'Failed to send verification email. Please try again.',
      );
    }
  }

  /**
   * Send OTP to admin email for authorizing a new device
   */
  async sendDeviceOtp(
    email: string,
    deviceId: string,
    deviceName?: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || user.role !== Role.ADMIN) {
      // Silent fail – do not reveal existence
      this.logger.debug(
        `sendDeviceOtp called for non-admin or non-existent email: ${email}`,
      );
      return;
    }

    // Rate limit per (email + deviceId) – 3 OTPs per hour
    const rateKey = `device_otp:rate:${email}:${deviceId}`;
    const rateCount = await this.cacheManager.get<number>(rateKey);
    if (rateCount && rateCount >= 3) {
      throw new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT_EXCEEDED',
        'Too many OTP requests for this device',
      );
    }

    const canSend = await this.emailQuotaService.canSend('otp');
    if (!canSend) {
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'EMAIL_QUOTA_EXCEEDED',
        'Email service temporarily unavailable',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + this.DEVICE_OTP_TTL * 1000);

    const pendingKey = `${this.PENDING_DEVICE_PREFIX}${email}:${deviceId}`;
    await this.cacheManager.set(
      pendingKey,
      {
        otpHash,
        expiresAt: expiresAt.toISOString(),
        deviceName: deviceName || null,
        attempts: 0,
      },
      this.DEVICE_OTP_TTL,
    );

    await this.mailService.send(
      email,
      'Device Verification OTP',
      `<p>Your OTP for authorizing device <strong>${deviceId}</strong> is <b>${otp}</b>. It expires in 10 minutes.</p>`,
      `Your OTP is ${otp}`,
    );

    await this.emailQuotaService.increment();
    await this.cacheManager.set(rateKey, (rateCount || 0) + 1, 3600); // 1 hour TTL

    this.logger.log(`Device OTP sent to ${email} for device ${deviceId}`);
  }

  /**
   * Verify OTP and activate device, then login
   */
  async verifyDeviceOtp(
    email: string,
    deviceId: string,
    otp: string,
  ): Promise<AuthLoginResponse> {
    const pendingKey = `${this.PENDING_DEVICE_PREFIX}${email}:${deviceId}`;
    const pending = await this.cacheManager.get<{
      otpHash: string;
      expiresAt: string;
      deviceName?: string;
      attempts: number;
    }>(pendingKey);

    if (!pending) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'DEVICE_OTP_EXPIRED',
        'OTP expired or not requested',
      );
    }

    if (new Date(pending.expiresAt) < new Date()) {
      await this.cacheManager.del(pendingKey);
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'DEVICE_OTP_EXPIRED',
        'OTP has expired',
      );
    }

    const isValid = await bcrypt.compare(otp, pending.otpHash);
    if (!isValid) {
      const newAttempts = (pending.attempts || 0) + 1;
      if (newAttempts >= 5) {
        await this.cacheManager.del(pendingKey);
        throw new BusinessException(
          HttpStatus.BAD_REQUEST,
          'DEVICE_OTP_BLOCKED',
          'Too many failed attempts. Please request a new OTP.',
        );
      }
      await this.cacheManager.set(
        pendingKey,
        { ...pending, attempts: newAttempts },
        this.DEVICE_OTP_TTL,
      );
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'DEVICE_OTP_INVALID',
        'Invalid OTP',
      );
    }

    const user = await this.usersRepository.findByEmail(email);
    if (!user || user.role !== Role.ADMIN) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_INVALID_CREDENTIALS',
        'Invalid credentials',
      );
    }

    // Add device to AdminDevice table
    await this.deviceService.addDevice(user.id, {
      deviceId,
      deviceName: pending.deviceName,
    });

    // Clean up pending record
    await this.cacheManager.del(pendingKey);

    // Generate tokens and return login response
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      deviceId,
    );
    const userResponse = this.userMapper.toResponseDto(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    deviceId: string,
  ): Promise<AuthTokensResponse> {
    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      role,
      deviceId,
    });
    const refreshToken = this.jwtService.sign(
      { sub: userId, deviceId },
      {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: '7d',
      },
    );
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const key = `auth:refresh:${String(userId)}:${deviceId}`;
    await this.cacheManager.set(key, refreshHash, this.REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken };
  }

  private async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `auth:refresh:${userId}:*`;
    await this.cacheManager.delPattern(pattern);
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    try {
      const canSend = await this.emailQuotaService.canSend('welcome');
      if (!canSend) {
        return;
      }
      await this.mailService.send(
        email,
        'Welcome to Spackie English',
        `<h1>Welcome ${name || 'user'}!</h1><p>Start learning today.</p>`,
        'Welcome to Spackie English',
      );
      await this.emailQuotaService.increment();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send welcome email: ${errorMessage}`);
    }
  }
}
