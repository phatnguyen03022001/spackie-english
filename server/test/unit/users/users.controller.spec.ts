import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '@modules/users/users.controller';
import { UsersService } from '@modules/users/users.service';
import { UpdateAvatarUseCase } from '@modules/users/use-cases/update-avatar.use-case';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UserListQueryDto } from '@modules/users/dto/user-list-query.dto';
import { BusinessException } from '@common/filters/business.exception';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let updateAvatarUseCase: jest.Mocked<UpdateAvatarUseCase>;

  const mockUserResponse = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'test',
  } as any;
  const mockCurrentUser: RequestUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };
  const mockAdminUser: RequestUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            ban: jest.fn(),
            unban: jest.fn(),
            hardDelete: jest.fn(),
          },
        },
        { provide: UpdateAvatarUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UsersController);
    usersService = module.get(UsersService);
    updateAvatarUseCase = module.get(UpdateAvatarUseCase);
  });

  describe('create', () => {
    it('should call usersService.create and return success response', async () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'pass',
      };
      usersService.create.mockResolvedValue(mockUserResponse);
      const result = await controller.create(dto);
      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result.data).toEqual(mockUserResponse);
      expect(result.message).toBe('User created successfully');
    });
  });

  describe('findAll', () => {
    it('should call usersService.findAll with query and return pagination', async () => {
      const query: UserListQueryDto = {
        page: 1,
        limit: 10,
        sort: 'createdAt:desc',
      };
      const mockResult = { data: [mockUserResponse], total: 1 };
      usersService.findAll.mockResolvedValue(mockResult);
      const result = await controller.findAll(query);
      expect(usersService.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toEqual([mockUserResponse]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      usersService.findById.mockResolvedValue(mockUserResponse);
      const result = await controller.getProfile(mockCurrentUser);
      expect(usersService.findById).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('findOne', () => {
    it('should allow user to get own profile', async () => {
      usersService.findById.mockResolvedValue(mockUserResponse);
      const result = await controller.findOne('user-123', mockCurrentUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-123');
      expect(result.data).toEqual(mockUserResponse);
    });

    it('should allow admin to get any user', async () => {
      usersService.findById.mockResolvedValue(mockUserResponse);
      const result = await controller.findOne('user-456', mockAdminUser);
      expect(result.data).toEqual(mockUserResponse);
    });

    it('should throw Forbidden if non-admin tries to get another user', async () => {
      await expect(
        controller.findOne('user-456', mockCurrentUser),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const dto: UpdateUserDto = { displayName: 'New Name' };
      usersService.update.mockResolvedValue(mockUserResponse);
      const result = await controller.updateProfile(dto, mockCurrentUser);
      expect(usersService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        dto,
        mockCurrentUser,
      );
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('updateAvatar', () => {
    it('should call updateAvatarUseCase with file', async () => {
      const file = {
        buffer: Buffer.from(''),
        originalname: 'avatar.png',
      } as Express.Multer.File;
      updateAvatarUseCase.execute.mockResolvedValue(mockUserResponse);
      const result = await controller.updateAvatar(file, mockCurrentUser);
      expect(updateAvatarUseCase.execute).toHaveBeenCalledWith(
        mockCurrentUser.id,
        file,
      );
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('deleteOwnAccount', () => {
    it('should soft delete user account', async () => {
      usersService.softDelete.mockResolvedValue(undefined);
      const result = await controller.deleteOwnAccount(mockCurrentUser);
      expect(usersService.softDelete).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCurrentUser,
      );
      expect(result.message).toBe('Account soft-deleted');
    });
  });

  describe('banUser', () => {
    it('should ban user (admin only)', async () => {
      usersService.ban.mockResolvedValue(mockUserResponse);
      const result = await controller.banUser('user-123');
      expect(usersService.ban).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('User banned');
    });
  });

  describe('unbanUser', () => {
    it('should unban user (admin only)', async () => {
      usersService.unban.mockResolvedValue(mockUserResponse);
      const result = await controller.unbanUser('user-123');
      expect(usersService.unban).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('User unbanned');
    });
  });

  describe('hardDeleteUser', () => {
    it('should hard delete user (admin only)', async () => {
      usersService.hardDelete.mockResolvedValue(undefined);
      const result = await controller.hardDeleteUser('user-123');
      expect(usersService.hardDelete).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('User permanently deleted');
    });
  });
});
