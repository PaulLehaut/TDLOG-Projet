import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Si Vite voit une requête qui commence par '/api'...
      '/api': {
        // ...il la redirige vers ton serveur Flask
        target: 'http://127.0.0.1:5000',
        changeOrigin: true, // Requis
      }
    }
  }
})
