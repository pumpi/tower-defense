import { defineConfig } from 'vite'
import packageJson from './package.json'

export default defineConfig({
  root: 'src',
  base: '/tower-defense/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})