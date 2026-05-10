// src/modules/users/use-cases/update-avatar.use-case.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { UsersService } from '@modules/users/users.service';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { BusinessException } from '@common/filters/business.exception';

@Injectable()
export class UpdateAvatarUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'FILE_MISSING',
        'No file uploaded',
      );
    }

    return this.usersService.updateAvatar(
      userId,
      file.buffer,
      file.originalname,
    );
  }
}
