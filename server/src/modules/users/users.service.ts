import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/users.dto';

// src/modules/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        streak: true,
        lastActiveAt: true, // Sửa từ lastActive thành lastActiveAt
        createdAt: true,
        stats: true, // Lấy toàn bộ stats định lượng (masteredWords, totalReviews...)
      },
    });

    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async getLeaderboard() {
    // Xếp hạng dựa trên số từ đã Mastered (Định lượng thực tế)
    return this.prisma.userStats.findMany({
      orderBy: { masteredWords: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: { stats: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin update vẫn giữ nguyên logic check undefined để tránh ghi đè null
  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.name && { name: dto.name }),
      },
    });
  }
}
