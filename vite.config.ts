import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ReFlow---PDF-Editor-Pro/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
