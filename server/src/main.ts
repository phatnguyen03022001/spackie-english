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
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Sử dụng pino logger thay cho logger mặc định
  app.useLogger(app.get(Logger));

  // Global Interceptors
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new LoggerErrorInterceptor(),
  );

  // Global Filter: Format mọi response lỗi theo chuẩn ApiResponseDto
  app.useGlobalFilters(new HttpExceptionFilter());

  // 2. Sử dụng GlobalValidationPipe từ common thay vì tạo mới
  // Điều này đảm bảo lỗi validate sẽ trả về đúng format { property, message }
  app.useGlobalPipes(GlobalValidationPipe);

  const config = app.get(ConfigService);

  // 3. Đồng bộ Global Prefix từ config
  const prefix = config.get<string>('app.prefix') || 'api';
  app.setGlobalPrefix(prefix, {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET }, // Thường có thêm check health cho OTEL/Docker
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs/(.*)', method: RequestMethod.ALL },
    ],
  });

  // 4. Đồng bộ CORS
  app.enableCors({
    origin: config.get<string | string[]>('cors.origin'),
    credentials: true, // Thường cần thiết khi làm việc với Cookie/NextJS
  });

  const configService = app.get(ConfigService);

  const isSwaggerEnabled = configService.get<boolean>('swagger.enabled');
  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title') || 'My API')
      .setDescription(
        configService.get<string>('swagger.description') || 'API Description',
      )
      .setVersion(configService.get<string>('swagger.version') || '1.0')
      .addBearerAuth() // Nếu bạn có dùng JWT auth
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = configService.get<string>('swagger.path') || 'docs';

    SwaggerModule.setup(swaggerPath, app, document);
  }

  const port = config.get<number>('app.port') || 8000;
  await app.listen(port);

  console.log(`🚀 Server is running on: http://localhost:${port}/${prefix}`);
  console.log(`📝 Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();
