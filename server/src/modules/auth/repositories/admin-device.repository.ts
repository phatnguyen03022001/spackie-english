// src/modules/auth/repositories/admin-device.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AdminDevice, Prisma } from '@prisma/client';

@Injectable()
export class AdminDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(args: Prisma.AdminDeviceFindManyArgs): Promise<AdminDevice[]> {
    return this.prisma.adminDevice.findMany(args);
  }

  async findUnique(
    args: Prisma.AdminDeviceFindUniqueArgs,
  ): Promise<AdminDevice | null> {
    return this.prisma.adminDevice.findUnique(args);
  }

  async create(args: Prisma.AdminDeviceCreateArgs): Promise<AdminDevice> {
    return this.prisma.adminDevice.create(args);
  }

  async delete(args: Prisma.AdminDeviceDeleteArgs): Promise<AdminDevice> {
    return this.prisma.adminDevice.delete(args);
  }

  async update(args: Prisma.AdminDeviceUpdateArgs): Promise<AdminDevice> {
    return this.prisma.adminDevice.update(args);
  }
}
