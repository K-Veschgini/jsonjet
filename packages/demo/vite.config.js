
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['@monaco-editor/react', 'monaco-editor']
        }
      }
    }
  },
  define: {
    // Provide fallbacks for missing browser APIs
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@monaco-editor/react', 'monaco-editor']
  }
})
