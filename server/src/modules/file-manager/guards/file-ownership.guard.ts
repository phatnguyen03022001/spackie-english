// src/modules/file-manager/guards/file-ownership.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { BusinessException } from '@common/filters/business.exception';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';
import type { RequestUser } from '@common/interfaces/request-user.interface';

@Injectable()
export class FileOwnershipGuard implements CanActivate {
  constructor(private readonly fileRepository: FileManagerRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: RequestUser;
      params: { fileId?: string };
    }>();
    const user = request.user;
    const fileId = request.params.fileId;

    if (!fileId) return true;

    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        FILE_ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
      );
    }

    // Admin can access any file
    if (user.role === 'ADMIN') return true;

    if (file.userId !== user.id) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        FILE_ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
      );
    }

    return true;
  }
}
