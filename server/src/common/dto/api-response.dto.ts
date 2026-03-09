export class ApiResponseDto<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;

  constructor(data: T, statusCode = 200) {
    this.success = true;
    this.statusCode = statusCode;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}
export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
