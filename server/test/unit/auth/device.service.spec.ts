import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from '@modules/auth/device.service';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';
import { AddDeviceDto } from '@modules/auth/dto/add-device.dto';
import { DeviceResponseDto } from '@modules/auth/dto/device-response.dto';
import { BusinessException } from '@common/filters/business.exception';

describe('DeviceService', () => {
  let service: DeviceService;
  let adminDeviceRepo: jest.Mocked<AdminDeviceRepository>;

  const mockDevice = {
    id: 'dev1',
    deviceId: 'device123',
    deviceName: 'iPhone',
    userId: 'user123',
    createdAt: new Date(),
    lastUsedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: AdminDeviceRepository,
          useValue: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DeviceService);
    adminDeviceRepo = module.get(AdminDeviceRepository);
  });

  describe('findAllByUser', () => {
    it('should return list of devices transformed to DTO', async () => {
      const devices = [
        mockDevice,
        {
          ...mockDevice,
          id: 'dev2',
          deviceId: 'device456',
          deviceName: 'iPad',
        },
      ];
      adminDeviceRepo.findMany.mockResolvedValue(devices as any);

      const result = await service.findAllByUser('user123');
      expect(adminDeviceRepo.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(DeviceResponseDto);
      expect(result[0].deviceId).toBe('device123');
      expect(result[1].deviceId).toBe('device456');
    });
  });

  describe('addDevice', () => {
    it('should add device successfully with deviceName', async () => {
      adminDeviceRepo.findUnique.mockResolvedValue(null);
      adminDeviceRepo.create.mockResolvedValue(mockDevice as any);

      const dto: AddDeviceDto = { deviceId: 'device123', deviceName: 'iPhone' };
      const result = await service.addDevice('user123', dto);
      expect(adminDeviceRepo.findUnique).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId: 'user123', deviceId: 'device123' },
        },
      });
      expect(adminDeviceRepo.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          deviceId: 'device123',
          deviceName: 'iPhone',
        },
      });
      expect(result.deviceId).toBe('device123');
      expect(result.deviceName).toBe('iPhone');
    });

    it('should add device successfully without deviceName (optional)', async () => {
      adminDeviceRepo.findUnique.mockResolvedValue(null);
      const deviceWithoutName = { ...mockDevice, deviceName: null };
      adminDeviceRepo.create.mockResolvedValue(deviceWithoutName as any);

      const dto: AddDeviceDto = { deviceId: 'device123' };
      const result = await service.addDevice('user123', dto);
      expect(adminDeviceRepo.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          deviceId: 'device123',
          deviceName: undefined,
        },
      });
      expect(result.deviceId).toBe('device123');
      expect(result.deviceName).toBeNull();
    });

    it('should throw BusinessException if device already exists', async () => {
      adminDeviceRepo.findUnique.mockResolvedValue(mockDevice as any);
      await expect(
        service.addDevice('user123', { deviceId: 'device123' }),
      ).rejects.toThrow(BusinessException);
      expect(adminDeviceRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('removeDevice', () => {
    it('should delete device with composite key (userId and deviceId)', async () => {
      adminDeviceRepo.delete.mockResolvedValue(mockDevice as any);
      await service.removeDevice('user123', 'device123');
      expect(adminDeviceRepo.delete).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId: 'user123', deviceId: 'device123' },
        },
      });
    });
  });

  describe('validateDevice', () => {
    it('should return true and update lastUsedAt when device exists', async () => {
      adminDeviceRepo.findUnique.mockResolvedValue(mockDevice as any);
      adminDeviceRepo.update.mockResolvedValue({
        ...mockDevice,
        lastUsedAt: new Date(),
      } as any);

      const valid = await service.validateDevice('user123', 'device123');
      expect(valid).toBe(true);
      expect(adminDeviceRepo.findUnique).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId: 'user123', deviceId: 'device123' },
        },
      });
      expect(adminDeviceRepo.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should return false when device does not exist', async () => {
      adminDeviceRepo.findUnique.mockResolvedValue(null);
      const valid = await service.validateDevice('user123', 'nonexistent');
      expect(valid).toBe(false);
      expect(adminDeviceRepo.update).not.toHaveBeenCalled();
    });
  });
});
