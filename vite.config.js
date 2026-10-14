import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // dice-box carga sus mundos 3D con import() relativos y crea workers: si
  // Vite lo pre-empaqueta en desarrollo, esas rutas dejan de existir.
  optimizeDeps: { exclude: ['@3d-dice/dice-box'] },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa el runtime (react, router, supabase, iconos) del código
        // propio: cambia mucho menos seguido, así que cachea aparte entre
        // despliegues en vez de invalidarse cada vez que se toca una página.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
