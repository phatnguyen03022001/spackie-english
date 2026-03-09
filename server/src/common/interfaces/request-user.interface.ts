import type { User } from '@shared/generated/prisma-client';

export type RequestUser = Omit<User, 'createdAt'>;
