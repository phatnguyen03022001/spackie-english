// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken'; // 👈 import để lấy type SignOptions
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { DeviceService } from '@modules/auth/device.service';
import { EmailQuotaService } from '@modules/auth/email-quota.service';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { AuthListener } from '@modules/auth/auth.listener';
import { UsersModule } from '@modules/users/users.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import { LoggerModule } from '@common/logger/logger.module';

import { OtpRepository } from '@modules/auth/repositories/otp.repository';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('auth.jwtSecret');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }
        const expiresIn =
          configService.get<string>('auth.jwtExpiresIn') ?? '15m';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as jwt.SignOptions['expiresIn'], // 👈 ép kiểu an toàn
          },
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    RedisModule,
    MailModule,
    LoggerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DeviceService,
    EmailQuotaService,
    OtpRepository,
    AdminDeviceRepository,
    JwtStrategy,
    AuthListener,
  ],
  exports: [AuthService],
})
export class AuthModule {}
