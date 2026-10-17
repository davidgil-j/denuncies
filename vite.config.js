import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dirección pública del sitio. WhatsApp y LinkedIn no ejecutan JavaScript y piden una dirección absoluta en og:image,
// así que se pone en el index.html al compilar. El mismo valor por defecto que en src/v2/site/origin.js.
const publicOrigin = (mode) => (loadEnv(mode, process.cwd(), 'VITE_').VITE_PUBLIC_ORIGIN || 'https://reportia-canal.vercel.app').replace(/\/+$/, '');

// La dirección de Supabase, para abrir la conexión mientras aún se descarga el JavaScript: el canal no espera
// después a negociarla para pedir los datos de la empresa. Sin credenciales (modo demo) no se añade nada.
const supabaseOrigin = (mode) => { try { return new URL(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL).origin; } catch { return ''; } };
const preconnect = (mode) => (supabaseOrigin(mode) ? `<link rel="preconnect" href="${supabaseOrigin(mode)}" crossorigin />` : '');

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    { name: 'reportia-public-origin', transformIndexHtml: html => html.replaceAll('__PUBLIC_ORIGIN__', publicOrigin(mode)).replace('<!-- __SUPABASE_PRECONNECT__ -->', preconnect(mode)) },
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
      // Dos páginas de entrada con la misma aplicación: la de siempre y la del canal de cada empresa (canal.html), que
      // no lleva la marca de Reportia en la pestaña ni en la vista previa al compartir. vercel.json sirve /canal/* con ella
      input: { main: 'index.html', canal: 'canal.html' },
      output: {
        // Excel, PDF y Sentry no se fijan en un fragmento: así solo se descargan cuando se usan.
        // Los iconos van todos juntos: antes eran decenas de archivos de menos de 1 KB (una petición por icono)
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
