// src/modules/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// import { PrismaService } from '@shared/prisma/';

import {
  RegisterDto,
  SendOtpDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { MailService } from '@/modules/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    // private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async sendOtp(
    dto: SendOtpDto,
    type: 'REGISTER' | 'LOGIN' | 'FORGOT_PASSWORD',
  ) {
    if (type === 'LOGIN' || type === 'FORGOT_PASSWORD') {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) throw new NotFoundException('Email không tồn tại');
    }

    await this.createOtp(dto.email, type);

    const action =
      type === 'REGISTER'
        ? 'đăng ký'
        : type === 'LOGIN'
          ? 'đăng nhập'
          : 'đặt lại mật khẩu';

    return { message: `OTP ${action} đã được gửi` };
  }

  async register(dto: RegisterDto) {
    const existed = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 1. Nếu email đã tồn tại VÀ đã xác thực
    if (existed && existed.isVerified) {
      throw new ConflictException('Email đã tồn tại và đã được xác thực');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const selectedRole = dto.role || 'CUSTOMER';

    let user;

    if (existed && !existed.isVerified) {
      // 2. Nếu email tồn tại nhưng CHƯA xác thực -> Cập nhật lại thông tin mới
      user = await this.prisma.user.update({
        where: { email: dto.email },
        data: {
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: selectedRole,
          // Reset lại OTP nếu cần thiết trong logic sendOtp
        },
      });
    } else {
      // 3. Nếu email chưa tồn tại -> Tạo mới hoàn toàn
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: selectedRole,
          isVerified: false,
        },
      });
    }

    // Luôn gửi OTP mới cho cả 2 trường hợp chưa xác thực
    await this.sendOtp({ email: dto.email }, 'REGISTER');

    return {
      message: `Đăng ký thành công. Vui lòng kiểm tra email để xác nhận OTP`,
      userId: user.id,
    };
  }

  async verifyRegisterOtp(dto: VerifyOtpDto) {
    // 1. Kiểm tra OTP & Tự động update isVerified bên trong verifyOtp
    await this.verifyOtp(dto.email, dto.code, 'REGISTER');

    // 2. Xóa OTP
    await this.prisma.oTP.deleteMany({
      where: { email: dto.email, type: 'REGISTER' },
    });

    return { message: 'Xác thực đăng ký thành công!' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (
      !user ||
      !user.isVerified ||
      !(await bcrypt.compare(dto.password, user.password))
    ) {
      throw new UnauthorizedException(
        !user || !(await bcrypt.compare(dto.password, user.password))
          ? 'Email hoặc mật khẩu không đúng'
          : 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email và xác nhận OTP',
      );
    }

    return this.generateTokens(user);
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    await this.verifyOtp(dto.email, dto.code, 'LOGIN');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Tài khoản không tồn tại');

    await this.prisma.oTP.deleteMany({
      where: { email: dto.email, type: 'LOGIN' },
    });

    return this.generateTokens(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.verifyOtp(dto.email, dto.code, 'FORGOT_PASSWORD');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashedPassword },
    });

    await this.prisma.oTP.deleteMany({
      where: { email: dto.email, type: 'FORGOT_PASSWORD' },
    });

    return { message: 'Mật khẩu đã được cập nhật thành công' };
  }

  async verifyForgotOtp(dto: VerifyOtpDto) {
    await this.verifyOtp(dto.email, dto.code, 'FORGOT_PASSWORD');

    await this.prisma.oTP.deleteMany({
      where: { email: dto.email, type: 'FORGOT_PASSWORD' },
    });

    return {
      message: 'OTP hợp lệ, bạn có thể đặt lại mật khẩu',
      email: dto.email,
    };
  }

  // HELPERS
  private async createOtp(email: string, type: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.oTP.deleteMany({ where: { email, type } });

    const otp = await this.prisma.oTP.create({
      data: {
        email,
        code,
        type,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Gửi mail thật
    await this.mailService.sendOtp(email, code, type);

    // Giữ console để debug nếu cần
    console.log(`[OTP ${type.toUpperCase()}] ${email} → ${code}`);

    return otp;
  }

  private async verifyOtp(email: string, code: string, type: string) {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        email,
        code,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    // Sau khi xác thực OTP đúng, tự động update isVerified cho User
    // Sử dụng updateMany hoặc update kèm catch để tránh lỗi nếu user chưa tồn tại (tùy logic)
    await this.prisma.user.updateMany({
      where: { email, isVerified: false },
      data: { isVerified: true },
    });

    return otp;
  }

  private generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '7d',
    });
    return { token };
  }
}
