import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      globals: {
        console: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-throw-literal': 'off',
      'valid-jsdoc': 'off',
      'sort-keys': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/no-array-constructor': 'off',
      'import/no-internal-modules': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      'no-bitwise': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      // Disable no-undef for TypeScript files - TypeScript handles this better
      // and it doesn't recognize ambient type declarations from .d.ts files
      'no-undef': 'off',
    },
  },
  // Jest test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
  },
  // Jest setup files
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: {
        global: 'readonly',
        HTMLCanvasElement: 'readonly',
      },
    },
  },
  eslintPluginPrettierRecommended,
]
