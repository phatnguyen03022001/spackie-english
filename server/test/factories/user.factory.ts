// test/factories/user.factory.ts
import { User, Role, AuthProvider } from '@prisma/client';
import { randomUUID } from 'crypto';

type PartialUser = Partial<User>;

export class UserFactory {
  static create(overrides: PartialUser = {}): User {
    const now = new Date();
    return {
      id: randomUUID(),
      email: `user-${randomUUID().slice(0, 8)}@example.com`,
      username: `user-${randomUUID().slice(0, 8)}`,
      passwordHash: '$2b$10$hashedpassword',
      role: Role.USER,
      provider: AuthProvider.LOCAL,
      providerId: null,
      avatarUrl: null,
      displayName: 'Test User',
      isActive: true,
      isVerified: true,
      isBanned: false,
      settings: {},
      totalCardsLearned: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastStudiedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    } as User;
  }

  static admin(overrides: PartialUser = {}): User {
    return UserFactory.create({
      role: Role.ADMIN,
      email: `admin-${randomUUID().slice(0, 8)}@example.com`,
      ...overrides,
    });
  }

  static unverified(overrides: PartialUser = {}): User {
    return UserFactory.create({
      isVerified: false,
      ...overrides,
    });
  }

  static banned(overrides: PartialUser = {}): User {
    return UserFactory.create({
      isBanned: true,
      ...overrides,
    });
  }

  static deleted(overrides: PartialUser = {}): User {
    return UserFactory.create({
      deletedAt: new Date(),
      isActive: false,
      ...overrides,
    });
  }
}
