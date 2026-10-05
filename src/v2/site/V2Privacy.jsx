import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { ICON, Stable } from '../V2Layout.jsx';
import './site.css';

// Converteix en enllaç el correu de contacte i l'adreça de l'AEPD que apareixen al text legal
const LINKS = {
  'info@reportia.es': 'mailto:info@reportia.es',
  'aepd.es': 'https://www.aepd.es',
};
const LINK_RE = /(info@reportia\.es|aepd\.es)/g;

function Rich({ text }) {
  return text.split(LINK_RE).map((part, i) => {
    const href = LINKS[part];
    if (!href) return <React.Fragment key={i}>{part}</React.Fragment>;
    const external = href.startsWith('http');
    return (
      <a key={i} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{part}</a>
    );
  });
}

// L'índex desplaça la pàgina sense afegir entrades a l'historial (així «Tornar» torna on toca)
function Toc({ sections, lang }) {
  const go = (e, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.querySelector('h2')?.focus({ preventScroll: true });
  };
  return (
    <ol>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} onClick={e => go(e, s.id)}><Stable lang={lang} pick={T => T.v2site.privacy.sections[i].title} /></a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Política de privacitat. A la web de Reportia (/privacitat) i dins de cada canal
 * (/canal/:slug/privacidad); dins del canal, el text nomena l'organització com a responsable
 * i el botó torna al canal sense sortir-ne.
 */
export default function V2Privacy() {
  const { lang, org, base } = useOutletContext();
  const tp = translations[lang].v2site.privacy;
  const owner = org?.name || tp.ownerGeneric;
  const t = tp;
  // Cada text es pinta en els tres idiomes i reserva l'espai del més llarg: en canviar d'idioma,
  // els apartats no es mouen. P = textos de privacitat d'un idioma, amb el nom de l'organització posat
  const fillOf = (P) => (text) => text.replace(/\{org\}/g, org?.name || P.ownerGeneric);
  const st = (pick, props) => <Stable lang={lang} pick={T => pick(T.v2site.privacy, T)} {...props} />;
  const { hash, key } = useLocation();
  const navigate = useNavigate();

  useEffect(() => { document.title = org ? `${t.title} · ${org.name}` : t.docTitle; }, [t, org]);

  // En obrir amb #secció, hi baixa quan el text ja és a la pàgina
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView();
  }, [hash, lang]);

  // Si s'hi ha arribat des de la mateixa web, «Tornar» torna enrere; si s'ha obert directament, a l'inici
  const canGoBack = key !== 'default';

  return (
    <article className="v2-pv v2-wrap" aria-labelledby="v2-pv-title">
      <header className="v2-pv-head">
        {st(P => P.title, { as: 'h1', className: 'v2-h1', id: 'v2-pv-title' })}
        {st(P => P.updated, { as: 'p', className: 'v2-pv-meta' })}
      </header>

      <div className="v2-pv-grid">
        <details className="v2-pv-toc v2-pv-toc-m">
          <summary>{st(P => P.tocTitle)}<ChevronDown {...ICON} /></summary>
          <Toc sections={t.sections} lang={lang} />
        </details>

        <nav className="v2-pv-toc v2-pv-toc-d" aria-labelledby="v2-pv-toc-t">
          {st(P => P.tocTitle, { as: 'p', className: 'v2-pv-toc-title', id: 'v2-pv-toc-t' })}
          <Toc sections={t.sections} lang={lang} />
        </nav>

        <div className="v2-pv-body">
          {t.sections.map((s, i) => (
            <section className="v2-pv-sec" id={s.id} key={s.id} aria-labelledby={`${s.id}-t`}>
              <h2 id={`${s.id}-t`} tabIndex={-1}><span className="n" aria-hidden="true">{i + 1}.</span>{st(P => P.sections[i].title)}</h2>
              {st(P => {
                const sec = P.sections[i];
                const fill = fillOf(P);
                return (
                  <>
                    {sec.p?.map((text, j) => <p key={j}><Rich text={fill(text)} /></p>)}
                    {sec.dl && (
                      <dl>
                        {sec.dl.map(([term, def], j) => (
                          <div key={j}><dt>{term}</dt><dd><Rich text={fill(def)} /></dd></div>
                        ))}
                      </dl>
                    )}
                  </>
                );
              }, { as: 'div' })}
            </section>
          ))}

          <div className="v2-pv-back">
            {base ? (
              <Link className="v2-btn v2-btn-secondary icon-lead" to={base} replace><ChevronLeft {...ICON} />{st((P, T) => T.v2.backToChannel)}</Link>
            ) : canGoBack ? (
              <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={() => navigate(-1)}>
                <ChevronLeft {...ICON} />{st(P => P.back)}
              </button>
            ) : (
              <Link className="v2-btn v2-btn-secondary icon-lead" to="/"><ChevronLeft {...ICON} />{st(P => P.back)}</Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
