import { addBusinessDays, businessDaysLeft, calendarDay } from '../../lib/businessDays.js';

// Los cinco pasos de la puesta en marcha de una empresa que acaba de abrir su canal. Tres se marcan solos con lo
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
