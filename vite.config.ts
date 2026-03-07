import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/geocoding': {
        target: 'http://localhost:2322',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geocoding/, ''),
      },
    },
  },
})
