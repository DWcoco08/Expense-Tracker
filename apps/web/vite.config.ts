import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      // Backend chạy riêng qua `wrangler dev` ở :8787 lúc phát triển.
      // Production build đi qua cùng Worker nên không cần proxy.
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
