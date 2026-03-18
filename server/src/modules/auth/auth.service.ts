import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Helpers } from '@common/utils/helpers';
import { MailService } from '@/modules/mail/mail.service';
import { User, UserRole, OTPType } from '@prisma/client';
import {
  RegisterDto,
  SendOtpDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /* =======================================================
      OTP CORE LOGIC
  ======================================================= */

  async sendOtp(dto: SendOtpDto, type: OTPType) {
    if (type !== 'REGISTER') {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) throw new NotFoundException('Email không tồn tại');
    }

    const code = await this.createOtp(dto.email, type);
    await this.mailService.sendOtp(dto.email, code, type);

    return { message: 'Mã xác thực đã được gửi đến email của bạn' };
  }

  private async createOtp(email: string, type: OTPType) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.oTP.upsert({
      where: {
        email_type_unique: { email, type },
      },
      update: { code, expiresAt, used: false },
      create: { email, code, type, expiresAt },
    });

    return code;
  }

  private async verifyOtp(email: string, code: string, type: OTPType) {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        email,
        code,
        type,
        expiresAt: { gt: new Date() },
        used: false,
      },
    });

    if (!otp) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    return otp;
  }

  /* =======================================================
      REGISTER
  ======================================================= */

  async register(dto: RegisterDto) {
    const existed = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existed && existed.isVerified) {
      throw new ConflictException('Email đã được đăng ký và xác thực');
    }

    const hashedPassword = await Helpers.hashPassword(dto.password);
    const name = dto.firstName
      ? `${dto.firstName.trim()} ${dto.lastName?.trim() || ''}`.trim()
      : null;

    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: {
        password: hashedPassword,
        name,
        role: dto.role || UserRole.STUDENT,
        updatedAt: new Date(), // Đảm bảo ghi đè giá trị null cũ
      },
      create: {
        email: dto.email,
        password: hashedPassword,
        name,
        role: dto.role || UserRole.STUDENT,
        isVerified: false,
      },
    });

    await this.sendOtp({ email: dto.email }, 'REGISTER');

    return {
      userId: user.id,
      message: 'Vui lòng xác thực OTP để hoàn tất đăng ký',
    };
  }

  async verifyRegisterOtp(dto: VerifyOtpDto) {
    await this.verifyOtp(dto.email, dto.code, 'REGISTER');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: dto.email },
        data: { isVerified: true, updatedAt: new Date() },
      }),
      // Sử dụng deleteMany để tránh lỗi RecordNotFound nếu nhấn 2 lần
      this.prisma.oTP.deleteMany({
        where: { email: dto.email, type: 'REGISTER' },
      }),
    ]);

    return { message: 'Xác thực tài khoản thành công' };
  }

  /* =======================================================
      LOGIN
  ======================================================= */

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (
      !user ||
      !(await Helpers.comparePassword(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Tài khoản chưa xác thực email');
    }

    return this.generateTokens(user);
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    await this.verifyOtp(dto.email, dto.code, 'LOGIN');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    await this.prisma.oTP.deleteMany({
      where: { email: dto.email, type: 'LOGIN' },
    });

    return this.generateTokens(user);
  }

  /* =======================================================
      FORGOT PASSWORD
  ======================================================= */

  async verifyForgotOtp(dto: VerifyOtpDto) {
    await this.verifyOtp(dto.email, dto.code, 'FORGOT_PASSWORD');

    // Không xóa OTP ở đây vì cần giữ để gọi tiếp hàm forgotPassword bên dưới
    return {
      email: dto.email,
      message: 'OTP hợp lệ, vui lòng đặt mật khẩu mới',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Verify lại một lần nữa trước khi đổi pass
    await this.verifyOtp(dto.email, dto.code, 'FORGOT_PASSWORD');

    const hashedPassword = await Helpers.hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: dto.email },
        data: { password: hashedPassword, updatedAt: new Date() },
      }),
      this.prisma.oTP.deleteMany({
        where: { email: dto.email, type: 'FORGOT_PASSWORD' },
      }),
    ]);

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  /* =======================================================
      JWT GENERATION
  ======================================================= */

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('jwt.secret'),
      expiresIn: this.config.getOrThrow('jwt.expiresIn'),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
