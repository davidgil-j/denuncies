// Añade los textos de la web de Reportia (src/translations-site.js) a `translations`.
// Lo importa cada archivo que los usa: así están listos antes de pintar nada, y quien solo entra al canal no los descarga.
import { translations } from '../../translations.js';
import { siteTexts } from '../../translations-site.js';

for (const [lang, { v2site }] of Object.entries(siteTexts)) Object.assign(translations[lang].v2site, v2site);
