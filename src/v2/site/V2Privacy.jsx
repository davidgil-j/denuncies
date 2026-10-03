import React, { useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { ICON } from '../V2Layout.jsx';

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

function Toc({ sections }) {
  return (
    <ol>
      {sections.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
    </ol>
  );
}

export default function V2Privacy() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.privacy;
  const { hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => { document.title = t.docTitle; }, [t]);

  // En obrir amb #secció, hi baixa quan el text ja és a la pàgina
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView();
  }, [hash, lang]);

  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return (
    <article className="v2-pv v2-wrap" aria-labelledby="v2-pv-title">
      <header className="v2-pv-head">
        <h1 className="v2-h1" id="v2-pv-title">{t.title}</h1>
        <p className="v2-pv-meta">{t.updated}</p>
      </header>

      <div className="v2-pv-grid">
        <details className="v2-pv-toc v2-pv-toc-m">
          <summary>{t.tocTitle}<ChevronDown {...ICON} /></summary>
          <Toc sections={t.sections} />
        </details>

        <nav className="v2-pv-toc v2-pv-toc-d" aria-labelledby="v2-pv-toc-t">
          <p className="v2-pv-toc-title" id="v2-pv-toc-t">{t.tocTitle}</p>
          <Toc sections={t.sections} />
        </nav>

        <div className="v2-pv-body">
          {t.sections.map((s, i) => (
            <section className="v2-pv-sec" id={s.id} key={s.id} aria-labelledby={`${s.id}-t`}>
              <h2 id={`${s.id}-t`}><span className="n" aria-hidden="true">{i + 1}.</span>{s.title}</h2>
              {s.p?.map(text => <p key={text}><Rich text={text} /></p>)}
              {s.dl && (
                <dl>
                  {s.dl.map(([term, def]) => (
                    <div key={term}><dt>{term}</dt><dd><Rich text={def} /></dd></div>
                  ))}
                </dl>
              )}
            </section>
          ))}

          {canGoBack && (
            <div className="v2-pv-back">
              <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={() => navigate(-1)}>
                <ChevronLeft {...ICON} />{t.back}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
