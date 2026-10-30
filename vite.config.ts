import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa bibliotecas pesadas em chunks próprios, melhorando cache entre deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (/node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|recharts-scale)[\\/]/.test(id)) return 'charts'
          if (id.includes('lucide-react')) return 'icons'
          return undefined
        },
      },
    },
  },
})
