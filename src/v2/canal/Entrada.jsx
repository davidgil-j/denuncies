import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, EyeOff, Clock, Shield, CalendarDays, FileText, Lock, ArrowRight, ArrowUpRight, MonitorSmartphone, KeyRound } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS, AIPI_URL, BOE_URL, Stable, fmt } from '../V2Layout.jsx';
import Ficha from '../Ficha.jsx';
import { Button, Chip, Chips, Dialog, OrgMark, Segmented } from '../ui/index.js';
import { QuickExit, Tc } from './shared.jsx';

const arrow = <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />;
const ico = (Icon) => <Icon size={16} strokeWidth={2} aria-hidden="true" />;

/** Cabecera de la entrada: empresa, idioma en píldora y «Salir rápido» */
export function EntryTop({ lang, setLang, org }) {
  const t = translations[lang];
  useEffect(() => { document.title = `${t.canal.ethics} · ${org.name}`; }, [t, org]);
  return (
    <>
      <div className="entry-brand">
        <OrgMark name={org.name} />
        <b>{org.name}</b>
        <Tc lang={lang} k="ethics" className="entry-brand-sub" />
      </div>
      <div className="entry-tools">
        <Segmented
          className="entry-lang" label={t.v2.langGroup} value={lang} onChange={setLang}
          options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))}
        />
        <QuickExit lang={lang} />
      </div>
    </>
  );
}

/** Tarjeta azul: Denunciar */
export function EntryReport({ lang, base }) {
  const t = translations[lang].canal;
  return (
    <>
      <span className="entry-ico" aria-hidden="true"><MessageSquare size={40} strokeWidth={1.6} /></span>
      <div className="entry-main">
        <Tc as="h1" className="ds-hero" lang={lang} k="report" />
        <Tc as="p" className="ds-lead entry-lead" lang={lang} k="reportLead" />
        <Chips size="lg" className="entry-chips">
          {[EyeOff, Clock, Shield].map((Icon, i) => <Chip key={i} tone="shade" size="lg" icon={ico(Icon)}>{t.trust[i]}</Chip>)}
        </Chips>
      </div>
      <div className="entry-foot">
        {/* Botón secundario, oscurecido sobre el azul: quien ya denunció vuelve por aquí con su código */}
        <Button variant="shade" size="xl" className="entry-again" to={`${base}/consulta`} replace icon={<KeyRound size={20} strokeWidth={2.2} aria-hidden="true" />}>{t.already}</Button>
        <Button variant="white" size="xl" className="entry-go" to={`${base}/denuncia`} replace aria-label={t.startAria} iconEnd={arrow}><Tc lang={lang} k="start" /></Button>
      </div>
    </>
  );
}

/**
 * Tarjeta blanca: Gestionar. En el móvil es una tarjeta baja que entera es el enlace.
 * En el canal de ejemplo no hay panel al que entrar: el botón lleva a crear el canal propio y lo dice.
 */
export function EntryManage({ lang, org, to, example }) {
  const t = translations[lang].canal;
  const vars = { org: org.name };
  const k = example
    ? { note: 'exManageNote', cta: 'exManageCta', aria: t.exManageAria, short: 'exManageShort' }
    : { note: 'twoStep', cta: 'access', aria: t.accessAria, short: 'manageShort' };
  return (
    <>
      <div className="entry-wide">
        <span className="entry-ico" aria-hidden="true"><LayoutDashboard size={40} strokeWidth={1.6} /></span>
        <div className="entry-main">
          <Tc as="h2" className="ds-hero" lang={lang} k="manage" />
          <Tc as="p" className="ds-lead entry-lead" lang={lang} k="manageLead" vars={vars} />
          <Chips size="lg" className="entry-chips">
            {[CalendarDays, FileText, Lock].map((Icon, i) => <Chip key={i} size="lg" icon={ico(Icon)}>{t.manageTrust[i]}</Chip>)}
          </Chips>
        </div>
        <div className="entry-foot">
          <Tc lang={lang} k={k.note} className="entry-note" />
          <Button variant="ink" size="xl" to={to} aria-label={k.aria} iconEnd={arrow}><Tc lang={lang} k={k.cta} /></Button>
        </div>
      </div>
      <Link className="entry-compact" to={to} aria-label={k.aria}>
        <span className="entry-compact-txt">
          <Tc lang={lang} k="manage" className="entry-compact-t" />
          <Tc lang={lang} k={k.short} vars={vars} className="entry-compact-s" />
        </span>
        <span className="entry-compact-go" aria-hidden="true"><ArrowRight size={20} strokeWidth={2.2} /></span>
      </Link>
    </>
  );
}

/**
 * Pie de la entrada. Los canales externos (art. 7.2) y «qué guardamos y qué no» se abren en un panel:
 * son los mismos textos que tenía la página anterior del canal.
 */
export function EntryBottom({ lang, org, base }) {
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
      <span className="entry-legal">{fmt(t.footSystem, { org: org.name })}</span>
      <span className="entry-links">
        <Link to={`${base}/privacidad`} replace>{t.footPrivacy}</Link>
        <button type="button" className="entry-linkbtn" onClick={() => setPanel('ext')}>
          <span className="ds-wide">{regional ? fmt(t.footExtWith, { name: regional.name }) : t.footExt}</span>
          <span className="ds-narrow">{t.footExtShort}</span>
        </button>
        <button type="button" className="entry-linkbtn" onClick={() => setPanel('kept')}>{t.footKept}</button>
        <a href={BOE_URL} target="_blank" rel="noopener noreferrer" className="ds-narrow">{t.law}</a>
        <Link to={`/?lang=${lang}`}>{t.footBy}</Link>
      </span>

      <Dialog side open={panel === 'ext'} onClose={() => setPanel(null)} title={v.extTitle} closeLabel={t.close}>
        <p>{v.extText}</p>
        <ul className="panel-list">
          {external.map(e => (
            <li key={e.href}>
              <a href={e.href} target="_blank" rel="noopener noreferrer">
                <span><b>{e.name}</b><small>{e.note}</small></span>
                <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" /><span className="ds-vh"> {v.extOpens}</span>
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
        <p className="panel-tip"><MonitorSmartphone size={18} strokeWidth={2} aria-hidden="true" /><span><b>{v.tipTitle}</b> {v.tipText}</span></p>
      </Dialog>
    </>
  );
}
