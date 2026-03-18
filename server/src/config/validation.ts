import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvSchema {
  @IsString()
  NODE_ENV: string;

  @IsString()
  APP_NAME: string;

  @IsNumber()
  APP_PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsNumber()
  BCRYPT_SALT_ROUNDS: number;

  @IsBoolean()
  SWAGGER_ENABLE: boolean;

  @IsString()
  SWAGGER_PATH: string;

  @IsString()
  SWAGGER_TITLE: string;

  @IsString()
  SWAGGER_DESCRIPTION: string;

  @IsString()
  SWAGGER_VERSION: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validate(config: Record<string, unknown>) {
  // Chuyển đổi plain object sang class instance để class-validator có thể làm việc
  const validatedConfig = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true, // Tự động convert string sang number/boolean
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : `Invalid ${error.property}`;
        return `${error.property}: ${constraints}`;
      })
      .join(' | ');

    throw new Error(`❌ Config validation error: ${messages}`);
  }

  return validatedConfig;
}
