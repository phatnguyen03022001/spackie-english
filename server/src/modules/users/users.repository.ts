// src/modules/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { User, Prisma } from '@prisma/client';
import { UserListQueryDto } from './dto/user-list-query.dto';

// Danh sách các trường cho phép sắp xếp
const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'email',
  'username',
  'totalCardsLearned',
  'currentStreak',
  'longestStreak',
];

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string, includeDeleted = false): Promise<User | null> {
    const where: Prisma.UserWhereUniqueInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.user.findUnique({ where });
  }

  async findByEmail(
    email: string,
    includeDeleted = false,
  ): Promise<User | null> {
    const where: Prisma.UserWhereInput = { email };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.user.findFirst({ where });
  }

  async findByUsername(
    username: string,
    includeDeleted = false,
  ): Promise<User | null> {
    const where: Prisma.UserWhereInput = { username };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.user.findFirst({ where });
  }

  async findAll(
    query: UserListQueryDto,
  ): Promise<{ users: User[]; total: number }> {
    const { page, limit, search, role, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    // Search
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as Prisma.EnumRoleFilter<'User'>;
    }

    // Status filter
    if (status === 'active') {
      where.isBanned = false;
      where.deletedAt = null;
    } else if (status === 'banned') {
      where.isBanned = true;
      where.deletedAt = null;
    } else if (status === 'deleted') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    // Validate sortBy field
    let validSortBy: string = sortBy;
    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      validSortBy = 'createdAt';
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    orderBy[validSortBy as keyof Prisma.UserOrderByWithRelationInput] =
      sortOrder;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async hardDelete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async ban(id: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { isBanned: true } });
  }

  async unban(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isBanned: false },
    });
  }
}
