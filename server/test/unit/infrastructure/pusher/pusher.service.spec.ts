import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PusherService } from '@infrastructure/pusher/pusher.service';

describe('PusherService', () => {
  let service: PusherService;
  let mockPusher: any;

  beforeEach(async () => {
    mockPusher = {
      trigger: jest.fn(),
      get: jest.fn(),
      authorizeChannel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PusherService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'pusher.appId') return 'test-app-id';
              if (key === 'pusher.key') return 'test-key';
              if (key === 'pusher.secret') return 'test-secret';
              if (key === 'pusher.cluster') return 'ap1';
              if (key === 'pusher.useTLS') return true;
              return null;
            }),
          },
        },
      ],
    })
      .overrideProvider(PusherService)
      .useFactory({
        factory: () => {
          const configService = new ConfigService();
          const svc = new PusherService(configService);
          (svc as any).pusher = mockPusher;
          return svc;
        },
      })
      .compile();

    service = module.get(PusherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trigger', () => {
    it('should trigger event on channel', async () => {
      mockPusher.trigger.mockResolvedValue({});
      await service.trigger('channel-1', 'event-1', { data: 'test' });
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'channel-1',
        'event-1',
        {
          data: 'test',
        },
        { socket_id: undefined },
      );
    });

    it('should trigger with socketId', async () => {
      mockPusher.trigger.mockResolvedValue({});
      await service.trigger(
        'channel-1',
        'event-1',
        { data: 'test' },
        'socket123',
      );
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'channel-1',
        'event-1',
        {
          data: 'test',
        },
        { socket_id: 'socket123' },
      );
    });

    it('should retry on failure and succeed', async () => {
      mockPusher.trigger
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({});

      await service.trigger('channel-1', 'event-1', { data: 'test' });
      expect(mockPusher.trigger).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      mockPusher.trigger.mockRejectedValue(new Error('Persistent error'));

      await expect(
        service.trigger('channel-1', 'event-1', { data: 'test' }),
      ).rejects.toThrow('Persistent error');
      expect(mockPusher.trigger).toHaveBeenCalledTimes(3);
    });
  });

  describe('triggerToUser', () => {
    it('should trigger on private user channel', async () => {
      mockPusher.trigger.mockResolvedValue({});
      await service.triggerToUser('user-123', 'event-1', { data: 'test' });
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'private-user-user-123',
        'event-1',
        { data: 'test' },
        { socket_id: undefined },
      );
    });
  });

  describe('authenticate', () => {
    it('should authorize private channel', () => {
      mockPusher.authorizeChannel.mockReturnValue({ auth: 'auth-string' });
      const result = service.authenticate('socket-1', 'private-user-123');
      expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
        'socket-1',
        'private-user-123',
        undefined,
      );
      expect(result).toEqual({ auth: 'auth-string' });
    });

    it('should throw for non-private channels', () => {
      expect(() => service.authenticate('socket-1', 'public-channel')).toThrow(
        'Only private channels supported',
      );
    });
  });

  describe('ping', () => {
    it('should return true if Pusher responds', async () => {
      mockPusher.get.mockResolvedValue({ channels: {} });
      const result = await service.ping();
      expect(result).toBe(true);
    });

    it('should return false if Pusher fails', async () => {
      mockPusher.get.mockRejectedValue(new Error('Connection error'));
      const result = await service.ping();
      expect(result).toBe(false);
    });
  });
});
