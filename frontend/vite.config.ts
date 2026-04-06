import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/') ||
            id.includes('react-dom') ||
            id.includes('react-router')
          ) {
            return 'vendor-react'
          }

          if (id.includes('recharts')) {
            return 'vendor-charts'
          }

          if (id.includes('react-icons')) {
            return 'vendor-icons'
          }

          if (id.includes('axios')) {
            return 'vendor-http'
          }

          return undefined
        },
      },
    },
  },
})
