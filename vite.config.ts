/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // В Vitest mode === 'test': нативный Buffer (наследник Uint8Array), иначе tweetnacl в @ton/crypto падает.
      buffer: mode === 'test' ? 'node:buffer' : 'buffer',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/utils/**', 'src/hooks/**', 'src/screens/**'],
      exclude: ['src/**/*.test.*', 'src/test/**'],
    },
  },
}))
