// src/common/dto/error-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ErrorDetailDto {
  @ApiProperty({ example: 'USER_NOT_FOUND' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'User not found' })
  @Expose()
  message: string;

  @ApiProperty({ required: false })
  @Expose()
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    this.code = code;
    this.message = message;
    this.details = details ?? null;
  }
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  @Expose()
  // Sửa lỗi prefer-as-const: dùng readonly và gán giá trị trực tiếp
  readonly success = false as const;

  @ApiProperty({ example: 404 })
  @Expose()
  statusCode: number;

  @ApiProperty({ type: ErrorDetailDto })
  @Expose()
  @Type(() => ErrorDetailDto)
  error: ErrorDetailDto;

  @ApiProperty({ example: '/api/v1/users/123' })
  @Expose()
  path: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  timestamp: string;

  constructor(
    statusCode: number,
    errorCode: string,
    errorMessage: string,
    path: string,
    details?: unknown,
  ) {
    this.statusCode = statusCode;
    this.path = path;
    this.timestamp = new Date().toISOString();
    // Khởi tạo instance rõ ràng (Explicit over implicit - Mục 2)
    this.error = new ErrorDetailDto(errorCode, errorMessage, details);
  }
}
