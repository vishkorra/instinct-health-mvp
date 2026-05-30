import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === '1' && repoName ? `/${repoName}/` : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4177'
    }
  }
});
