// src/modules/auth/repositories/otp.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Otp, Prisma } from '@prisma/client';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OtpCreateInput): Promise<Otp> {
    return this.prisma.otp.create({ data });
  }

  async findFirst(
    where: Prisma.OtpWhereInput,
    orderBy?: Prisma.OtpOrderByWithRelationInput,
  ): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where,
      orderBy,
    });
  }

  async delete(id: string): Promise<Otp> {
    return this.prisma.otp.delete({ where: { id } });
  }

  async deleteMany(where: Prisma.OtpWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.otp.deleteMany({ where });
  }
}
