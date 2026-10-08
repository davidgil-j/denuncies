import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { translations } from '../../translations.js';

/**
 * Aviso de «sin conexión»: aparece arriba cuando el navegador pierde la red y se va solo al volver.
 * Evita que alguien escriba o pulse «Enviar» sin saber por qué no pasa nada.
 */
export default function Offline({ lang }) {
  const [off, setOff] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOff(false);
    const down = () => setOff(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', down); };
  }, []);
  return (
    <div className="ds ds-offline-zone" role="status" aria-live="polite">
      {off && <p className="ds-offline"><WifiOff size={18} strokeWidth={2.2} aria-hidden="true" />{translations[lang].ds.offline}</p>}
    </div>
  );
}
