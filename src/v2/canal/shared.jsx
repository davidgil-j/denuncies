import React, { forwardRef } from 'react';
import {
  Users, Banknote, Scale, TriangleAlert, Lock, ArrowLeftRight, Calculator, Leaf, CircleHelp, EyeOff, LogOut,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { Stable, fmt, quickExit } from '../V2Layout.jsx';
import { Button, Chip, OrgMark } from '../ui/index.js';

// Las 9 categorías, en el orden de la pantalla. El valor que se guarda no cambia.
export const CATEGORIES = ['harassment', 'fraud', 'discrimination', 'safety', 'data', 'conflict', 'accounting', 'environmental', 'other'];
export const CAT_ICON = {
  harassment: Users, fraud: Banknote, discrimination: Scale, safety: TriangleAlert, data: Lock,
  conflict: ArrowLeftRight, accounting: Calculator, environmental: Leaf, other: CircleHelp,
};

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

const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
/** «13 de octubre» */
export const dayMonth = (date, lang) => new Date(date).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long' });
/** «7 oct» */
export const dayShort = (date, lang) => new Date(date).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'short' });
export const dateTime = (date, lang) => new Date(date).toLocaleString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Plazos de la Ley 2/2023 desde la recepción: acuse en 7 días naturales y respuesta en 3 meses (art. 9.2)
export function ackDue(created) {
  const d = new Date(created);
  d.setDate(d.getDate() + 7);
  return d;
}
export function respDue(created, extendedUntil) {
  if (extendedUntil) return new Date(`${extendedUntil}T12:00:00`);
  const d = new Date(created);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 3);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/** «Salir rápido»: a una web neutra, sin dejar el canal en el historial. En el móvil, «Salir». */
export function QuickExit({ lang }) {
  const t = translations[lang].canal;
  return (
    <Button variant="ink" size="sm" className="canal-exit" aria-label={t.quickExit} onClick={quickExit} icon={<LogOut size={15} strokeWidth={2} aria-hidden="true" />}>
      <Tc lang={lang} k="quickExit" className="ds-wide" />
      <Tc lang={lang} k="quickExitShort" className="ds-narrow" />
    </Button>
  );
}

/** Cabecera de cada pantalla del lado Denunciar: marca y nombre, «Modo anónimo» y «Salir rápido» */
export function CanalHead({ lang, org, anon = false, children }) {
  return (
    <div className="flow-head">
      <div className="flow-brand">
        <OrgMark name={org.name} />
        <b>{org.name}</b>
        {anon && <Chip tone="shade" size="md" icon={<EyeOff size={14} strokeWidth={2} aria-hidden="true" />}><Tc lang={lang} k="anonMode" /></Chip>}
      </div>
      <div className="flow-tools">
        {children}
        <QuickExit lang={lang} />
      </div>
    </div>
  );
}
