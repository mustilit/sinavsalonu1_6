import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Windows'ta localhost → IPv6 (::1) farklı process'e gidebiliyor; IPv4 sabitle
const backendTarget = 'http://127.0.0.1:3000'
const srcPath = path.resolve(__dirname, 'src')

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Sadece proje testlerini topla (node_modules testleri çalışmamalı)
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${srcPath}/$1` },
    ],
  },
  server: {
    port: 5174,
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true },
      '/marketplace': { target: backendTarget, changeOrigin: true },
      '/tests': { target: backendTarget, changeOrigin: true },
      '/site': { target: backendTarget, changeOrigin: true },
      '/me': { target: backendTarget, changeOrigin: true },
      '/admin': { target: backendTarget, changeOrigin: true },
      '/educators': { target: backendTarget, changeOrigin: true },
      '/home': { target: backendTarget, changeOrigin: true },
      '/follows': { target: backendTarget, changeOrigin: true },
      '/objections': { target: backendTarget, changeOrigin: true },
      '/purchases': { target: backendTarget, changeOrigin: true },
      '/attempts': { target: backendTarget, changeOrigin: true },
      '/refunds': { target: backendTarget, changeOrigin: true },
      '/ad-packages': { target: backendTarget, changeOrigin: true },
      '/notifications': { target: backendTarget, changeOrigin: true },
      '/docs': { target: backendTarget, changeOrigin: true },
      '/health': { target: backendTarget, changeOrigin: true },
    },
  },
});