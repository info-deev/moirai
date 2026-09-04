import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    // Пока тесты не написаны (T7.2), `npm test` остаётся зелёным
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      // Модули E7 (T7.2): покрытие ключевых путей > 80%
      include: [
        'src/utils/graphGeometry.ts',
        'src/utils/serialization.ts',
        'src/stores/familyStore.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
