import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  define: {
    'process.env': '{}',
    'process.platform': '"browser"',
    'process.version': '"v18.0.0"',
    'process.browser': 'true',
    'global': 'window',
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 5000,
  },
  optimizeDeps: {
    include: ['xlsx'],
  },
})
