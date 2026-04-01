import './instrument';
import 'dotenv/config';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { GlobalValidationPipe } from '@/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn'],
  });

  app.enableShutdownHooks();

  app.set('trust proxy', 1);

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(GlobalValidationPipe);

  const configService = app.get(ConfigService);

  // prefix
  const prefix = configService.get<string>('app.prefix') || 'api';
  app.setGlobalPrefix(prefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // swagger
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

    SwaggerModule.setup(swaggerPath, app, document, {
      useGlobalPrefix: true,
    });
  }

  // cors
  app.enableCors({
    origin: configService.get<string | string[]>('cors.origin') ?? true,
    credentials: true,
  });

  const port = configService.get<number>('app.port') || 8000;
  await app.listen(port);

  // logging
  const env = configService.get<string>('app.env') || 'development';
  const url = `http://localhost:${port}`;
  const swaggerUrl = `${url}/${prefix}/${swaggerPath}`;
  const uptime = (process.uptime() * 1000).toFixed(0);

  logger.log('─'.repeat(50));
  logger.log(
    {
      event: 'BOOTSTRAP',
      environment: env,
      port,
      prefix,
      uptime: `${uptime}ms`,
    },
    'NestApplication',
  );
  logger.log('─'.repeat(50));

  logger.log(`🚀 Spackie API    : ${url}/${prefix}`);
  if (isSwaggerEnabled) {
    logger.log(`📝 Swagger UI     : ${swaggerUrl}`);
    logger.log(`📂 Swagger JSON   : ${swaggerUrl}-json`);
  }
  logger.log(`🛠️  Environment    : ${env.toUpperCase()}`);
  logger.log('─'.repeat(50));
}

void bootstrap();
