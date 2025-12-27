import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  base: '/tower-defense/',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})