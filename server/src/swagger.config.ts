// src/swagger.config.ts
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { PaginationResponseDto } from '@common/dto/pagination-response.dto';

export function setupSwagger(
  app: INestApplication,
  options: {
    title: string;
    description: string;
    version: string;
    path: string;
    prefix: string;
  },
) {
  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version)
    .addBearerAuth()
    .addServer(`/${options.prefix}`)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto, SuccessResponseDto, PaginationResponseDto],
  });

  // Ensure ErrorResponseDto schema is in components for $ref references
  if (!document.components?.schemas?.['ErrorResponseDto']) {
    document.components = {
      ...document.components,
      schemas: {
        ...document.components?.schemas,
        ErrorResponseDto: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'number', example: 400 },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: {
                  type: 'string',
                  example: 'Validation failed',
                },
                details: {
                  type: 'object',
                  additionalProperties: true,
                  nullable: true,
                },
              },
              required: ['code', 'message'],
            },
            path: { type: 'string', example: '/api/v1/users' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['success', 'statusCode', 'error', 'path', 'timestamp'],
        },
      },
    };
  }

  SwaggerModule.setup(`${options.prefix}/${options.path}`, app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
