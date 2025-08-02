
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  root: 'src',
  build: {
    outDir: '../dist'
  }
})
