export type TranslationFunction = (key: string, values?: Record<string, string | number>) => string;

// Kiểu dữ liệu lỗi chuẩn từ NestJS/Server
export interface ServerError {
  message: string;
  statusCode?: number;
}
