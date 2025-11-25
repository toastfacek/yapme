import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    // Embed production values as fallbacks
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || 'https://nilnwcxpmxyfxxxgcdle.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbG53Y3hwbXh5Znh4eGdjZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0ODA0MTUsImV4cCI6MjA0ODA1NjQxNX0.zOwfWx0VmhtV-NwfJo0Vk7V8Nt8qW8a9dNOdh1GCGfY'
      ),
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        env.VITE_SERVER_URL || 'https://yapme-production.up.railway.app'
      ),
      'import.meta.env.VITE_WS_URL': JSON.stringify(
        env.VITE_WS_URL || 'wss://yapme-production.up.railway.app'
      ),
    },
  }
})
