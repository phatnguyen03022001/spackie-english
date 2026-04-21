// src/common/constants/app.constant.ts

export const APP_CONSTANTS = {
  APP_NAME: 'NestJS Server',
  API_PREFIX: 'api',

  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  PASSWORD_SALT_ROUNDS: 10,

  JWT: {
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;
