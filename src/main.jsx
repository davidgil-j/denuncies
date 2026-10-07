import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { watchShareMeta } from './v2/site/origin.js';
// Tipografies allotjades al mateix lloc (abans es demanaven a Google Fonts)
import '@fontsource/wix-madefor-display/latin-600.css';
import '@fontsource/wix-madefor-display/latin-ext-600.css';
import '@fontsource/wix-madefor-text/latin-400.css';
import '@fontsource/wix-madefor-text/latin-ext-400.css';
import '@fontsource/wix-madefor-text/latin-500.css';
import '@fontsource/wix-madefor-text/latin-ext-500.css';
import '@fontsource/wix-madefor-text/latin-600.css';
import '@fontsource/wix-madefor-text/latin-ext-600.css';

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
    });
  });
}

// La vista prèvia en compartir un enllaç segueix l'idioma i el títol de la pàgina
watchShareMeta();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
