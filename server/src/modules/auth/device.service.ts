// src/modules/auth/device.service.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';
import { AddDeviceDto } from '@modules/auth/dto/add-device.dto';
import { DeviceResponseDto } from '@modules/auth/dto/device-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DeviceService {
  constructor(private readonly adminDeviceRepository: AdminDeviceRepository) {}

  async findAllByUser(userId: string): Promise<DeviceResponseDto[]> {
    const devices = await this.adminDeviceRepository.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map((device) =>
      plainToInstance(DeviceResponseDto, device, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async addDevice(
    userId: string,
    dto: AddDeviceDto,
  ): Promise<DeviceResponseDto> {
    const existing = await this.adminDeviceRepository.findUnique({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
    });
    if (existing) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'DEVICE_ALREADY_EXISTS',
        'Device already registered',
      );
    }
    const device = await this.adminDeviceRepository.create({
      data: {
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
      },
    });
    return plainToInstance(DeviceResponseDto, device, {
      excludeExtraneousValues: true,
    });
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    await this.adminDeviceRepository.delete({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  async validateDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.adminDeviceRepository.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!device) return false;
    await this.adminDeviceRepository.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }
}
