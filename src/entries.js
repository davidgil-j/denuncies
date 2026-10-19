// Entradas de cada zona, compartidas por App.jsx (rutas) y main.jsx (que empieza a bajar la de la página
// por la que se entra mientras React arranca). Un solo import() por módulo: el navegador no lo baja dos veces.
export const loadCanal = () => import('./v2/canal/Canal.jsx');
export const loadSite = () => import('./v2/site/V2SiteLayout.jsx');
