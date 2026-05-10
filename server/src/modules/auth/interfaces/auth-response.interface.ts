// src/modules/auth/interfaces/auth-response.interface.ts
import type { UserResponseDto } from '@modules/users/dto/user-response.dto';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthLoginResponse extends AuthTokensResponse {
  user: UserResponseDto;
}
