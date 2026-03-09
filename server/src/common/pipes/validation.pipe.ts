import { ValidationPipe, BadRequestException } from '@nestjs/common';

export const GlobalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    const result = errors.map((error) => ({
      property: error.property,
      message: error.constraints
        ? Object.values(error.constraints)[0]
        : 'Invalid value',
    }));
    return new BadRequestException(result);
  },
});
