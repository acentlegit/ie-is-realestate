import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost', // Use localhost to match Keycloak redirect URI
    open: true,
    strictPort: false, // Allow port fallback if 3000 is taken
    proxy: {
      // When frontend uses /api/intent (e.g. VITE_INTENT_ENGINE_URL=/api/intent), proxy to Intent Engine
      '/api/intent': { target: 'http://localhost:7001', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/intent/, '') },
      '/api/decision': { target: 'http://localhost:7003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/decision/, '') },
      '/api/compliance': { target: 'http://localhost:7002', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/compliance/, '') },
      '/api/action': { target: 'http://localhost:7004', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/action/, '') },
      '/api/risk': { target: 'http://localhost:7005', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/risk/, '') },
      '/api/explainability': { target: 'http://localhost:7006', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/explainability/, '') },
      '/api/evidence': { target: 'http://localhost:7007', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/evidence/, '') },
      // Email service: proxy /api/email -> email backend (default port 7008)
      '/api/email': { target: 'http://localhost:7008', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/email/, '') },
      // Video (LiveKit token): proxy /api/video -> token server so same-origin in dev
      '/api/video': { target: 'http://localhost:3001', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/video/, '') },
      // RERA (data.gov.in): proxy to avoid CORS when calling from browser
      '/api/rera': { target: 'https://api.data.gov.in', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/rera/, '') },
    },
  },
})

