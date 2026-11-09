import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'supabase/functions/**', 'src/lib/database.types.ts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/**/__tests__/**/*.{js,ts,tsx}', 'src/test/**/*.{js,ts}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.{js,mjs}'],
    ignores: ['src/**'],
    extends: [js.configs.recommended],
    // Config files and scripts run in Node; public/theme-init.js runs in the browser.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['src/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
  },
])
