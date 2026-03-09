// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'eslint.config.mjs',
      'prisma.config.ts',
    ],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  prettierRecommended,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },

      sourceType: 'commonjs',

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  {
    rules: {
      /*
      Typescript
      */

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'error',

      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      /*
      General
      */

      'no-console': 'warn',

      /*
      Prettier
      */

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },
);
