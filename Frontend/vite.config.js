import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy only versioned API calls, preventing collision with frontend routes like /api-keys
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
