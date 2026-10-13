// Formatos que comparten el canal, el panel, la web y las exportaciones.

/** Locale de cada idioma de la aplicación */
export const LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
export const localeOf = (lang) => LOCALES[lang] ?? 'ca-ES';

/** Tamaño de un archivo: «820 B», «45 KB», «3.2 MB» (sin «.0») */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}
