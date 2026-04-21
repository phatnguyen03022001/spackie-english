import './instrument';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { LoggerService } from './common/logger/logger.service';

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

  const loggerService = await app.resolve(LoggerService);
  app.useGlobalFilters(new HttpExceptionFilter(loggerService));
  app.useGlobalPipes(GlobalValidationPipe);

  const configService = app.get(ConfigService);

  app.use(helmet());

  const prefix = configService.get<string>('app.prefix') ?? 'api';
  app.setGlobalPrefix(prefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // Swagger
  const isSwaggerEnabled =
    configService.get<boolean>('app.swagger.enable') ?? false;
  const swaggerPath = configService.get<string>('app.swagger.path') ?? 'docs';

  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('app.swagger.title') ?? 'Spackie API')
      .setDescription(
        configService.get<string>('app.swagger.description') ??
          'API Description',
      )
      .setVersion(configService.get<string>('app.swagger.version') ?? '1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      useGlobalPrefix: true,
    });
  }

  // CORS
  const allowedOrigins =
    configService.get<string[]>('app.cors.allowedOrigins') ?? [];
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const frontendStagingUrl = configService.get<string>(
    'app.frontendStagingUrl',
  );
  const vercelTeamSlug = configService.get<string>('app.vercelTeamSlug');

  const pusherAppId = configService.get<string>('pusher.appId');
  const pusherKey = configService.get<string>('pusher.key');
  const pusherSecret = configService.get<string>('pusher.secret');

  if (pusherAppId && pusherKey && pusherSecret) {
    logger.log('✅ Pusher configured for realtime events');
  } else {
    logger.warn('❌ Pusher credentials missing, realtime features disabled');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        ...allowedOrigins,
        frontendUrl,
        frontendStagingUrl,
      ].filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);
      if (
        vercelTeamSlug &&
        new RegExp(`^https://.*-${vercelTeamSlug}\\.vercel\\.app$`).test(origin)
      ) {
        return callback(null, true);
      }
      if (
        process.env.NODE_ENV === 'development' &&
        origin.startsWith('http://localhost')
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  const port = configService.get<number>('app.port') ?? 8000;
  await app.listen(port);

  const env = configService.get<string>('app.env') ?? 'development';
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
  if (isSwaggerEnabled) logger.log(`📝 Swagger UI     : ${swaggerUrl}`);
  logger.log(`🛠️  Environment    : ${env.toUpperCase()}`);
  logger.log('─'.repeat(50));
}

void bootstrap();
