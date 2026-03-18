// src/modules/mail/mail.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private brevo: BrevoClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('mail.apiKey');

    if (!apiKey) {
      this.logger.error('BREVO_API_KEY is missing in config');
      throw new Error('Brevo API key is required for production');
    }

    this.brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: 30,
      maxRetries: 3,
    });

    this.logger.log('Brevo API (Spackie English) initialized successfully');
  }

  /**
   * Format action slugs into readable English phrases
   */
  private formatActionType(type: string): string {
    const types: Record<string, string> = {
      REGISTER: 'account registration',
      LOGIN: 'system login',
      FORGOT_PASSWORD: 'password reset',
    };
    return types[type] || type.toLowerCase().replace('_', ' ');
  }

  async sendOtp(email: string, code: string, type: string): Promise<void> {
    const mailConfig = this.configService.get('mail');
    const actionText = this.formatActionType(type);

    const payload = {
      sender: {
        name: mailConfig.fromName,
        email: mailConfig.from,
      },
      to: [{ email }],
      subject: `[Spackie English] Verification Code for ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      htmlContent: this.getOtpTemplate(code, actionText),
      textContent: `Spackie English - Your OTP: ${code}. This code is used for ${actionText}. Valid for 5 minutes.`,
      tags: ['otp', type.toLowerCase()],
      replyTo: {
        email: 'support@spackie.dev',
        name: 'Spackie English Support',
      },
    };

    try {
      const response =
        await this.brevo.transactionalEmails.sendTransacEmail(payload);
      const msgId = response.messageId || response.messageIds?.[0] || 'unknown';
      this.logger.log(`OTP sent successfully → ${email} | ID: ${msgId}`);
    } catch (err: any) {
      this.logger.error(`Failed to send OTP → ${email}`, err?.stack);
      throw new InternalServerErrorException(
        'Could not send verification email, please try again later',
      );
    }
  }

  private getOtpTemplate(code: string, action: string): string {
    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0a09; padding: 60px 20px; line-height: 1.6;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #1c1917; border-radius: 16px; border: 1px solid #292524; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <div style="padding: 40px 24px 20px; text-align: center; border-bottom: 1px solid #292524;">
            <div style="font-size: 24px; font-weight: 800; color: #fafaf9; letter-spacing: -0.5px; text-transform: uppercase;">
              Spackie <span style="color: #f97316;">English</span>
            </div>
          </div>

          <div style="padding: 40px; text-align: center;">
            <h2 style="color: #fafaf9; font-size: 20px; font-weight: 600; margin-bottom: 12px; letter-spacing: 0.5px;">
              Verify Your Identity
            </h2>

            <div style="background-color: rgba(249, 115, 22, 0.05); border: 1px solid #f97316; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #f97316; margin-left: 12px;">
                ${code}
              </span>
            </div>
            
            <p style="color: #a8a29e; font-size: 15px; margin-bottom: 32px;">
              To proceed with your <strong>${action}</strong>, please use the secure verification code below. This code will expire in 5 minutes.
            </p>

            

            <p style="color: #78716c; font-size: 13px;">
              For your security, never share this code with anyone. Spackie English staff will never ask for your verification code.
            </p>
          </div>

          <div style="padding: 30px 24px; background-color: #171717; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; text-align: center; border-top: 1px solid #292524;">
            <p style="margin: 0; color: #57534e; font-size: 12px; font-weight: 500;">
              &copy; ${new Date().getFullYear()} SPACKIE ENGLISH PLATFORM
            </p>
            <div style="margin-top: 12px;">
               <span style="color: #44403c;">•</span>
               <a href="#" style="color: #78716c; text-decoration: none; margin: 0 10px; font-size: 11px;">Privacy Policy</a>
               <span style="color: #44403c;">•</span>
               <a href="#" style="color: #78716c; text-decoration: none; margin: 0 10px; font-size: 11px;">Help Center</a>
            </div>
          </div>
        </div>
        
        <div style="max-width: 480px; margin: 24px auto 0; text-align: center;">
          <p style="color: #57534e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
            This is an automated security notification
          </p>
        </div>
      </div>
    `;
  }
}
