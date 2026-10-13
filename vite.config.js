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
    // Nada incrustado en el CSS o el JS como «data:»: la política de seguridad (vercel.json) no deja cargar
    // tipografías así, y Manrope variable trae trozos de menos de 4 KB
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Excel, PDF i Sentry no es fixen en un fragment: així només es descarreguen quan s'usen.
        // Les icones van totes juntes: abans eren desenes d'arxius de menys d'1 KB (una petició per icona)
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/@supabase\//.test(id)) return 'vendor-supabase';
          if (/node_modules\/lucide-react\//.test(id)) return 'icons';
          return undefined;
        },
      },
    },
  },
}));
