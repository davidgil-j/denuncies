import React, { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { translations } from '../../translations.js';
import { ICON, stableOf } from '../V2Layout.jsx';

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pantalla no es mou
const S = stableOf(T => T.v2site.notFound);

/** Adreça inexistent a la web de Reportia: s'explica i s'ofereixen els camins habituals */
export default function V2NotFound() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.notFound;

  useEffect(() => { document.title = t.docTitle; }, [t]);

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-narrow v2-404">
        <span className="v2-404-icon" aria-hidden="true"><Compass {...ICON} /></span>
        <S as="h1" className="v2-h1" k="title" />
        <S as="p" className="v2-lead" k="text" />
        <div className="v2-note is-quiet" role="note"><p>{t.reportTitle}<small><S k="reportText" /></small></p></div>
        <div className="v2-actions">
          <Link className="v2-btn v2-btn-primary icon-trail" to="/"><S k="home" /><ArrowRight {...ICON} /></Link>
          <Link className="v2-btn v2-btn-secondary" to="/admin/login"><S k="login" /></Link>
        </div>
      </div>
    </div>
  );
}
