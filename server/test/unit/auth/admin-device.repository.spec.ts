import { Test, TestingModule } from '@nestjs/testing';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';
import { PrismaService } from '@database/prisma.service';

describe('AdminDeviceRepository', () => {
  let repository: AdminDeviceRepository;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDeviceRepository,
        {
          provide: PrismaService,
          useValue: {
            adminDevice: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(AdminDeviceRepository);
    prisma = module.get(PrismaService);
  });

  it('should find many devices', async () => {
    const args = { where: { userId: 'user-123' } };
    const expected = [{ id: 'dev1' }, { id: 'dev2' }];
    prisma.adminDevice.findMany.mockResolvedValue(expected);

    const result = await repository.findMany(args);
    expect(prisma.adminDevice.findMany).toHaveBeenCalledWith(args);
    expect(result).toEqual(expected);
  });

  it('should find unique device', async () => {
    const args = { where: { id: 'dev1' } };
    const expected = { id: 'dev1', userId: 'user-123', deviceId: 'abc' };
    prisma.adminDevice.findUnique.mockResolvedValue(expected);

    const result = await repository.findUnique(args);
    expect(prisma.adminDevice.findUnique).toHaveBeenCalledWith(args);
    expect(result).toEqual(expected);
  });

  it('should create device', async () => {
    const args = {
      data: { userId: 'user-123', deviceId: 'abc', deviceName: 'iPhone' },
    };
    const expected = { id: 'dev1', ...args.data };
    prisma.adminDevice.create.mockResolvedValue(expected);

    const result = await repository.create(args);
    expect(prisma.adminDevice.create).toHaveBeenCalledWith(args);
    expect(result).toEqual(expected);
  });

  it('should update device', async () => {
    const args = { where: { id: 'dev1' }, data: { lastUsedAt: new Date() } };
    const expected = { id: 'dev1', ...args.data };
    prisma.adminDevice.update.mockResolvedValue(expected);

    const result = await repository.update(args);
    expect(prisma.adminDevice.update).toHaveBeenCalledWith(args);
    expect(result).toEqual(expected);
  });

  it('should delete device', async () => {
    const args = { where: { id: 'dev1' } };
    const expected = { id: 'dev1' };
    prisma.adminDevice.delete.mockResolvedValue(expected);

    const result = await repository.delete(args);
    expect(prisma.adminDevice.delete).toHaveBeenCalledWith(args);
    expect(result).toEqual(expected);
  });
});
