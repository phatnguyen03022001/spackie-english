import type { User } from '@prisma/client';

export type RequestUser = {
  id: User['id'];
  email: User['email'];
  role: User['role'];
  name?: User['name'];
  isVerified?: User['isVerified'];
};
