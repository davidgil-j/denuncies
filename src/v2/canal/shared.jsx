import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { translations } from '../../translations.js';
import { madridDay, addMonthsDay, dayToDate, ACK_DAYS, RESP_MONTHS } from '../../lib/deadlines.js';
import { LANGS, Stable, fmt, quickExit } from '../V2Layout.jsx';
import { Button, Segmented, cx } from '../ui/index.js';
import { LOCALES } from '../../lib/format.js';

// Las 9 categorías, en el orden de la pantalla. El valor que se guarda no cambia.
export const CATEGORIES = ['harassment', 'fraud', 'discrimination', 'safety', 'data', 'conflict', 'accounting', 'environmental', 'other'];

export const EMPTY_DRAFT = {
  step: 1, category: '', description: '', when: '', department: '', involvedPeople: '', files: [],
  isAnonymous: true, name: '', email: '', phone: '', meeting: false, privacy: false,
};
export const isDirty = (d) => !!(d.category || d.description.trim() || d.when.trim() || d.department.trim() || d.involvedPeople.trim()
  || d.files.length || d.name.trim() || d.email.trim() || d.phone.trim());

/** Texto del lado «Denunciar» (apartado «canal»), sin que nada se mueva al cambiar de idioma */
export const Tc = forwardRef(function Tc({ lang, k, vars, pick, ...rest }, ref) {
  return <Stable ref={ref} lang={lang} pick={(T, l) => (pick ? pick(T.canal, T, l) : fmt(T.canal[k], vars))} {...rest} />;
});

/** Icono del canal: siempre el mismo trazo (1,8 px) y entre 16 y 20 px */
export const ic = (Icon, size = 16) => <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;

const LOCALE = LOCALES;
/** «13 de octubre» */
export const dayMonth = (date, lang) => new Date(date).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long' });
/** «7 oct» */
export const dayShort = (date, lang) => new Date(date).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'short' });
export const dateTime = (date, lang) => new Date(date).toLocaleString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Plazos de la Ley 2/2023 desde la recepción: acuse en 7 días naturales y respuesta en 3 meses (art. 9.2)
// (días de calendario de Madrid, igual que el panel y la base de datos: src/lib/deadlines.js)
export function ackDue(created) {
  return dayToDate(madridDay(created) + ACK_DAYS);
}
export function respDue(created, extendedUntil) {
  return dayToDate(extendedUntil ? madridDay(String(extendedUntil).slice(0, 10)) : addMonthsDay(madridDay(created), RESP_MONTHS));
}

/** El selector de idioma del canal */
export function LangPick({ lang, setLang, className }) {
  return (
    <Segmented
      className={cx('canal-lang', className)} label={translations[lang].v2.langGroup} value={lang} onChange={setLang}
      options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: `${l.toUpperCase()} · ${translations[l].langName}`, lang: l }))}
    />
  );
}

/** «Salir rápido»: a una web neutra, sin dejar el canal en el historial. En el móvil, «Salir». */
export function QuickExit({ lang }) {
  const t = translations[lang].canal;
  return (
    <Button variant="soft" size="xs" className="canal-exit" aria-label={t.quickExit} onClick={quickExit} icon={ic(LogOut, 16)}>
      <Tc lang={lang} k="quickExit" className="ds-wide" />
      <Tc lang={lang} k="quickExitShort" className="ds-narrow" />
    </Button>
  );
}

/**
 * Barra de arriba de cada pantalla del canal: el nombre de la empresa, el idioma y «Salir rápido».
 * children: lo que la pantalla añade antes de «Salir rápido» («Salir de mi caso»). langOnPhone: el idioma
 * también se ve en el móvil (la política de privacidad; en los pasos ya se eligió en la entrada).
 */
export function CanalHead({ lang, setLang, org, langOnPhone = false, children }) {
  return (
    <div className="flow-head">
      <b className="flow-brand" title={org.name}>{org.name}</b>
      <div className="flow-tools">
        {children}
        {setLang && <LangPick lang={lang} setLang={setLang} className={langOnPhone ? undefined : 'is-wide-only'} />}
        <QuickExit lang={lang} />
      </div>
    </div>
  );
}

/**
 * Lo primero de cada pantalla: «Volver al inicio del canal» y, en la denuncia, «Paso N de 3 · Modo anónimo»
 * con su barra fina. topic: función que da el nombre del tema en cada idioma. onHome puede cancelar la
 * vuelta (e.preventDefault) para preguntar antes.
 */
export function FlowTop({ lang, base, step, total = 3, anon = false, topic, onHome }) {
  return (
    <div className={cx('flow-top', step && 'has-step')}>
      <div className="flow-top-row">
        <Link className="flow-home" to={base} replace onClick={onHome}>{ic(ArrowLeft, 16)}<Tc lang={lang} k="backHome" /></Link>
        {step && (
          <Stable
            lang={lang} className="flow-where"
            pick={T => <>{fmt(T.ds.stepOf, { n: step, total })}{anon && ` · ${T.canal.anonMode}`}{topic && <span className="ds-wide"> · {topic(T.canal)}</span>}</>}
          />
        )}
      </div>
      {step && (
        <div className="ds-steps-bar flow-bar" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <span key={i} className={cx('ds-steps-seg', i < step && 'is-done')} />)}
        </div>
      )}
    </div>
  );
}
