import { LOCALES } from '../../lib/format.js';
/**
 * Tarifas y datos comerciales de Reportia.
 *
 * PROPUESTA pendiente de validar por dirección. Son los únicos valores comerciales de la web:
 * al cambiarlos aquí se actualizan la portada (Precios) y la página de cuenta del panel.
 * price: cuota anual en euros, sin IVA. null = a medida (se habla con la empresa).
 */
export const PLANS = [
  { id: 'essential', price: 390 },  // hasta 249 trabajadores
  { id: 'business',  price: 790 },  // de 250 a 999 trabajadores
  { id: 'corporate', price: null }, // 1.000 o más, y grupos de empresas
];

/** Días de prueba de una cuenta nueva. Tiene que coincidir con la migración 009 (trial_ends_at). */
export const TRIAL_DAYS = 30;

/** Correo de contacto comercial y de soporte. */
export const CONTACT_EMAIL = 'info@reportia.es';

const LOCALE = LOCALES;

/** 390 → "390 €" según el idioma */
export function formatPrice(amount, lang) {
  return new Intl.NumberFormat(LOCALE[lang] ?? 'es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
