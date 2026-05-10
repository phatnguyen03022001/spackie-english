import { RolesGuard } from '@common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { ROLES_KEY } from '@common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(),
      })),
    };
  });

  describe('canActivate', () => {
    it('should return true if route is public', () => {
      reflector.getAllAndOverride.mockImplementation((_key: unknown) => {
        if (_key === IS_PUBLIC_KEY) return true;
        return undefined;
      });

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should return true if no roles are required', () => {
      reflector.getAllAndOverride.mockImplementation((_key: unknown) => {
        if (_key === IS_PUBLIC_KEY) return false;
        if (_key === ROLES_KEY) return undefined;
        return undefined;
      });

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should return true if user has required role', () => {
      const mockRequest = {
        user: { id: '1', role: 'ADMIN' },
      };
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      reflector.getAllAndOverride.mockImplementation((_key: unknown) => {
        if (_key === IS_PUBLIC_KEY) return false;
        if (_key === ROLES_KEY) return ['ADMIN'];
        return undefined;
      });

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required role', () => {
      const mockRequest = {
        user: { id: '1', role: 'USER' },
      };
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      reflector.getAllAndOverride.mockImplementation((_key: unknown) => {
        if (_key === IS_PUBLIC_KEY) return false;
        if (_key === ROLES_KEY) return ['ADMIN'];
        return undefined;
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user not found in request', () => {
      const mockRequest = {};
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      reflector.getAllAndOverride.mockImplementation((_key: unknown) => {
        if (_key === IS_PUBLIC_KEY) return false;
        if (_key === ROLES_KEY) return ['ADMIN'];
        return undefined;
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'User not found in request',
      );
    });
  });
});
