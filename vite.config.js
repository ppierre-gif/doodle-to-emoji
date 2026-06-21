import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `netlify dev`, the Netlify proxy fronts Vite and routes
// /.netlify/functions/* to the local Functions runtime automatically.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
