import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import chaiFriendly from 'eslint-plugin-chai-friendly';
import cypress from 'eslint-plugin-cypress';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    'cypress/screenshots/**',
    'cypress/videos/**',
    'cypress/downloads/**',
    'cypress.env.json',
  ]),
  {
    files: ['**/*.{js,cjs,mjs,ts}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['*.config.{js,cjs,mjs,ts}', '.prettierrc.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['cypress/**/*.ts'],
    extends: [cypress.configs.recommended],
  },
  {
    files: ['cypress/support/**/*.d.ts'],
    rules: {
      // Declaration files extend Cypress's global Chainable interface.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
  {
    files: ['cypress/e2e/**/*.cy.ts'],
    plugins: { 'no-only-tests': noOnlyTests, 'chai-friendly': chaiFriendly },
    rules: {
      'no-only-tests/no-only-tests': 'error',
      // Replace both unused-expression rules so Chai assertions pass but no-ops fail.
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': 'error',
    },
  },
  prettier,
]);
