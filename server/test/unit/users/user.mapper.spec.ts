import { UserMapper } from '@modules/users/mappers/user.mapper';
import { User } from '@prisma/client';

describe('UserMapper', () => {
  let mapper: UserMapper;

  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: 'hashed-password',
    role: 'USER' as any,
    provider: 'LOCAL' as any,
    providerId: null,
    avatarUrl: 'https://example.com/avatar.jpg',
    isActive: true,
    isVerified: true,
    isBanned: false,
    settings: {},
    totalCardsLearned: 10,
    currentStreak: 3,
    longestStreak: 5,
    lastStudiedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    twoFactorSecret: null,
    twoFactorEnabled: false,
    recoveryCodes: [],
    deletedAt: null,
  };

  beforeEach(() => {
    mapper = new UserMapper();
  });

  describe('toResponseDto', () => {
    it('should map User to UserResponseDto with only exposed fields', () => {
      const result = mapper.toResponseDto(mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('user1');
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(result.isActive).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.isBanned).toBe(false);
      expect(result.totalCardsLearned).toBe(10);
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(5);
      expect(result.lastStudiedAt).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should exclude sensitive fields like passwordHash', () => {
      const result = mapper.toResponseDto(mockUser);

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should exclude internal fields like deletedAt', () => {
      const result = mapper.toResponseDto(mockUser);

      expect((result as any).deletedAt).toBeUndefined();
    });

    it('should handle null optional fields', () => {
      const userWithNulls: User = {
        ...mockUser,
        avatarUrl: null,
        displayName: null,
        lastStudiedAt: null,
      };

      const result = mapper.toResponseDto(userWithNulls);

      expect(result.avatarUrl).toBeNull();
      expect(result.displayName).toBeNull();
      expect(result.lastStudiedAt).toBeNull();
    });
  });

  describe('toResponseDtoList', () => {
    it('should map array of Users to array of UserResponseDto', () => {
      const users: User[] = [
        mockUser,
        {
          ...mockUser,
          id: 'user2',
          email: 'user2@example.com',
          username: 'user2',
        },
      ];

      const result = mapper.toResponseDtoList(users);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user1');
      expect(result[1].id).toBe('user2');
      expect(result[1].email).toBe('user2@example.com');
    });

    it('should return empty array for empty input', () => {
      const result = mapper.toResponseDtoList([]);
      expect(result).toEqual([]);
    });
  });
});
