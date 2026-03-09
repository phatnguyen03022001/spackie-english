import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

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
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length) {
    throw new Error(errors.toString());
  }

  return validated;
}
