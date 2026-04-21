// src/common/interfaces/request-user.interface.ts
import type { User } from '@prisma/client';

export type RequestUser = {
  id: User['id'];
  email: User['email'];
  role: User['role'];
  username?: User['username'];
  isVerified?: User['isVerified'];
  iat?: number;
  exp?: number;
};
