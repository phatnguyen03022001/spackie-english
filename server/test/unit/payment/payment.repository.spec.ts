import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRepository } from '@modules/payment/payment.repository';
import { PrismaService } from '@database/prisma.service';

describe('PaymentRepository', () => {
  let repository: PaymentRepository;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PaymentRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment record', async () => {
      const data = {
        userId: 'user1',
        orderCode: 'ORDER123',
        amount: 99000,
        status: 'PENDING' as const,
        plan: 'monthly',
        durationDays: 30,
      };
      const expected = { id: 'payment1', ...data };
      mockPrisma.payment.create.mockResolvedValue(expected);

      const result = await repository.createPayment(data);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(expected);
    });
  });

  describe('findPaymentByOrderCode', () => {
    it('should find payment by orderCode', async () => {
      const expected = {
        id: 'payment1',
        orderCode: 'ORDER123',
        status: 'PENDING',
      };
      mockPrisma.payment.findUnique.mockResolvedValue(expected);

      const result = await repository.findPaymentByOrderCode('ORDER123');

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { orderCode: 'ORDER123' },
      });
      expect(result).toEqual(expected);
    });

    it('should return null if not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const result = await repository.findPaymentByOrderCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePayment', () => {
    it('should update payment by orderCode', async () => {
      const data = { status: 'SUCCESS' as const };
      const expected = {
        id: 'payment1',
        orderCode: 'ORDER123',
        status: 'SUCCESS' as const,
      };
      mockPrisma.payment.update.mockResolvedValue(expected);

      const result = await repository.updatePayment('ORDER123', data);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderCode: 'ORDER123' },
        data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findPaymentsByUser', () => {
    it('should return paginated payments for user', async () => {
      const items = [{ id: 'payment1', orderCode: 'ORDER123' }];
      mockPrisma.payment.findMany.mockResolvedValue(items);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await repository.findPaymentsByUser('user1', 0, 10);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.payment.count).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(result).toEqual({ items, total: 1 });
    });
  });

  describe('findSubscriptionByUser', () => {
    it('should find subscription by userId', async () => {
      const expected = {
        id: 'sub1',
        userId: 'user1',
        status: 'ACTIVE',
        plan: 'monthly',
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(expected);

      const result = await repository.findSubscriptionByUser('user1');

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(result).toEqual(expected);
    });

    it('should return null if no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await repository.findSubscriptionByUser('user1');

      expect(result).toBeNull();
    });
  });

  describe('upsertSubscription', () => {
    it('should upsert a subscription', async () => {
      const data = {
        userId: 'user1',
        status: 'ACTIVE',
        plan: 'monthly',
        startedAt: new Date(),
        expiresAt: new Date(),
        meta: { autoRenew: true },
      };
      const expected = { id: 'sub1', ...data };
      mockPrisma.subscription.upsert.mockResolvedValue(expected);

      const result = await repository.upsertSubscription('user1', data as any);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        create: data,
        update: data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findAllSubscriptions', () => {
    it('should return all subscriptions with pagination', async () => {
      const items = [
        {
          id: 'sub1',
          userId: 'user1',
          user: { id: 'user1', email: 'test@test.com', displayName: 'Test' },
        },
      ];
      mockPrisma.subscription.findMany.mockResolvedValue(items);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await repository.findAllSubscriptions(0, 20);

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      });
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith();
      expect(result).toEqual({ items, total: 1 });
    });
  });
});
