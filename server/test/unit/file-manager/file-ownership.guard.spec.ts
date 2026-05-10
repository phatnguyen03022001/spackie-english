import { FileOwnershipGuard } from '@modules/file-manager/guards/file-ownership.guard';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { ExecutionContext } from '@nestjs/common';
import { BusinessException } from '@common/filters/business.exception';

describe('FileOwnershipGuard', () => {
  let guard: FileOwnershipGuard;
  let fileRepository: jest.Mocked<FileManagerRepository>;

  beforeEach(() => {
    fileRepository = { findById: jest.fn() } as any;
    guard = new FileOwnershipGuard(fileRepository);
  });

  const mockRequest = (userId: string, role: string, fileId: string) => ({
    user: { id: userId, role },
    params: { fileId },
  });

  const createContext = (req: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as ExecutionContext;

  it('should return true if no fileId in params', async () => {
    const req = { user: { id: 'user1' }, params: {} };
    const result = await guard.canActivate(createContext(req));
    expect(result).toBe(true);
    expect(fileRepository.findById).not.toHaveBeenCalled();
  });

  it('should allow admin to access any file', async () => {
    const req = mockRequest('admin1', 'ADMIN', 'file123');
    fileRepository.findById.mockResolvedValue({ userId: 'user2' } as any);
    const result = await guard.canActivate(createContext(req));
    expect(result).toBe(true);
  });

  it('should allow owner to access own file', async () => {
    const req = mockRequest('user1', 'USER', 'file123');
    fileRepository.findById.mockResolvedValue({ userId: 'user1' } as any);
    const result = await guard.canActivate(createContext(req));
    expect(result).toBe(true);
  });

  it('should throw forbidden if not owner and not admin', async () => {
    const req = mockRequest('user1', 'USER', 'file123');
    fileRepository.findById.mockResolvedValue({ userId: 'user2' } as any);
    await expect(guard.canActivate(createContext(req))).rejects.toThrow(
      BusinessException,
    );
    await expect(guard.canActivate(createContext(req))).rejects.toMatchObject({
      response: { code: 'FILE_FORBIDDEN' },
    });
  });

  it('should throw not found if file missing', async () => {
    const req = mockRequest('user1', 'USER', 'file123');
    fileRepository.findById.mockResolvedValue(null);
    await expect(guard.canActivate(createContext(req))).rejects.toThrow(
      BusinessException,
    );
    await expect(guard.canActivate(createContext(req))).rejects.toMatchObject({
      response: { code: 'FILE_NOT_FOUND' },
    });
  });
});
