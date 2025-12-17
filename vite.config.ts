import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Prioritize keys in this order:
  // 1. Process environment (system/container)
  // 2. .env files loaded by Vite
  // Support standard VITE_ prefix, but also GOOGLE_API_KEY (AI Studio/IDX default) and generic API_KEY
  const apiKey = process.env.API_KEY || 
                 process.env.VITE_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 env.API_KEY || 
                 env.VITE_API_KEY || 
                 env.GOOGLE_API_KEY;

  return {
    plugins: [react()],
    base: './', // Ensure correct path for GitHub Pages
    define: {
      // Inject the detected API key into the code
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})