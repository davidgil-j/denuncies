import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { translations } from '../translations.js';
import { getOrganizationBySlug } from '../lib/supabase.js';
import V2Layout, { detectLang, LANGS } from './V2Layout.jsx';

/**
 * Ruta pare del canal v2 (/v2/canal/:slug). Carrega l'organització un sol cop i
 * comparteix idioma i organització amb les pàgines filles via <Outlet context>.
 * L'idioma viu aquí perquè no es perdi en passar d'una pàgina a una altra.
 */
export default function V2Canal() {
  const { slug } = useParams();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlLang = params.get('lang');
  // L'idioma viu a l'adreça (?lang=): sobreviu a recarregar i no deixa rastre al navegador
  const [lang, setLang] = useState(() => (LANGS.includes(urlLang) ? urlLang : detectLang()));
  const [org, setOrg] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const t = translations[lang].v2;
  const base = `/canal/${slug}`;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getOrganizationBySlug(slug).then(({ organization }) => {
      if (cancelled) return;
      if (organization) { setOrg(organization); setStatus('ready'); }
      else setStatus('notfound');
    });
    return () => { cancelled = true; };
  }, [slug]);

  // Cada pàgina comença a dalt, amb el focus al contingut (els lectors de pantalla ho anuncien)
  const firstPath = React.useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstPath.current) { firstPath.current = false; return; }
    document.getElementById('v2-main')?.focus({ preventScroll: true });
  }, [pathname]);

  // Manté ?lang= a l'adreça en canviar d'idioma o de pàgina (substituint, sense afegir entrades)
  useEffect(() => {
    if (urlLang === lang) return;
    const next = new URLSearchParams(location.search);
    next.set('lang', lang);
    navigate({ pathname, search: `?${next}`, hash: location.hash }, { replace: true, state: location.state });
  }, [lang, urlLang, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <V2Layout lang={lang} setLang={setLang} org={status === 'ready' ? org : null} homeTo={base}>
      {status === 'loading' && (
        <div className="v2-center" role="status" aria-live="polite">
          <div className="v2-spinner" />
          <span className="v2-vh">{t.loading}</span>
        </div>
      )}
      {status === 'notfound' && (
        <div className="v2-center">
          <div>
            <h1 className="v2-sec-title">{t.notFoundTitle}</h1>
            <p>{t.notFoundDesc}</p>
          </div>
        </div>
      )}
      {status === 'ready' && <Outlet context={{ lang, org, base }} />}
    </V2Layout>
  );
}
