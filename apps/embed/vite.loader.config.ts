import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'dist/loader',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/loader/index.ts'),
      name: 'TypeCall',
      formats: ['iife'],
      fileName: () => 'loader.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'esbuild',
  },
})
