import { Test, TestingModule } from '@nestjs/testing';
import { OtpRepository } from '@modules/auth/repositories/otp.repository';
import { PrismaService } from '@database/prisma.service';

describe('OtpRepository', () => {
  let repository: OtpRepository;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpRepository,
        {
          provide: PrismaService,
          useValue: {
            otp: {
              create: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(OtpRepository);
    prisma = module.get(PrismaService);
  });

  it('should create an OTP record', async () => {
    const data = {
      email: 'test@example.com',
      otpHash: 'hash',
      type: 'VERIFY_EMAIL',
      expiresAt: new Date(),
    };
    const expected = { id: '1', ...data };
    prisma.otp.create.mockResolvedValue(expected);

    const result = await repository.create(data);
    expect(prisma.otp.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(expected);
  });

  it('should find first OTP with where and orderBy', async () => {
    const where = { email: 'test@example.com', type: 'VERIFY_EMAIL' };
    const orderBy = { createdAt: 'desc' as const }; // fix: as const
    const expected = { id: '1', ...where };
    prisma.otp.findFirst.mockResolvedValue(expected);

    const result = await repository.findFirst(where, orderBy);
    expect(prisma.otp.findFirst).toHaveBeenCalledWith({ where, orderBy });
    expect(result).toEqual(expected);
  });

  it('should delete OTP by id', async () => {
    const id = 'otp-123';
    const expected = { id };
    prisma.otp.delete.mockResolvedValue(expected);

    const result = await repository.delete(id);
    expect(prisma.otp.delete).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual(expected);
  });

  it('should delete many OTPs by where', async () => {
    const where = { email: 'test@example.com', type: 'VERIFY_EMAIL' };
    const expected = { count: 2 };
    prisma.otp.deleteMany.mockResolvedValue(expected);

    const result = await repository.deleteMany(where);
    expect(prisma.otp.deleteMany).toHaveBeenCalledWith({ where });
    expect(result).toEqual(expected);
  });
});
