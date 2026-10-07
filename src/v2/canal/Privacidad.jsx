import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS, Stable } from '../V2Layout.jsx';
import { Button, Card, OrgMark, Segmented } from '../ui/index.js';
import { QuickExit, Tc } from './shared.jsx';

// Convierte en enlace el correo de contacto y la dirección de la AEPD que aparecen en el texto legal
const LINKS = { 'info@reportia.es': 'mailto:info@reportia.es', 'aepd.es': 'https://www.aepd.es' };
const LINK_RE = /(info@reportia\.es|aepd\.es)/g;
function Rich({ text }) {
  return text.split(LINK_RE).map((part, i) => {
    const href = LINKS[part];
    if (!href) return <React.Fragment key={i}>{part}</React.Fragment>;
    return <a key={i} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{part}</a>;
  });
}

/**
 * Política de privacidad dentro del canal: el mismo texto de siempre (v2site.privacy), que nombra a la
 * empresa como responsable, con el estilo nuevo. «Volver» regresa al canal sin salir de él.
 */
export default function Privacidad() {
  const { lang, setLang, org, base, banner } = useOutletContext();
  const T = translations[lang];
  const t = T.v2site.privacy;
  const { hash } = useLocation();
  const st = (pick, props) => <Stable lang={lang} pick={X => pick(X.v2site.privacy)} {...props} />;

  useEffect(() => { document.title = `${t.title} · ${org.name}`; }, [t, org]);
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash, lang]);

  return (
    <div className="ds ds-page priv-page">
      {banner && <div className="ds-split-banner">{banner}</div>}
      <header className="ds-split-top">
        <div className="entry-brand"><OrgMark name={org.name} /><b>{org.name}</b><Tc lang={lang} k="ethics" className="entry-brand-sub" /></div>
        <div className="entry-tools">
          <Segmented
            className="entry-lang" label={T.v2.langGroup} value={lang} onChange={setLang}
            options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))}
          />
          <QuickExit lang={lang} />
        </div>
      </header>
      <Card as="main" radius="xl" className="priv" id="ds-main" tabIndex={-1}>
        <Button variant="soft" size="sm" to={base} replace className="priv-back" icon={<ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />}><Tc lang={lang} k="backToChannel" /></Button>
        {st(P => P.title, { as: 'h1', className: 'ds-h1 is-sm' })}
        {st(P => P.updated, { as: 'p', className: 'priv-meta' })}
        {t.sections.map((s, i) => (
          <section className="priv-sec" id={s.id} key={s.id} aria-labelledby={`${s.id}-t`}>
            <h2 id={`${s.id}-t`}><span aria-hidden="true">{i + 1}. </span>{st(P => P.sections[i].title)}</h2>
            {st(P => {
              const sec = P.sections[i];
              const fill = (text) => text.replace(/\{org\}/g, org.name || P.ownerGeneric);
              return (
                <>
                  {sec.p?.map((text, j) => <p key={j}><Rich text={fill(text)} /></p>)}
                  {sec.dl && <dl>{sec.dl.map(([term, def], j) => <div key={j}><dt>{term}</dt><dd><Rich text={fill(def)} /></dd></div>)}</dl>}
                </>
              );
            }, { as: 'div' })}
          </section>
        ))}
        <Button variant="ink" size="md" to={base} replace className="priv-back" icon={<ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />}><Tc lang={lang} k="backToChannel" /></Button>
      </Card>
    </div>
  );
}
