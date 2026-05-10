import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '@modules/users/users.repository';
import { PrismaService } from '@database/prisma.service';
import { UserListQueryDto } from '@modules/users/dto/user-list-query.dto';
import { Prisma } from '@prisma/client';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should call prisma.user.create with data and deletedAt: null', async () => {
      const input: Prisma.UserCreateInput = {
        email: 'test@example.com',
        username: 'testuser',
      };
      const expected = { id: '1', ...input, deletedAt: null };
      prisma.user.create.mockResolvedValue(expected);

      const result = await repository.create(input);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { ...input, deletedAt: null },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findById', () => {
    it('should add deletedAt: null filter when includeDeleted is false (default)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      await repository.findById('1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
    });

    it('should NOT add deletedAt filter when includeDeleted is true', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        deletedAt: new Date(),
      });
      await repository.findById('1', true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should add deletedAt: null filter when includeDeleted is false (default)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      await repository.findByEmail('test@example.com');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('should NOT add deletedAt filter when includeDeleted is true', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      await repository.findByEmail('test@example.com', true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findByUsername', () => {
    it('should add deletedAt: null filter when includeDeleted is false (default)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      await repository.findByUsername('testuser');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'testuser', deletedAt: null },
      });
    });

    it('should NOT add deletedAt filter when includeDeleted is true', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      await repository.findByUsername('testuser', true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });
  });

  describe('findAll', () => {
    const baseQuery: UserListQueryDto = {
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
    };

    it('should apply search filter across email, username, displayName', async () => {
      const query: UserListQueryDto = { ...baseQuery, search: 'john' };
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'john', mode: 'insensitive' } },
              { username: { contains: 'john', mode: 'insensitive' } },
              { displayName: { contains: 'john', mode: 'insensitive' } },
            ],
            deletedAt: null,
          },
        }),
      );
    });

    it('should filter by role', async () => {
      const query: UserListQueryDto = { ...baseQuery, role: 'ADMIN' };
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN', deletedAt: null },
        }),
      );
    });

    it('should filter by status = active', async () => {
      const query: UserListQueryDto = { ...baseQuery, status: 'active' };
      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isBanned: false, deletedAt: null },
        }),
      );
    });

    it('should filter by status = banned', async () => {
      const query: UserListQueryDto = { ...baseQuery, status: 'banned' };
      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isBanned: true, deletedAt: null },
        }),
      );
    });

    it('should filter by status = deleted', async () => {
      const query: UserListQueryDto = { ...baseQuery, status: 'deleted' };
      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: { not: null } },
        }),
      );
    });

    it('should fall back to createdAt while preserving sort order when sort field is invalid', async () => {
      const query: UserListQueryDto = {
        ...baseQuery,
        sort: 'invalidField:asc',
      };
      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should apply pagination (skip/take)', async () => {
      const query: UserListQueryDto = {
        page: 3,
        limit: 25,
        sort: 'createdAt:desc',
      };
      await repository.findAll(query);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        }),
      );
    });

    it('should return both users and total count', async () => {
      const mockUsers = [{ id: '1' }, { id: '2' }];
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(5);

      const result = await repository.findAll(baseQuery);
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(5);
    });
  });

  describe('update', () => {
    it('should call prisma.user.update with correct id and data', async () => {
      const data = { displayName: 'New Name' };
      const expected = { id: '1', ...data };
      prisma.user.update.mockResolvedValue(expected);

      const result = await repository.update('1', data);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and isActive to false', async () => {
      const now = new Date();
      jest.useFakeTimers().setSystemTime(now);
      prisma.user.update.mockResolvedValue({
        id: '1',
        deletedAt: now,
        isActive: false,
      });

      const result = await repository.softDelete('1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: now, isActive: false },
      });
      expect(result.deletedAt).toEqual(now);
      expect(result.isActive).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('hardDelete', () => {
    it('should call prisma.user.delete with id', async () => {
      const expected = { id: '1' };
      prisma.user.delete.mockResolvedValue(expected);

      const result = await repository.hardDelete('1');
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(expected);
    });
  });

  describe('ban', () => {
    it('should set isBanned to true', async () => {
      const expected = { id: '1', isBanned: true };
      prisma.user.update.mockResolvedValue(expected);

      const result = await repository.ban('1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isBanned: true },
      });
      expect(result.isBanned).toBe(true);
    });
  });

  describe('unban', () => {
    it('should set isBanned to false', async () => {
      const expected = { id: '1', isBanned: false };
      prisma.user.update.mockResolvedValue(expected);

      const result = await repository.unban('1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isBanned: false },
      });
      expect(result.isBanned).toBe(false);
    });
  });
});
