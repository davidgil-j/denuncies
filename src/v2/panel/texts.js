// Añade los textos del panel y de las exportaciones (src/translations-panel.js) a `translations`.
// Lo importa cada archivo que los usa: así están listos antes de pintar nada del panel, y quien solo
// entra al canal o a la web no los descarga.
import { translations } from '../../translations.js';
import { panelTexts } from '../../translations-panel.js';

for (const [lang, sections] of Object.entries(panelTexts)) Object.assign(translations[lang], sections);
