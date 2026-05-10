import { Test, TestingModule } from '@nestjs/testing';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { PrismaService } from '@database/prisma.service';

describe('FileManagerRepository', () => {
  let repository: FileManagerRepository;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileManagerRepository,
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
              aggregate: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(FileManagerRepository);
    prisma = module.get(PrismaService);
  });

  it('should create a file', async () => {
    const data = {
      url: 'http://test.com/file.jpg',
      publicId: 'pub123',
      resourceType: 'image',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      user: { connect: { id: 'user123' } },
    };
    await repository.create(data);
    expect(prisma.file.create).toHaveBeenCalledWith({ data });
  });

  it('should find by id', async () => {
    await repository.findById('file123');
    expect(prisma.file.findUnique).toHaveBeenCalledWith({
      where: { id: 'file123' },
    });
  });

  it('should find by user id', async () => {
    await repository.findByUserId('user123');
    expect(prisma.file.findMany).toHaveBeenCalledWith({
      where: { userId: 'user123' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should delete a file', async () => {
    await repository.delete('file123');
    expect(prisma.file.delete).toHaveBeenCalledWith({
      where: { id: 'file123' },
    });
  });

  it('should get total size by user id', async () => {
    prisma.file.aggregate.mockResolvedValue({ _sum: { sizeBytes: 5000 } });
    const total = await repository.getTotalSizeByUserId('user123');
    expect(total).toBe(5000);
    expect(prisma.file.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user123' },
      _sum: { sizeBytes: true },
    });
  });

  it('should count by refId', async () => {
    prisma.file.count.mockResolvedValue(3);
    const count = await repository.countByRefId('card456');
    expect(count).toBe(3);
    expect(prisma.file.count).toHaveBeenCalledWith({
      where: { refId: 'card456' },
    });
  });
});
