import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { loadCanal, loadSite, loadLanding } from './entries.js';
import { watchShareMeta } from './v2/site/origin.js';
// Tipografía: Manrope variable, alojada en el mismo sitio. La carga V2Layout (la usan todas las páginas)

// Sentry solo se carga si hay un DSN configurado, y nunca en el canal de denuncias: allí no debe
// llegar ningún dato de la página (direcciones, textos de error) a un tercero
const DSN = import.meta.env.VITE_SENTRY_DSN;
if (DSN && !window.location.pathname.startsWith('/canal')) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
      // Sin rastro de peticiones ni de consola: pueden llevar identificadores de denuncias
      beforeBreadcrumb: (b) => (['fetch', 'xhr', 'console', 'navigation'].includes(b.category) ? null : b),
      // Si se ha entrado por el acceso y después se pasa al canal sin recargar, Sentry ya está en la página:
      // todo lo que pase en el canal se descarta, y no se cuentan sesiones (llevan la IP)
      beforeSend: (e) => (window.location.pathname.startsWith('/canal') ? null : e),
      beforeSendTransaction: (e) => (window.location.pathname.startsWith('/canal') ? null : e),
      integrations: (all) => all.filter(i => i.name !== 'BrowserSession'),
    });
  });
}

// La parte de la página de entrada se empieza a bajar ya, en paralelo con React
{
  const path = window.location.pathname;
  const quiet = (p) => p.catch(() => {});
  if (path.startsWith('/canal/')) quiet(loadCanal());
  else if (!path.startsWith('/admin') && !path.startsWith('/dev')) { quiet(loadSite()); if (path === '/') quiet(loadLanding()); }
}

// La vista previa al compartir un enlace sigue el idioma y el título de la página
watchShareMeta();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
