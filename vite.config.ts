import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 這是關鍵設定，讓部署到 GitHub Pages (子路徑) 時能找到資源
  base: './', 
})