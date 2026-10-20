import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Chỉ cho phép domain cố định của Smart Clinic truy cập Vite qua Cloudflare Tunnel.
  server: {
    host: '0.0.0.0',
    allowedHosts: ['smartclinic.io.vn'],
    // Chuyển tiếp API và Socket về Backend local khi truy cập qua domain chính.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
