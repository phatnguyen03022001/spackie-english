import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/users.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /* =========================
        PROFILE
    ========================= */

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        vocabXp: true,
        streak: true,
        lastActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        // thêm field khác nếu cần, tránh spread dto
      },
    });
  }

  /* =========================
        XP (simple version)
    ========================= */

  async addXp(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) return;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        vocabXp: { increment: amount },
      },
    });
  }

  /* =========================
        LEADERBOARD
    ========================= */

  async getLeaderboard() {
    return this.prisma.user.findMany({
      orderBy: { vocabXp: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        vocabXp: true,
        streak: true,
      },
    });
  }

  /* =========================
        ADMIN
    ========================= */

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        vocabXp: true,
        streak: true,
        createdAt: true,
      },
    });
  }

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
