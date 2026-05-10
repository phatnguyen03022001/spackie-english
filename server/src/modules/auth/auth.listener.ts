// src/modules/auth/auth.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthService } from '@modules/auth/auth.service';
import { USER_EVENTS } from '@common/constants/events.constants';
import { LoggerService } from '@common/logger/logger.service';

@Injectable()
export class AuthListener {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthListener.name);
  }

  @OnEvent(USER_EVENTS.CREATED, { async: true })
  async handleUserCreated(payload: {
    userId: string;
    email: string;
    displayName?: string;
  }) {
    this.logger.log(`Handling USER_EVENTS.CREATED for ${payload.email}`);

    try {
      // 1. Send Verification OTP
      await this.authService.sendVerificationOtp(payload.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send verification OTP in listener: ${errorMessage}`,
      );
    }

    try {
      // 2. Send Welcome Email
      await this.authService.sendWelcomeEmail(
        payload.email,
        payload.displayName,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send welcome email in listener: ${errorMessage}`,
      );
    }
  }
}
