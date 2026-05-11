/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: '@typecall/flow-engine',
        replacement: path.resolve(__dirname, '../../packages/flow-engine/src/index.ts'),
      },
      {
        find: /^@typecall\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/shared/src/$1/index.ts'),
      },
      {
        find: /^@typecall\/shared$/,
        replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  // @ts-expect-error vitest test config injection on Vite 8
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
