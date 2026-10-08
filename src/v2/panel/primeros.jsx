import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmt } from '../V2Layout.jsx';
import { addBusinessDays, businessDaysLeft, calendarDay } from '../../lib/businessDays.js';

// Los cinco «primeros pasos» de una empresa que acaba de abrir su canal. Tres se marcan solos con lo
// que hay en Equipo y ajustes; «web» y «poster» los marca a mano quien administra (organizations.onboarding).
export const STEPS = ['responsible', 'web', 'invite', 'poster', 'aipi'];
export const MANUAL = ['web', 'poster'];
export const AIPI_DAYS = 10;

/** La organización tiene las columnas de la migración 012 (fechas del responsable y primeros pasos) */
export const hasOnboarding = (org) => !!org && 'onboarding' in org;

/**
 * Primeros pasos: cuáles están hechos, cuántos y cuál toca. members: personas con acceso al panel.
 * Devuelve null si no se puede saber (sin la migración 012 o sin el recuento del equipo).
 */
export function onboardingState(org, members) {
  if (!hasOnboarding(org) || members == null) return null;
  const marked = org.onboarding ?? {};
  const done = {
    responsible: !!org.responsible_name?.trim(),
    web: !!marked.web,
    invite: members > 1,
    poster: !!marked.poster,
    aipi: !!org.aipi_notified_at,
  };
  const count = STEPS.filter(s => done[s]).length;
  return { done, count, next: STEPS.find(s => !done[s]) ?? null };
}

/**
 * Plazo para comunicar el Responsable del Sistema a la autoridad (art. 8.3): 10 días hábiles desde
 * el nombramiento. state: done | none (sin responsable) | undated (sin fecha de nombramiento) |
 * pending (quedan `left` días hábiles; 0 = vence hoy) | overdue.
 */
export function aipiInfo(org, now = new Date()) {
  if (!hasOnboarding(org)) return null;
  if (org.aipi_notified_at) return { state: 'done' };
  if (!org.responsible_name?.trim()) return { state: 'none' };
  if (!org.responsible_appointed_at) return { state: 'undated' };
  const due = addBusinessDays(org.responsible_appointed_at, AIPI_DAYS);
  if (calendarDay(now) > due) return { state: 'overdue', due };
  return { state: 'pending', due, left: businessDaysLeft(now, due) };
}

/** «a, b y c» con la conjunción del idioma (en castellano, «e» delante de «i»: «… e invitar a alguien») */
export function joinList(items, and) {
  if (items.length < 2) return items.join('');
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(', ')} ${and === 'y' && /^h?i/i.test(last) ? 'e' : and} ${last}`;
}

const R = 17;
const LEN = 2 * Math.PI * R;

const FOLD_KEY = 'reportia-steps-folded';
const readFold = () => { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch { return false; } };

/**
 * Tarjeta del tablero: anillo «3/5» y lo que falta. Lleva a Compartir el canal. Se puede plegar a una
 * píldora pequeña («Primeros pasos · 3/5»); la elección se recuerda solo en este navegador.
 */
export function StepsRing({ state, p }) {
  const o = p.onb;
  const [folded, setFolded] = useState(readFold);
  const toggle = () => setFolded(v => { try { localStorage.setItem(FOLD_KEY, v ? '0' : '1'); } catch { /* sin almacenamiento: vale solo para esta visita */ } return !v; });
  const missing = STEPS.filter(s => !state.done[s]).map(s => o.short[s]);
  // Con el canal recién creado falta casi todo: se nombran los dos primeros y se cuenta el resto
  const brief = missing.length > 3 ? [...missing.slice(0, 2), fmt(o.more, { n: missing.length - 2 })] : missing;
  const aria = `${o.title}: ${fmt(o.ringAria, { n: state.count })}. ${fmt(o.missing, { list: joinList(missing, o.and) })}`;
  const fold = (
    <button type="button" className="pn-steps-fold" aria-expanded={!folded} aria-label={folded ? o.unfold : o.fold} title={folded ? o.unfold : o.fold} onClick={toggle}>
      {folded ? <ChevronDown size={16} strokeWidth={2.6} aria-hidden="true" /> : <ChevronUp size={16} strokeWidth={2.6} aria-hidden="true" />}
    </button>
  );
  if (folded) {
    return (
      <span className="pn-steps-wrap is-folded">
        <Link className="pn-steps-pill" to="/admin/integration" aria-label={aria}>{o.title} · {state.count}/{STEPS.length}</Link>
        {fold}
      </span>
    );
  }
  return (
    <span className="pn-steps-wrap">
    <Link className="pn-steps" to="/admin/integration" aria-label={aria}>
      <span className="pn-ring" aria-hidden="true">
        <svg width="42" height="42" viewBox="0 0 42 42">
          <circle className="pn-ring-track" cx="21" cy="21" r={R} />
          {state.count > 0 && <circle className="pn-ring-on" cx="21" cy="21" r={R} strokeDasharray={`${(LEN * state.count) / STEPS.length} ${LEN}`} transform="rotate(-90 21 21)" />}
        </svg>
        <b>{state.count}/{STEPS.length}</b>
      </span>
      <span className="pn-steps-txt" aria-hidden="true">
        <b>{o.title}</b>
        <span>{fmt(o.missing, { list: joinList(brief, o.and) })}</span>
      </span>
    </Link>
    {fold}
    </span>
  );
}
