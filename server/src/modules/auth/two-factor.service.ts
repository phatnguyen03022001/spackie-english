// src/modules/auth/two-factor.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@database/prisma.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { Enable2faResponseDto } from '@modules/auth/dto/enable-2fa.dto';
import { toDataURL } from 'qrcode';

@Injectable()
export class TwoFactorService {
  private readonly PENDING_2FA_PREFIX = '2fa:pending:';
  private readonly PENDING_TTL = 300; // 5 minutes
  private readonly RECOVERY_CODES_COUNT = 10;
  private readonly RECOVERY_CODE_LENGTH = 16;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TwoFactorService.name);
  }

  async enable(userId: string): Promise<Enable2faResponseDto> {
    // Check if 2FA is already enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (user.twoFactorEnabled) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        ERROR_CODES.TWO_FACTOR_ALREADY_ENABLED,
        'Two-factor authentication is already enabled',
      );
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Spackie English:${user.email}`,
      length: 20,
    });

    // Store pending secret in Redis for verification
    const pendingKey = `${this.PENDING_2FA_PREFIX}${userId}`;
    await this.cacheManager.set(
      pendingKey,
      {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
      },
      this.PENDING_TTL,
    );

    // Generate QR code data URL
    const qrCodeDataUrl = await toDataURL(secret.otpauth_url!);

    // Generate recovery codes
    const recoveryCodes: string[] = [];
    for (let i = 0; i < this.RECOVERY_CODES_COUNT; i++) {
      const code = crypto
        .randomBytes(this.RECOVERY_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase();
      recoveryCodes.push(
        `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`,
      );
    }

    // Store recovery codes hashed in Redis pending verification
    const recoveryPendingKey = `${pendingKey}:recovery`;
    const hashedCodes = await Promise.all(
      recoveryCodes.map((code) => bcrypt.hash(code, 10)),
    );
    await this.cacheManager.set(
      recoveryPendingKey,
      hashedCodes,
      this.PENDING_TTL,
    );

    return {
      secret: secret.base32,
      otpauthUrl: qrCodeDataUrl,
      recoveryCodes,
    };
  }

  async verifyAndEnable(userId: string, otp: string): Promise<void> {
    const pendingKey = `${this.PENDING_2FA_PREFIX}${userId}`;
    const pending = await this.cacheManager.get<{
      secret: string;
      otpauthUrl: string;
    }>(pendingKey);

    if (!pending) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.TWO_FACTOR_NOT_ENABLED,
        'No pending 2FA setup. Please start the enable process first.',
      );
    }

    // Verify OTP
    const verified = speakeasy.totp.verify({
      secret: pending.secret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (!verified) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.TWO_FACTOR_INVALID_OTP,
        'Invalid OTP code',
      );
    }

    // Encrypt secret before storing
    const encryptionKey = this.configService.get<string>(
      'TWO_FACTOR_SECRET_ENCRYPTION_KEY',
    );
    let encryptedSecret: string;
    if (encryptionKey) {
      encryptedSecret = this.encryptSecret(pending.secret, encryptionKey);
    } else {
      encryptedSecret = pending.secret;
    }

    // Get recovery codes
    const recoveryPendingKey = `${pendingKey}:recovery`;
    const hashedCodes =
      await this.cacheManager.get<string[]>(recoveryPendingKey);

    // Save to database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: true,
        recoveryCodes: hashedCodes || [],
      },
    });

    // Clean up pending
    await this.cacheManager.del(pendingKey);
    await this.cacheManager.del(recoveryPendingKey);
  }

  async disable(userId: string, otp: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.TWO_FACTOR_NOT_ENABLED,
        'Two-factor authentication is not enabled',
      );
    }

    // Verify OTP
    const decryptedSecret = this.getDecryptedSecret(user.twoFactorSecret);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (!verified) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.TWO_FACTOR_INVALID_OTP,
        'Invalid OTP code',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        recoveryCodes: [],
      },
    });
  }

  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Try OTP first
    const decryptedSecret = this.getDecryptedSecret(user.twoFactorSecret);
    const otpVerified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (otpVerified) return true;

    // Try recovery code
    const recoveryCodes = user.recoveryCodes as string[];
    for (let i = 0; i < recoveryCodes.length; i++) {
      const match = await bcrypt.compare(otp, recoveryCodes[i]);
      if (match) {
        // Remove used recovery code
        const updatedCodes = [...recoveryCodes];
        updatedCodes.splice(i, 1);
        await this.prisma.user.update({
          where: { id: userId },
          data: { recoveryCodes: updatedCodes },
        });
        return true;
      }
    }

    return false;
  }

  async getRecoveryCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.TWO_FACTOR_NOT_ENABLED,
        'Two-factor authentication is not enabled',
      );
    }

    // Generate new recovery codes
    const recoveryCodes: string[] = [];
    const hashedCodes: string[] = [];
    for (let i = 0; i < this.RECOVERY_CODES_COUNT; i++) {
      const code = crypto
        .randomBytes(this.RECOVERY_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
      recoveryCodes.push(formatted);
      hashedCodes.push(await bcrypt.hash(formatted, 10));
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { recoveryCodes: hashedCodes },
    });

    return recoveryCodes;
  }

  private encryptSecret(secret: string, encryptionKey: string): string {
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private getDecryptedSecret(encryptedSecret: string): string {
    const encryptionKey = this.configService.get<string>(
      'TWO_FACTOR_SECRET_ENCRYPTION_KEY',
    );
    if (!encryptionKey) {
      // If no encryption key, assume it's plain base32
      return encryptedSecret;
    }

    try {
      const parts = encryptedSecret.split(':');
      if (parts.length !== 3) return encryptedSecret; // Not encrypted

      const [ivHex, authTagHex, encrypted] = parts;
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedSecret;
    }
  }
}
