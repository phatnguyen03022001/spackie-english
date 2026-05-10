import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(reflector);

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    };
  });

  describe('canActivate', () => {
    it('should return true if route is public', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should delegate to parent AuthGuard if not public', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      // Mock the parent canActivate to return true
      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledWith(mockContext);

      parentCanActivate.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user if no error and user exists', () => {
      const user = { id: '1', role: 'USER' };
      const result = guard.handleRequest(null, user);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if error exists', () => {
      const err = new Error('Token expired');
      expect(() => guard.handleRequest(err, null)).toThrow(err);
    });

    it('should throw UnauthorizedException if user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null)).toThrow(
        'Invalid or missing token',
      );
    });
  });
});
