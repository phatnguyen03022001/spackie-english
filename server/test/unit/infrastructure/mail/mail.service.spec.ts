import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '@infrastructure/mail/mail.service';
import { MailProvider } from '@infrastructure/mail/mail.provider';

describe('MailService', () => {
  let service: MailService;
  let mockProvider: jest.Mocked<MailProvider>;

  beforeEach(async () => {
    mockProvider = {
      send: jest.fn(),
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailProvider,
          useValue: mockProvider,
        },
      ],
    }).compile();

    service = module.get(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should delegate to provider.send with correct params', async () => {
      mockProvider.send.mockResolvedValue();
      await service.send('test@example.com', 'Subject', '<p>HTML</p>', 'Text');
      expect(mockProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        'Subject',
        '<p>HTML</p>',
        'Text',
      );
    });

    it('should propagate error if provider fails', async () => {
      mockProvider.send.mockRejectedValue(new Error('SMTP error'));
      await expect(
        service.send('test@example.com', 'Subject', '<p>HTML</p>'),
      ).rejects.toThrow('SMTP error');
    });

    it('should work without text parameter', async () => {
      mockProvider.send.mockResolvedValue();
      await service.send('test@example.com', 'Subject', '<p>HTML</p>');
      expect(mockProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        'Subject',
        '<p>HTML</p>',
        undefined,
      );
    });
  });

  describe('ping', () => {
    it('should delegate to provider.ping', async () => {
      mockProvider.ping.mockResolvedValue();
      await service.ping();
      expect(mockProvider.ping).toHaveBeenCalled();
    });

    it('should propagate error from provider.ping', async () => {
      mockProvider.ping.mockRejectedValue(new Error('Connection failed'));
      await expect(service.ping()).rejects.toThrow('Connection failed');
    });
  });
});
