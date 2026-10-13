// Entrades de cada zona, compartides per App.jsx (rutes) i main.jsx (que comença a baixar la de la pàgina
// on s'entra mentre React arrenca). Un sol import() per mòdul: el navegador no el baixa dues vegades.
export const loadCanal = () => import('./v2/canal/Canal.jsx');
export const loadSite = () => import('./v2/site/V2SiteLayout.jsx');
export const loadLanding = () => import('./v2/site/V2Landing.jsx');
