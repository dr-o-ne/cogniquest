import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, so that build has to know
  // its prefix; CI sets BASE_PATH. Everything else — dev, preview, and the
  // Electron package later on — runs at the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // The core (src/core) does not depend on a browser — tests run in node, fast.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
