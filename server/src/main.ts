import './instrument';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

import { AppModule } from './app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { GlobalValidationPipe } from '@/common/pipes/validation.pipe'; // 1. Import pipe đã custom
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = app.get(Logger);
  app.useLogger(app.get(Logger));

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new LoggerErrorInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(GlobalValidationPipe);

  const configService = app.get(ConfigService);

  // 1. Setup Swagger TRƯỚC khi setGlobalPrefix
  const isSwaggerEnabled = configService.get<boolean>('swagger.enabled');
  const swaggerPath = configService.get<string>('swagger.path') || 'docs';

  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title') || 'Spackie API')
      .setDescription(
        configService.get<string>('swagger.description') || 'API Description',
      )
      .setVersion(configService.get<string>('swagger.version') || '1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  // 2. Setup Global Prefix với cách viết route mới
  const prefix = configService.get<string>('app.prefix') || 'api';
  app.setGlobalPrefix(prefix, {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      // Sửa lỗi cảnh báo: sử dụng cú pháp route mới cho path-to-regexp
      { path: swaggerPath, method: RequestMethod.ALL },
      { path: `${swaggerPath}/(.*)`, method: RequestMethod.ALL },
    ],
  });

  // 3. CORS
  app.enableCors({
    origin: configService.get<string | string[]>('cors.origin'),
    credentials: true,
  });

  const port = configService.get<number>('app.port') || 8000;
  await app.listen(port);

  const env = configService.get<string>('app.env');

  logger.log('>>> ENV VALUE:', env);

  logger.log(
    `🚀 Server is running on: http://localhost:${port}/${prefix}`,
    'Bootstrap',
  );
  logger.log(
    `📝 Swagger docs: http://localhost:${port}/${swaggerPath}`,
    'Bootstrap',
  );
}

void bootstrap();
