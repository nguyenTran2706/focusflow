/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../../',
  clearScreen: false,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Suppress noisy ECONNREFUSED logs when the API isn't ready yet
            console.warn(`[vite proxy] API unavailable – ${(err as NodeJS.ErrnoException).code ?? err.message}`)
            if (res && 'writeHead' in res && !res.headersSent) {
              ;(res as import('http').ServerResponse).writeHead(503, { 'Content-Type': 'application/json' })
              ;(res as import('http').ServerResponse).end(
                JSON.stringify({ message: 'API server is not ready yet. Please wait and retry.' }),
              )
            }
          })
        },
      },
    },
  },
})
