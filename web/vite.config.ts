/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.ARC_WEB_PORT ?? 3003),
    proxy: {
      '/api': `http://localhost:${process.env.ARC_DEV_PORT ?? 8003}`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
