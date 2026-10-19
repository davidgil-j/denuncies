import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, MonitorSmartphone } from 'lucide-react';
import { translations } from '../../translations.js';
import { AIPI_URL, BOE_URL, fmt } from '../V2Layout.jsx';
import Ficha from '../Ficha.jsx';
import { BrandLogo, Button, Dialog } from '../ui/index.js';
import { LangPick, QuickExit, Tc, ic } from './shared.jsx';
import { inFrame } from '../lib/frame.js';
import { leaveCanal } from '../lib/domain.js';
import { PIE_CON_REPORTIA } from '../config/producto.js';

// Dentro de la web de una empresa (iframe), lo que sale del canal se abre en una ventana nueva: el panel y la web de
// Reportia no se abren nunca dentro de otra web
const outside = () => (inFrame() ? { target: '_blank', rel: 'noopener noreferrer' } : {});

const arrow = ic(ArrowRight, 18);

/** Cabecera de la entrada: la empresa (su logo, si lo tiene, y su nombre) sobre el color y, sobre el blanco, el idioma y «Salir rápido» */
export function EntryTop({ lang, setLang, org }) {
  const t = translations[lang];
  useEffect(() => { document.title = `${t.canal.ethics} · ${org.name}`; }, [t, org]);
  return (
    <>
      <div className="entry-brand">
        <BrandLogo org={org} />
        <span className="entry-brand-txt">
          <b title={org.name}>{org.name}</b>
          <Tc lang={lang} k="ethics" className="entry-brand-sub" />
        </span>
      </div>
      <div className="entry-tools">
        <LangPick lang={lang} setLang={setLang} />
        <QuickExit lang={lang} />
      </div>
    </>
  );
}

/** La mitad del color: Denunciar, con sus dos acciones igual de visibles */
export function EntryReport({ lang, base }) {
  const t = translations[lang].canal;
  return (
    <>
      <Tc as="h1" className="ds-hero" lang={lang} k="report" />
      <Tc as="p" className="entry-lead" lang={lang} k="reportLead" />
      <div className="entry-acts">
        <Button variant="white" size="xl" className="entry-go" to={`${base}/formulario`} replace aria-label={t.startAria} iconEnd={arrow}><Tc lang={lang} k="start" /></Button>
        {/* Quien ya denunció vuelve por aquí con su código */}
        <div className="entry-act">
          <Button variant="shade" size="xl" className="entry-again" to={`${base}/consulta`} replace aria-label={t.already}><Tc lang={lang} k="already" /></Button>
          <Tc lang={lang} k="alreadyHelp" className="entry-help" />
        </div>
      </div>
    </>
  );
}

/**
 * La mitad blanca: Gestionar. En el canal de ejemplo no hay panel al que entrar: el botón lleva a crear
 * el canal propio y lo dice.
 */
export function EntryManage({ lang, org, to, example, onGo }) {
  const k = example ? { note: 'exManageNote', cta: 'exManageCta' } : { note: 'twoStep', cta: 'access' };
  return (
    <>
      <Tc as="h2" className="ds-hero" lang={lang} k="manage" />
      <Tc as="p" className="entry-lead" lang={lang} k="manageLead" vars={{ org: org.name }} />
      <div className="entry-acts">
        <div className="entry-act is-start">
          <Button variant="line" size="xl" className="entry-go" to={to} onClick={onGo} iconEnd={arrow} {...outside()}><Tc lang={lang} k={k.cta} /></Button>
          <Tc lang={lang} k={k.note} className="entry-help" />
        </div>
      </div>
    </>
  );
}

/** La línea legal del canal */
export function EntryLegal({ lang, org }) {
  return <span className="entry-legal">{fmt(translations[lang].canal.footSystem, { org: org.name })}</span>;
}

/**
 * Los enlaces del pie. Los canales externos (art. 7.2) y «qué guardamos y qué no» se abren en un panel:
 * son los mismos textos que tenía la página anterior del canal. full: en el pie ancho de las pantallas de
 * Denunciar el enlace nombra las autoridades; en la entrada, donde solo tiene media pantalla, va corto.
 */
export function EntryLinks({ lang, org, base, full = false }) {
  const [panel, setPanel] = useState(null); // ext | kept
  const T = translations[lang];
  const t = T.canal;
  const v = T.v2;
  const regional = org.regional_authority_name && org.regional_authority_url ? { name: org.regional_authority_name, url: org.regional_authority_url } : null;
  const external = [
    { href: AIPI_URL, name: v.ext1t, note: v.ext1d },
    ...(regional ? [{ href: regional.url, name: regional.name, note: v.ext2d }] : []),
  ];
  return (
    <>
      <span className="entry-links">
        <Link to={`${base}/privacidad`} replace>{t.footPrivacy}</Link>
        <button type="button" className="entry-linkbtn" onClick={() => setPanel('ext')}>
          {full ? (regional ? fmt(t.footExtWith, { name: regional.name }) : t.footExt) : t.footExtShort}
        </button>
        <button type="button" className="entry-linkbtn" onClick={() => setPanel('kept')}>{t.footKept}</button>
        <a href={BOE_URL} target="_blank" rel="noopener noreferrer" className="ds-narrow">{t.law}</a>
        {/* «Con Reportia», pequeño y sin logo (n.º 49). Reportia lo quita por empresa (migración 018: show_powered_by) */}
        {PIE_CON_REPORTIA && org.show_powered_by !== false && <Link className="entry-by" reloadDocument to={leaveCanal(`/?lang=${lang}`)} {...outside()}>{t.footBy}</Link>}
      </span>

      <Dialog side open={panel === 'ext'} onClose={() => setPanel(null)} title={v.extTitle} closeLabel={t.close}>
        <p>{v.extText}</p>
        <ul className="panel-list">
          {external.map(e => (
            <li key={e.href}>
              <a href={e.href} target="_blank" rel="noopener noreferrer">
                <span><b>{e.name}</b><small>{e.note}</small></span>
                {ic(ArrowUpRight, 18)}<span className="ds-vh"> {v.extOpens}</span>
              </a>
            </li>
          ))}
        </ul>
        <h3 className="panel-h">{v.legalTitle}</h3>
        <p>{fmt(v.legalText, { org: org.name })}</p>
        <dl className="panel-refs">
          {[1, 2, 3].map(n => <div key={n}><dt>{v[`ref${n}t`]}</dt><dd>{v[`ref${n}d`]}</dd></div>)}
        </dl>
        <p><a href={BOE_URL} target="_blank" rel="noopener noreferrer">{v.footerLaw}</a></p>
      </Dialog>

      <Dialog side open={panel === 'kept'} onClose={() => setPanel(null)} title={t.footKept} closeLabel={t.close}>
        <div className="v2 panel-ficha"><Ficha lang={lang} as="div" /></div>
        <p className="panel-tip">{ic(MonitorSmartphone, 18)}<span><b>{v.tipTitle}</b> {v.tipText}</span></p>
      </Dialog>
    </>
  );
}
