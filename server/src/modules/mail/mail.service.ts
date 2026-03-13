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
    // Truy xuất thông qua cấu trúc object đã định nghĩa trong mail.config.ts
    const apiKey = this.configService.get<string>('mail.apiKey');

    if (!apiKey) {
      this.logger.error('BREVO_API_KEY không tồn tại trong config');
      throw new Error('Brevo API key is required for production');
    }

    this.brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: 30,
      maxRetries: 3,
    });

    this.logger.log('Brevo API (Elite Drive) đã khởi tạo thành công');
  }

  /**
   * Chuyển đổi slug type thành tiếng Việt có dấu để hiển thị trong mail
   */
  private formatActionType(type: string): string {
    const types: Record<string, string> = {
      REGISTER: 'đăng ký tài khoản',
      LOGIN: 'đăng nhập hệ thống',
      FORGOT_PASSWORD: 'đặt lại mật khẩu',
    };
    return types[type] || type.toLowerCase();
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
      subject: `[Elite Drive] Mã xác thực OTP ${actionText}`,
      htmlContent: this.getOtpTemplate(code, actionText),
      textContent: `Elite Drive - Mã OTP: ${code}. Mã này dùng để ${actionText}. Hiệu lực 5 phút.`,
      tags: ['otp', type.toLowerCase()],
      replyTo: { email: 'support@elite.dev', name: 'Elite Drive Support' },
    };

    try {
      const response =
        await this.brevo.transactionalEmails.sendTransacEmail(payload);
      const msgId = response.messageId || response.messageIds?.[0] || 'unknown';
      this.logger.log(`Gửi OTP thành công → ${email} | ID: ${msgId}`);
    } catch (err: any) {
      this.logger.error(`Gửi OTP thất bại → ${email}`, err?.stack);
      throw new InternalServerErrorException(
        'Không thể gửi email xác thực, vui lòng thử lại sau',
      );
    }
  }

  private getOtpTemplate(code: string, action: string): string {
    return `
      <div style="font-family: sans-serif; background:#f8fafc; padding:32px 16px;">
        <div style="max-width:560px; margin:auto; background:#ffffff; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">
          <div style="background: #3b82f6; padding:24px; text-align:center;">
            <h1 style="margin:0; color:white; font-size:24px;">Elite Drive</h1>
          </div>
          <div style="padding:40px 24px; text-align:center;">
            <p style="color:#475569; font-size:16px;">Mã OTP để <strong>${action}</strong> của bạn là:</p>
            <div style="font-size:36px; font-weight:bold; letter-spacing:8px; padding:20px; background:#f1f5f9; border-radius:8px; color:#1e293b; display:inline-block; margin:20px 0;">
              ${code}
            </div>
            <p style="color:#64748b; font-size:14px;">Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        </div>
      </div>
    `;
  }
}
