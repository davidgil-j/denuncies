import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { loadCanal, loadSite, loadLanding } from './entries.js';
import { watchShareMeta } from './v2/site/origin.js';
// Tipografia: Manrope variable, allotjada al mateix lloc. La carrega V2Layout (la fan servir totes les pàgines)

// Sentry només es carrega si hi ha DSN configurat, i mai al canal de denúncies: allà no ha
// d'arribar cap dada de la pàgina (adreces, textos d'error) a un tercer
const DSN = import.meta.env.VITE_SENTRY_DSN;
if (DSN && !window.location.pathname.startsWith('/canal')) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
      // Sense rastre de peticions ni de consola: poden portar identificadors de denúncies
      beforeBreadcrumb: (b) => (['fetch', 'xhr', 'console', 'navigation'].includes(b.category) ? null : b),
      // Si s'ha entrat per l'accés i després es passa al canal sense recarregar, Sentry ja és a la pàgina:
      // tot el que passi al canal es descarta, i no es comptabilitzen sessions (porten la IP)
      beforeSend: (e) => (window.location.pathname.startsWith('/canal') ? null : e),
      beforeSendTransaction: (e) => (window.location.pathname.startsWith('/canal') ? null : e),
      integrations: (all) => all.filter(i => i.name !== 'BrowserSession'),
    });
  });
}

// La part de la pàgina d'entrada es comença a baixar ja, en paral·lel amb React
{
  const path = window.location.pathname;
  const quiet = (p) => p.catch(() => {});
  if (path.startsWith('/canal/')) quiet(loadCanal());
  else if (!path.startsWith('/admin') && !path.startsWith('/dev')) { quiet(loadSite()); if (path === '/') quiet(loadLanding()); }
}

// La vista prèvia en compartir un enllaç segueix l'idioma i el títol de la pàgina
watchShareMeta();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
