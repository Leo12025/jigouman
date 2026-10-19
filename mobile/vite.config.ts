import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 家长端 H5（文档 §11.6：移动端优先 H5，可套壳 App / 转小程序）
export default defineConfig({
  plugins: [react()],
  // 生产构建挂到后端 /m 子路径，隔离静态资源(避免与 PC 后台 /assets 冲突)；开发期保持根路径
  base: process.env.NODE_ENV === 'production' ? '/m/' : '/',
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
