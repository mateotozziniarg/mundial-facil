import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Repo name — necesario para que los assets carguen en GitHub Pages
  base: '/mundial-facil/',
  plugins: [react(), tailwindcss()],
})
