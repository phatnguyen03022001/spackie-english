import {
  BusinessException,
  AppException,
} from '@common/filters/business.exception';
import { HttpStatus } from '@nestjs/common';

describe('BusinessException', () => {
  describe('BusinessException', () => {
    it('should create exception with status, code, message', () => {
      const exception = new BusinessException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Invalid input',
      );

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      });
    });

    it('should create exception with details', () => {
      const details = { field: 'email', reason: 'already exists' };
      const exception = new BusinessException(
        HttpStatus.CONFLICT,
        'DUPLICATE_EMAIL',
        'Email already exists',
        details,
      );

      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.getResponse()).toEqual({
        code: 'DUPLICATE_EMAIL',
        message: 'Email already exists',
        details,
      });
    });

    it('should handle different HTTP status codes', () => {
      const notFound = new BusinessException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Resource not found',
      );
      expect(notFound.getStatus()).toBe(HttpStatus.NOT_FOUND);

      const forbidden = new BusinessException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Access denied',
      );
      expect(forbidden.getStatus()).toBe(HttpStatus.FORBIDDEN);

      const tooMany = new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT',
        'Too many requests',
      );
      expect(tooMany.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  describe('AppException', () => {
    it('should extend BusinessException', () => {
      const exception = new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'APP_ERROR',
        'Application error',
      );

      expect(exception).toBeInstanceOf(BusinessException);
      expect(exception).toBeInstanceOf(Error);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
