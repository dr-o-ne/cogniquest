import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // The core (src/core) does not depend on a browser — tests run in node, fast.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
