import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Fontes e logos precisam virar arquivos (não data-URI) para o @react-pdf conseguir buscá-los.
  assetsInclude: ['**/*.ttf'],
  build: { assetsInlineLimit: 0 },
})
