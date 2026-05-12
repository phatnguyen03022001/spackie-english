import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentController,
  AdminPaymentController,
} from '@modules/payment/payment.controller';
import { PaymentService } from '@modules/payment/payment.service';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let adminController: AdminPaymentController;
  let service: jest.Mocked<PaymentService>;

  beforeEach(async () => {
    const mockService = {
      createPayment: jest.fn(),
      getPaymentHistory: jest.fn(),
      getSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      getAllSubscriptions: jest.fn(),
      grantVipSubscription: jest.fn(),
      refundPayment: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController, AdminPaymentController],
      providers: [
        { provide: PaymentService, useValue: mockService },
        {
          provide: 'ICacheManager',
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          },
        },
        IdempotencyInterceptor,
      ],
    }).compile();

    controller = module.get(PaymentController);
    adminController = module.get(AdminPaymentController);
    service = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should call service.createPayment with userId, plan, and amount', async () => {
      const expectedResult = {
        orderCode: 'ORDER123',
        checkoutUrl: 'https://payos.example.com/checkout/ORDER123',
      };
      service.createPayment.mockResolvedValue(expectedResult);

      const result = await controller.createPayment('user1', 'monthly', 99000);

      expect(service.createPayment).toHaveBeenCalledWith(
        'user1',
        'monthly',
        99000,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getHistory', () => {
    it('should call service.getPaymentHistory with userId and default pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getPaymentHistory.mockResolvedValue(expectedResult);

      const result = await controller.getHistory('user1');

      expect(service.getPaymentHistory).toHaveBeenCalledWith('user1', 1, 10);
      expect(result).toEqual(expectedResult);
    });

    it('should call service.getPaymentHistory with custom pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getPaymentHistory.mockResolvedValue(expectedResult);

      const result = await controller.getHistory('user1', 2, 20);

      expect(service.getPaymentHistory).toHaveBeenCalledWith('user1', 2, 20);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getSubscription', () => {
    it('should call service.getSubscription with userId', async () => {
      const expectedResult = {
        status: 'ACTIVE',
        plan: 'monthly',
        startedAt: new Date('2026-05-11'),
        expiresAt: new Date('2026-06-11'),
        autoRenew: true,
      };
      service.getSubscription.mockResolvedValue(expectedResult);

      const result = await controller.getSubscription('user1');

      expect(service.getSubscription).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('cancelSubscription', () => {
    it('should call service.cancelSubscription with userId', async () => {
      const expectedResult = { message: 'Auto-renewal cancelled' };
      service.cancelSubscription.mockResolvedValue(expectedResult);

      const result = await controller.cancelSubscription('user1');

      expect(service.cancelSubscription).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('AdminPaymentController', () => {
  let adminController: AdminPaymentController;
  let service: jest.Mocked<PaymentService>;

  beforeEach(async () => {
    const mockService = {
      getAllSubscriptions: jest.fn(),
      grantVipSubscription: jest.fn(),
      refundPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPaymentController],
      providers: [{ provide: PaymentService, useValue: mockService }],
    }).compile();

    adminController = module.get(AdminPaymentController);
    service = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSubscriptions', () => {
    it('should call service.getAllSubscriptions with default pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getAllSubscriptions.mockResolvedValue(expectedResult);

      const result = await adminController.getAllSubscriptions();

      expect(service.getAllSubscriptions).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(expectedResult);
    });

    it('should call service.getAllSubscriptions with custom pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getAllSubscriptions.mockResolvedValue(expectedResult);

      const result = await adminController.getAllSubscriptions(2, 20);

      expect(service.getAllSubscriptions).toHaveBeenCalledWith(2, 20);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('grantVip', () => {
    it('should call service.grantVipSubscription with userId, plan, and durationDays', async () => {
      const expectedResult = { message: 'VIP subscription granted' };
      service.grantVipSubscription.mockResolvedValue(expectedResult);

      const result = await adminController.grantVip('user2', 'monthly', 30);

      expect(service.grantVipSubscription).toHaveBeenCalledWith(
        'user2',
        'monthly',
        30,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refundPayment', () => {
    it('should call service.refundPayment with paymentId', async () => {
      const expectedResult = { message: 'Payment refunded' };
      service.refundPayment.mockResolvedValue(expectedResult);

      const result = await adminController.refundPayment('payment1');

      expect(service.refundPayment).toHaveBeenCalledWith('payment1');
      expect(result).toEqual(expectedResult);
    });
  });
});
