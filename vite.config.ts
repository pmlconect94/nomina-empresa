import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Usa el PORT asignado (preview/CI); si no hay, 5173 para `npm run dev` manual.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    open: false,
  },
});
