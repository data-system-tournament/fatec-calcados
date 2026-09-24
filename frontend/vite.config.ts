import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // O React chama /api/... e o Vite repassa para o Django.
    // No Docker, API_URL aponta para o container do backend (http://backend:8000).
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:8000',
    },
  },
})
