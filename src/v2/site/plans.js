import { LOCALES } from '../../lib/format.js';
import { PLANES, DIAS_PRUEBA, CORREO_CONTACTO } from '../config/producto.js';

/**
 * Tarifas y datos comerciales de Reportia. Los valores viven en src/v2/config/producto.js (las decisiones de negocio
 * en un solo sitio; ver docs/DECISIONES_TOMADAS.md): aquí solo se adaptan para la portada y la cuenta del panel.
 * price: cuota anual en euros, sin IVA. null = a medida (se habla con la empresa).
 */
export const PLANS = PLANES.map(p => ({ id: p.id, price: p.precio }));

/** Días de prueba de una cuenta nueva. Tiene que coincidir con la migración 009 (trial_ends_at). */
export const TRIAL_DAYS = DIAS_PRUEBA;

/** Correo de contacto comercial y de soporte. */
export const CONTACT_EMAIL = CORREO_CONTACTO;

const LOCALE = LOCALES;

/** 390 → "390 €" según el idioma */
export function formatPrice(amount, lang) {
  return new Intl.NumberFormat(LOCALE[lang] ?? 'es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
