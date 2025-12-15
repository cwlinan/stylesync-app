import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: './', // 確保 GitHub Pages 子路徑路徑正確
    define: {
      // 這是關鍵：我們將編譯時期的環境變數 (VITE_API_KEY) 
      // 注入到程式碼中的 process.env.API_KEY
      // 這樣就能符合 SDK 的規範，同時在 GitHub Pages 上運作
      'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || env.VITE_API_KEY)
    }
  }
})