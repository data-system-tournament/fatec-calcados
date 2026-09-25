import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Feito com IA: o React chama /api/... e o Vite repassa para o Django.
  // No Docker, API_URL aponta para o container do backend (http://backend:8000).
  // Fora dele o padrão é 127.0.0.1 e não localhost: no Windows o localhost vira ::1 (IPv6), que passa
  // pelo wslrelay do Docker Desktop e deixa a requisição pendurada sem resposta.
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://127.0.0.1:8000',
    },
  },
})
