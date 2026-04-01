import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

class EnvSchema {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  APP_NAME: string;

  @IsNumber()
  APP_PORT: number;

  @IsString()
  API_PREFIX: string;

  // Database
  @IsString()
  DATABASE_URL: string;

  // JWT & Auth
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

  // Redis (Upstash)
  @IsUrl({ require_tld: false })
  UPSTASH_REDIS_REST_URL: string;

  @IsString()
  UPSTASH_REDIS_REST_TOKEN: string;

  // Mail (Brevo)
  @IsString()
  BREVO_API_KEY: string;

  @IsEmail()
  EMAIL_FROM: string;

  @IsString()
  EMAIL_FROM_NAME: string;

  // Cloudinary
  @IsString()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  CLOUDINARY_API_KEY: string;

  @IsString()
  CLOUDINARY_API_SECRET: string;

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

  // Logger (Nếu bạn muốn quản lý level qua .env)
  @IsOptional()
  @IsString()
  PINO_LOG_LEVEL?: string;

  // OTEL (Nên thêm các biến này nếu otel.config.ts có dùng)
  @IsOptional()
  @IsString()
  OTEL_SERVICE_NAME?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  OTEL_EXPORTER_OTLP_HEADERS?: string;

  @IsOptional()
  @IsString()
  OTEL_LOG_LEVEL?: string;

  // Others
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = error.constraints
        ? Object.values(error.constraints).join(', ')
        : `Invalid ${error.property}`;
      return `[${error.property}]: ${constraints}`;
    });

    throw new Error(`❌ Config validation error:\n${errorMessages.join('\n')}`);
  }

  return validatedConfig;
}
