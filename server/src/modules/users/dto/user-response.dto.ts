// src/modules/users/dto/user-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiProperty()
  @Expose()
  username!: string;

  @ApiProperty({ required: false })
  @Expose()
  displayName?: string;

  @ApiProperty({ required: false })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({ enum: ['USER', 'ADMIN'] })
  @Expose()
  role!: string;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  isVerified!: boolean;

  @ApiProperty()
  @Expose()
  isBanned!: boolean;

  @ApiProperty()
  @Expose()
  totalCardsLearned!: number;

  @ApiProperty()
  @Expose()
  currentStreak!: number;

  @ApiProperty()
  @Expose()
  longestStreak!: number;

  @ApiProperty({ nullable: true })
  @Expose()
  lastStudiedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
