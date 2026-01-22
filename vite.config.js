import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost', // Use localhost to match Keycloak redirect URI
    open: true,
    strictPort: false // Allow port fallback if 3000 is taken
  }
})

