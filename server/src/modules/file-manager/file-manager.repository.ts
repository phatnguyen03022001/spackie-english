// src/modules/file-manager/file-manager.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FileManagerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FileCreateInput) {
    return this.prisma.file.create({ data });
  }

  async findById(id: string) {
    return this.prisma.file.findUnique({ where: { id } });
  }

  async findByUserId(userId: string) {
    return this.prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPublicId(publicId: string) {
    return this.prisma.file.findUnique({ where: { publicId } });
  }

  async delete(id: string) {
    return this.prisma.file.delete({ where: { id } });
  }

  async getTotalSizeByUserId(userId: string): Promise<number> {
    const result = await this.prisma.file.aggregate({
      where: { userId },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  }

  async countByRefId(refId: string): Promise<number> {
    return this.prisma.file.count({
      where: { refId },
    });
  }
}
