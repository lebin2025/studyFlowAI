import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    root: fileURLToPath(new URL('./', import.meta.url)),
    include: ['server/**/*.test.js'],
    setupFiles: ['./server/__tests__/setup.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    restoreMocks: true,
  },
})
