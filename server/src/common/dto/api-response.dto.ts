// src/common/dto/api-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;

  constructor(
    data: T | null,
    message: string,
    statusCode: number = 200,
    success: boolean = true,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>(data, message, statusCode, true);
  }

  static error(
    message: string = 'Error',
    statusCode: number = 400,
  ): ApiResponseDto<null> {
    return new ApiResponseDto<null>(null, message, statusCode, false);
  }
}
