// src/modules/file-manager/mappers/file.mapper.ts

import { Injectable } from '@nestjs/common';
import type { File } from '@prisma/client';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';

@Injectable()
export class FileMapper {
  toResponseDto(file: File): FileResponseDto {
    const dto = new FileResponseDto();
    dto.id = file.id;
    dto.url = file.url;
    dto.publicId = file.publicId;
    dto.resourceType = file.resourceType;
    dto.mimeType = file.mimeType;
    dto.sizeBytes = file.sizeBytes;
    dto.refType = file.refType ?? undefined;
    dto.refId = file.refId ?? undefined;
    dto.createdAt = file.createdAt;
    return dto;
  }
}
