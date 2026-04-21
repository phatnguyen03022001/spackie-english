// src/modules/users/use-cases/update-avatar.use-case.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { AppException } from '../../../common/filters/app-exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.const';

@Injectable()
export class UpdateAvatarUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'FILE_MISSING',
        'No file uploaded',
      );
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
        'Only JPEG, PNG, WEBP images are allowed',
      );
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.FILE_TOO_LARGE,
        'File size exceeds 5MB limit',
      );
    }

    return this.usersService.updateAvatar(
      userId,
      file.buffer,
      file.originalname,
    );
  }
}
