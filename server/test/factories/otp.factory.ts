// test/factories/otp.factory.ts
import { Otp } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

type PartialOtp = Partial<Otp>;

export class OtpFactory {
  static async create(overrides: PartialOtp = {}): Promise<Otp> {
    const plainOtp = overrides.otpHash ? undefined : '123456';
    const otpHash = overrides.otpHash || (await bcrypt.hash(plainOtp!, 10));
    const now = new Date();
    return {
      id: randomUUID(),
      email: overrides.email || 'test@example.com',
      otpHash,
      type: overrides.type || 'VERIFY_EMAIL',
      expiresAt:
        overrides.expiresAt || new Date(now.getTime() + 15 * 60 * 1000),
      createdAt: now,
      // Không có updatedAt trong model Otp
      ...overrides,
    } as Otp;
  }

  static expired(overrides: PartialOtp = {}): Promise<Otp> {
    return OtpFactory.create({
      expiresAt: new Date(Date.now() - 1000),
      ...overrides,
    });
  }

  static forPasswordReset(overrides: PartialOtp = {}): Promise<Otp> {
    return OtpFactory.create({ type: 'FORGOT_PASSWORD', ...overrides });
  }
}
