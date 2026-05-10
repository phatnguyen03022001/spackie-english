import { Test, TestingModule } from '@nestjs/testing';
import { SettingsRepository } from '@modules/settings/settings.repository';
import { PrismaService } from '@database/prisma.service';

describe('SettingsRepository', () => {
  let repository: SettingsRepository;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsRepository,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(SettingsRepository);
    prisma = module.get(PrismaService);
  });

  describe('findByUserId', () => {
    it('should return settings object', async () => {
      prisma.user.findUnique.mockResolvedValue({ settings: { theme: 'dark' } });
      const result = await repository.findByUserId('user123');
      expect(result).toEqual({ theme: 'dark' });
    });

    it('should return empty object when user has no settings', async () => {
      prisma.user.findUnique.mockResolvedValue({ settings: null });
      const result = await repository.findByUserId('user123');
      expect(result).toEqual({});
    });

    it('should return empty object when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await repository.findByUserId('nonexistent');
      expect(result).toEqual({});
    });
  });

  describe('update', () => {
    it('should update and return new settings', async () => {
      prisma.user.update.mockResolvedValue({
        settings: { theme: 'dark', language: 'en' },
      });
      const result = await repository.update('user123', { language: 'en' });
      expect(result).toEqual({ theme: 'dark', language: 'en' });
    });
  });

  describe('reset', () => {
    it('should set settings to empty object', async () => {
      await repository.reset('user123');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { settings: {} },
      });
    });
  });
});
