// src/modules/users/mappers/user.mapper.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserMapper {
  toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  toResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponseDto(user));
  }
}
