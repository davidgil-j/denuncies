import React, { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { translations } from '../../translations.js';
import { detectLang, savedLang, LANGS } from '../V2Layout.jsx';
import { Button, Card } from './index.js';

/**
 * Lo que se ve si el panel, el acceso o la web de Reportia acaban dentro de un recuadro (iframe) de otra web: solo el
 * canal se puede incrustar. Un enlace lo abre en una ventana propia, con la misma dirección.
 */
export default function Framed() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  const lang = LANGS.includes(urlLang) ? urlLang : savedLang() ?? detectLang();
  const t = translations[lang].v2;
  useEffect(() => { document.title = t.framedT; }, [t]);
  return (
    <div className="ds ds-page ds-framed" lang={lang}>
      <Card as="main" className="ds-framed-card">
        <h1 className="ds-h1 is-sm">{t.framedT}</h1>
        <p className="ds-lead">{t.framedD}</p>
        <div>
          <Button variant="report" size="md" href={window.location.href} target="_blank" rel="noopener noreferrer" iconEnd={<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />}>{t.framedGo}</Button>
        </div>
      </Card>
    </div>
  );
}
