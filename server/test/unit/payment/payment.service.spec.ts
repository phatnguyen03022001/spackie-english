import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '@modules/payment/payment.service';
import { PaymentRepository } from '@modules/payment/payment.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { NotFoundException } from '@nestjs/common';
import { BusinessException } from '@common/filters/business.exception';
import { ConfigService } from '@nestjs/config';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let pusherService: jest.Mocked<PusherService>;

  const mockPayment = {
    id: 'payment1',
    userId: 'user1',
    orderCode: 'ORDER123',
    amount: 99000,
    status: 'PENDING' as const,
    plan: 'monthly',
    durationDays: 30,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubscription = {
    id: 'sub1',
    userId: 'user1',
    status: 'ACTIVE' as const,
    plan: 'monthly' as const,
    startedAt: new Date('2026-05-11'),
    expiresAt: new Date('2026-06-11'),
    meta: { autoRenew: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRepository = {
      createPayment: jest.fn(),
      findPaymentByOrderCode: jest.fn(),
      updatePayment: jest.fn(),
      findPaymentsByUser: jest.fn(),
      findSubscriptionByUser: jest.fn(),
      upsertSubscription: jest.fn(),
      findAllSubscriptions: jest.fn(),
    };

    const mockPusher = { triggerToUser: jest.fn() };
    const mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentRepository, useValue: mockPaymentRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PusherService, useValue: mockPusher },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://payos.example.com'),
          },
        },
        {
          provide: 'ICacheManager',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            reset: jest.fn(),
            ping: jest.fn(),
          },
        },
        {
          provide: 'PAYMENT_PROVIDER',
          useValue: {
            createPayment: jest.fn().mockResolvedValue({
              orderCode: 'ORDER123',
              paymentUrl: 'https://payos.example.com/checkout/ORDER123',
            }),
            getPaymentInfo: jest.fn(),
            cancelPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    eventEmitter = module.get(EventEmitter2);
    pusherService = module.get(PusherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment order and return orderCode and checkoutUrl', async () => {
      paymentRepository.createPayment.mockResolvedValue(mockPayment as any);

      const result = await service.createPayment('user1', 'monthly', 99000);

      expect(paymentRepository.createPayment).toHaveBeenCalledWith({
        userId: 'user1',
        orderCode: expect.stringContaining('PAY-'),
        amount: 99000,
        plan: 'monthly',
        durationDays: 30,
        status: 'PENDING',
      });
      expect(result.orderCode).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      expect(result.checkoutUrl).toContain('payos.example.com');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      const mockHistory = { items: [mockPayment], total: 1 };
      paymentRepository.findPaymentsByUser.mockResolvedValue(
        mockHistory as any,
      );

      const result = await service.getPaymentHistory('user1', 1, 10);

      expect(paymentRepository.findPaymentsByUser).toHaveBeenCalledWith(
        'user1',
        0,
        10,
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription info when exists', async () => {
      paymentRepository.findSubscriptionByUser.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await service.getSubscription('user1');

      expect(paymentRepository.findSubscriptionByUser).toHaveBeenCalledWith(
        'user1',
      );
      expect(result.status).toBe('ACTIVE');
      expect(result.plan).toBe('monthly');
      expect(result.autoRenew).toBe(true);
    });

    it('should return NONE status when no subscription', async () => {
      paymentRepository.findSubscriptionByUser.mockResolvedValue(null);

      const result = await service.getSubscription('user1');

      expect(result.status).toBe('NONE');
      expect(result.plan).toBe('FREE');
      expect(result.autoRenew).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and set autoRenew to false', async () => {
      paymentRepository.findSubscriptionByUser.mockResolvedValue(
        mockSubscription as any,
      );
      paymentRepository.upsertSubscription.mockResolvedValue({} as any);

      const result = await service.cancelSubscription('user1');

      expect(paymentRepository.upsertSubscription).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          meta: expect.objectContaining({ autoRenew: false }),
        }),
      );
      expect(result.message).toBe('Auto-renewal cancelled');
    });

    it('should throw BusinessException if no active subscription', async () => {
      paymentRepository.findSubscriptionByUser.mockResolvedValue(null);

      await expect(service.cancelSubscription('user1')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should update payment and upsert subscription on success', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue(
        mockPayment as any,
      );
      paymentRepository.updatePayment.mockResolvedValue({
        ...mockPayment,
        status: 'SUCCESS',
      } as any);
      paymentRepository.findSubscriptionByUser.mockResolvedValue(null);
      paymentRepository.upsertSubscription.mockResolvedValue(
        mockSubscription as any,
      );

      await service.handlePaymentSuccess('ORDER123');

      expect(paymentRepository.updatePayment).toHaveBeenCalledWith('ORDER123', {
        status: 'SUCCESS',
      });
      expect(paymentRepository.upsertSubscription).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          status: 'ACTIVE',
          plan: 'monthly',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'subscription.activated',
        expect.objectContaining({
          userId: 'user1',
          plan: 'monthly',
        }),
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        'payment.success',
        expect.objectContaining({ orderCode: 'ORDER123' }),
      );
    });

    it('should be idempotent if payment already SUCCESS', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue({
        ...mockPayment,
        status: 'SUCCESS',
      } as any);

      await service.handlePaymentSuccess('ORDER123');

      expect(paymentRepository.updatePayment).not.toHaveBeenCalled();
      expect(paymentRepository.upsertSubscription).not.toHaveBeenCalled();
    });

    it('should extend existing active subscription', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue(
        mockPayment as any,
      );
      paymentRepository.updatePayment.mockResolvedValue({
        ...mockPayment,
        status: 'SUCCESS',
      } as any);
      paymentRepository.findSubscriptionByUser.mockResolvedValue(
        mockSubscription as any,
      );
      paymentRepository.upsertSubscription.mockResolvedValue({} as any);

      await service.handlePaymentSuccess('ORDER123');

      expect(paymentRepository.upsertSubscription).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should throw BusinessException if payment not found', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue(null);

      await expect(service.handlePaymentSuccess('ORDER123')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions with pagination', async () => {
      const mockResult = { items: [mockSubscription], total: 1 };
      paymentRepository.findAllSubscriptions.mockResolvedValue(
        mockResult as any,
      );

      const result = await service.getAllSubscriptions(1, 20);

      expect(paymentRepository.findAllSubscriptions).toHaveBeenCalledWith(
        0,
        20,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('grantVipSubscription', () => {
    it('should grant a VIP subscription', async () => {
      paymentRepository.upsertSubscription.mockResolvedValue({} as any);

      const result = await service.grantVipSubscription('user2', 'monthly', 30);

      expect(paymentRepository.upsertSubscription).toHaveBeenCalledWith(
        'user2',
        expect.objectContaining({
          status: 'ACTIVE',
          plan: 'monthly',
          meta: expect.objectContaining({ grantedByAdmin: true }),
        }),
      );
      expect(result.message).toBe('VIP subscription granted');
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue(
        mockPayment as any,
      );
      paymentRepository.updatePayment.mockResolvedValue({
        ...mockPayment,
        status: 'REFUNDED',
      } as any);

      const result = await service.refundPayment('ORDER123');

      expect(paymentRepository.updatePayment).toHaveBeenCalledWith('ORDER123', {
        status: 'REFUNDED',
      });
      expect(result.message).toBe('Payment refunded');
    });

    it('should throw BusinessException if payment not found', async () => {
      paymentRepository.findPaymentByOrderCode.mockResolvedValue(null);

      await expect(service.refundPayment('ORDER123')).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
