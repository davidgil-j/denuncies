import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Adreça pública del lloc. WhatsApp i LinkedIn no executen JavaScript i demanen una adreça absoluta a og:image,
// així que es posa a l'index.html en compilar. El mateix valor per defecte que a src/v2/site/origin.js.
const publicOrigin = (mode) => (loadEnv(mode, process.cwd(), 'VITE_').VITE_PUBLIC_ORIGIN || 'https://reportia-canal.vercel.app').replace(/\/+$/, '');

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    { name: 'reportia-public-origin', transformIndexHtml: html => html.replaceAll('__PUBLIC_ORIGIN__', publicOrigin(mode)) },
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Excel, PDF i Sentry no es fixen en un fragment: així només es descarreguen quan s'usen
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
