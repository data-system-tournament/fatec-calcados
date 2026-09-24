import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Feito com IA: o React chama /api/... e o Vite repassa para o Django.
  // No Docker, API_URL aponta para o container do backend (http://backend:8000).
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:8000',
    },
  },
})
