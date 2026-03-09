// src/mail/mail.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private brevo: BrevoClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      this.logger.error('BREVO_API_KEY không tồn tại trong .env');
      throw new Error('Brevo API key is required for production');
    }

    this.brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: 30, // 30 giây timeout (đơn vị giây, không phải ms)
      maxRetries: 3, // retry tối đa 3 lần cho 5xx hoặc rate limit (có exponential backoff + jitter)
    });

    this.logger.log('Brevo API v4 (production mode) đã khởi tạo thành công');
  }

  async sendOtp(email: string, code: string, type: string): Promise<void> {
    // const fromFull = this.configService.get<string>(
    //   'EMAIL_FROM',
    //   'Elite Drive <noreply@elite.dev>',
    // );
    // const fromEmailMatch = fromFull.match(/<(.+)>/);
    // const fromEmail = fromEmailMatch
    //   ? fromEmailMatch[1].trim()
    //   : fromFull.trim();

    const sender = {
      name: this.configService.get('EMAIL_FROM_NAME'),
      email: this.configService.get('EMAIL_FROM'), // Giả sử giá trị là phatnguyen...
    };

    const payload = {
      sender,
      to: [{ email }],
      subject: `Elite Drive – Mã OTP (${type})`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; padding:32px 16px; margin:0;">
          <div style="max-width:560px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding:32px 24px; text-align:center;">
              <h1 style="margin:0; color:white; font-size:28px;">Elite Drive</h1>
            </div>
            <div style="padding:32px 24px; text-align:center;">
              <h2 style="margin:0 0 24px; color:#1e293b; font-size:24px;">Xác thực OTP</h2>
              <div style="font-size:40px; font-weight:700; letter-spacing:12px; padding:24px; background:#f1f5f9; border-radius:12px; color:#0f172a; margin:0 auto; max-width:280px;">
                ${code}
              </div>
              <p style="margin:24px 0; color:#475569; font-size:16px; line-height:1.6;">
                Mã OTP dùng để <strong>${type}</strong>.<br>
                Mã này có hiệu lực trong <strong>5 phút</strong>.
              </p>
              <p style="color:#64748b; font-size:14px; margin:32px 0 0;">
                Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
              </p>
            </div>
          </div>
        </div>
      `,
      textContent: `Elite Drive - Mã OTP (${type}): ${code}\n\nMã này dùng để ${type}. Hiệu lực 5 phút.\n\nNếu không phải bạn yêu cầu, bỏ qua email này.`, // fallback plain text
      tags: ['otp', type.toLowerCase().replace(/\s+/g, '-')],
      replyTo: { email: 'support@elite.dev', name: 'Hỗ trợ Elite Drive' }, // production nên có
    };

    try {
      const response =
        await this.brevo.transactionalEmails.sendTransacEmail(payload);

      // Brevo v3 trả về { messageId: "<...>" } hoặc { messageIds: [...] }
      const msgId = response.messageId || response.messageIds?.[0] || 'unknown';
      this.logger.log(`Gửi OTP thành công → ${email} | messageId: ${msgId}`);
    } catch (err: any) {
      const errorDetail =
        err?.response?.data?.message ||
        err?.response?.data?.code ||
        err?.message ||
        'Lỗi không xác định';

      this.logger.error(
        `Gửi OTP thất bại → ${email}: ${errorDetail}`,
        err?.stack,
      );

      // Production: có thể throw custom exception hoặc return false tùy logic
      throw new Error(`Gửi OTP lỗi: ${errorDetail}`);
    }
  }
}
