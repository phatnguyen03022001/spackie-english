import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { ChangePasswordDto } from '@modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/auth/dto/reset-password.dto';
import { AddDeviceDto } from '@modules/auth/dto/add-device.dto';
import { VerifyEmailDto } from '@modules/auth/dto/verify-email.dto';
import { ResendVerificationDto } from '@modules/auth/dto/resend-verification.dto';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { AuthLoginResponse } from '@modules/auth/interfaces/auth-response.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUserResponse = { id: 'user-123', email: 'test@example.com' } as any;
  const mockTokens = { accessToken: 'at', refreshToken: 'rt' };
  const mockLoginResponse: AuthLoginResponse = {
    ...mockTokens,
    user: mockUserResponse,
  };
  const mockCurrentUser: RequestUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerification: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            changePassword: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            getMe: jest.fn(),
            getAdminDevices: jest.fn(),
            addAdminDevice: jest.fn(),
            removeAdminDevice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register and return success response', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'pass',
        name: 'Test',
      };
      authService.register.mockResolvedValue(mockUserResponse);
      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result.data).toEqual(mockUserResponse);
      expect(result.message).toBe('Registration successful');
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail', async () => {
      const dto: VerifyEmailDto = { email: 'test@example.com', otp: '123456' };
      await controller.verifyEmail(dto);
      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('resendVerification', () => {
    it('should call authService.resendVerification and return success', async () => {
      const dto: ResendVerificationDto = { email: 'test@example.com' };
      await controller.resendVerification(dto);
      expect(authService.resendVerification).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'pass' };
      authService.login.mockResolvedValue(mockLoginResponse);
      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result.data).toEqual(mockLoginResponse);
      expect(result.message).toBe('Login successful');
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return new tokens', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'old-rt' };
      authService.refresh.mockResolvedValue(mockTokens);
      const result = await controller.refresh(dto);
      expect(authService.refresh).toHaveBeenCalledWith(dto.refreshToken);
      expect(result.data).toEqual(mockTokens);
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'rt' };
      await controller.logout(dto);
      expect(authService.logout).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      authService.getMe.mockResolvedValue(mockUserResponse);
      const result = await controller.getProfile(mockCurrentUser);
      expect(authService.getMe).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword', async () => {
      const dto: ChangePasswordDto = { oldPassword: 'old', newPassword: 'new' };
      await controller.changePassword(mockCurrentUser, dto);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockCurrentUser.id,
        dto,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      const dto: ForgotPasswordDto = { email: 'test@example.com' };
      await controller.forgotPassword(dto);
      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const dto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'new',
      };
      await controller.resetPassword(dto);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('getDevices', () => {
    it('should return list of admin devices', async () => {
      const mockDevices = [{ id: 'dev1', deviceId: 'abc' }];
      authService.getAdminDevices.mockResolvedValue(mockDevices as any);
      const result = await controller.getDevices(mockCurrentUser);
      expect(authService.getAdminDevices).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result.data).toEqual(mockDevices);
    });
  });

  describe('addDevice', () => {
    it('should add device for admin', async () => {
      const dto: AddDeviceDto = { deviceId: 'abc', deviceName: 'iPhone' };
      const mockDevice = { id: 'dev1', ...dto };
      authService.addAdminDevice.mockResolvedValue(mockDevice as any);
      const result = await controller.addDevice(mockCurrentUser, dto);
      expect(authService.addAdminDevice).toHaveBeenCalledWith(
        mockCurrentUser.id,
        dto,
      );
      expect(result.data).toEqual(mockDevice);
    });
  });

  describe('removeDevice', () => {
    it('should remove device for admin', async () => {
      await controller.removeDevice(mockCurrentUser, 'deviceId123');
      expect(authService.removeAdminDevice).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'deviceId123',
      );
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAll', async () => {
      await controller.logoutAll(mockCurrentUser);
      expect(authService.logoutAll).toHaveBeenCalledWith(mockCurrentUser.id);
    });
  });
});
