/**
 * Tarifes i dades comercials de Reportia.
 *
 * PROPOSTA pendent de validar per direcció. Són els únics valors comercials del web:
 * canviant-los aquí s'actualitzen la portada (Preus) i la pàgina de compte del panell.
 * price: quota anual en euros, sense IVA. null = a mida (es parla amb l'empresa).
 */
export const PLANS = [
  { id: 'essential', price: 390 },  // fins a 249 treballadors
  { id: 'business',  price: 790 },  // de 250 a 999 treballadors
  { id: 'corporate', price: null }, // 1.000 o més, i grups d'empreses
];

/** Dies de prova d'un compte nou. Ha de coincidir amb la migració 009 (trial_ends_at). */
export const TRIAL_DAYS = 30;

/** Correu de contacte comercial i de suport. */
export const CONTACT_EMAIL = 'info@reportia.es';

const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

/** 390 → "390 €" segons l'idioma */
export function formatPrice(amount, lang) {
  return new Intl.NumberFormat(LOCALE[lang] ?? 'es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
