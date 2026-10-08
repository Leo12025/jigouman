import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 家长端 H5（文档 §11.6：移动端优先 H5，可套壳 App / 转小程序）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
