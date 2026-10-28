// «Tu marca» y «Apariencia» (fase 3, marca blanca), en la demo:
//  · el administrador sube un logo (PNG o SVG; un archivo que no es imagen se rechaza), elige una de las ocho paletas,
//    lo ve en la vista previa, descarta o guarda; el panel y el canal toman la marca al guardar;
//  · cada gestor elige claro, oscuro o como el sistema, y se queda guardado;
//  · el contraste medido de la entrada, el paso 1, el tablero, la ficha y los ajustes con las ocho paletas, en claro y en oscuro.
// Uso: node marca.mjs <carpeta> <ancho>
import { chromium } from './lib/playwright.mjs';
import { audit } from './lib/contraste.mjs';

const [OUT, W] = [process.argv[2], Number(process.argv[3] ?? 1440)];
const H = W === 1440 ? 900 : 812;
const BASE = 'http://localhost:3111';
const mobile = W <= 640;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, locale: 'es-ES', colorScheme: 'light' });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 300)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 300)}`));
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!location.pathname.startsWith('/admin/login')) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } localStorage.setItem('reportia-panel-lang', 'es'); });

const go = async (path, sel) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForSelector(sel); await page.evaluate(() => document.fonts.ready); };
const cssVar = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase(), name);
const store = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')));
const toast = async (text) => { await page.locator('.pn-toast', { hasText: text }).first().waitFor({ timeout: 8000 }); };
// Un archivo de imagen hecho en la propia página (PNG con márgenes transparentes, o un SVG sin tamaño propio)
const pngWithMargins = () => page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 900; c.height = 400;
  const x = c.getContext('2d'); x.fillStyle = '#0F5E6B'; x.fillRect(200, 120, 500, 160); x.fillStyle = '#FFFFFF'; x.font = 'bold 80px sans-serif'; x.fillText('ACME', 330, 230);
  const b = await new Promise(r => c.toBlob(r, 'image/png'));
  return [...new Uint8Array(await b.arrayBuffer())];
});
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="40" height="40" rx="8" fill="#8E1F3C"/><text x="48" y="28" font-size="22" font-family="sans-serif" fill="#0D1530">Acme</text><script>alert(1)</script></svg>';

// ── 1 · Tu marca ──────────────────────────────────────────────────────
await go('/admin/ajustes', '.st-brand');
ok('«Tu marca» se ve en Equipo y ajustes', await page.getByRole('heading', { name: 'Tu marca' }).isVisible());
ok('empieza con la paleta azul y sin logo', await page.locator('.st-pal.is-on').innerText().then(t => t.includes('Azul')) && await page.locator('.st-logo-box.is-empty').isVisible());
ok('«Guardar» y «Descartar», apagados sin cambios', await page.locator('.st-brand button[type=submit]').isDisabled() && await page.locator('.st-brand').getByRole('button', { name: 'Descartar' }).isDisabled());

const file = page.locator('#st-logo-file');
await file.setInputFiles({ name: 'acme.png', mimeType: 'image/png', buffer: Buffer.from(await pngWithMargins()) });
await page.waitForSelector('.st-logo-box img');
const logo1 = await page.locator('.st-logo-box img').getAttribute('src');
const dims = await page.locator('.st-logo-box img').evaluate(i => [i.naturalWidth, i.naturalHeight]);
ok('el PNG se prepara: sin los bordes transparentes y a 480 × 160 como mucho', logo1.startsWith('data:image/png;base64,') && dims[0] <= 480 && dims[1] <= 160 && Math.abs(dims[0] / dims[1] - 500 / 160) < 0.05, dims.join(' × '));
ok('…y pesa poco', logo1.length < 110000, `${logo1.length} caracteres`);

await file.setInputFiles({ name: 'acme.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });
await page.waitForFunction((prev) => document.querySelector('.st-logo-box img')?.getAttribute('src') !== prev, logo1);
const logo2 = await page.locator('.st-logo-box img').getAttribute('src');
ok('un SVG sin tamaño propio se dibuja y se guarda como PNG (nunca el código)', logo2.startsWith('data:image/png;base64,') && !logo2.includes('svg'));

await file.setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('esto no es una imagen') });
await page.locator('.st-logo .ds-field-error').waitFor({ timeout: 8000 });
ok('un archivo que no es una imagen se rechaza y lo dice', (await page.locator('.st-logo .ds-field-error').innerText()).includes('No se ha podido leer la imagen'));
ok('…y se queda el logo de antes', (await page.locator('.st-logo-box img').getAttribute('src')) === logo2);

await page.locator('.st-pal', { hasText: 'Petróleo' }).click();
ok('la vista previa cambia al elegir una paleta', (await page.locator('.st-mini').first().evaluate(e => getComputedStyle(e).getPropertyValue('--report').trim().toUpperCase())) === '#0F5E6B');
ok('…y la del modo oscuro, con su versión oscura', (await page.locator('.st-mini.is-dark').evaluate(e => getComputedStyle(e).getPropertyValue('--report').trim().toUpperCase())) === '#6CC5D1');
ok('el panel no cambia hasta guardar', (await cssVar('--report')) === '#2F54EB');
await page.screenshot({ path: `${OUT}/${W}-01-tu-marca-sin-guardar.png`, fullPage: !mobile });

await page.locator('.st-brand').getByRole('button', { name: 'Descartar' }).click();
ok('«Descartar» vuelve a lo guardado', await page.locator('.st-pal.is-on').innerText().then(t => t.includes('Azul')) && await page.locator('.st-logo-box.is-empty').isVisible());

await file.setInputFiles({ name: 'acme.png', mimeType: 'image/png', buffer: Buffer.from(await pngWithMargins()) });
await page.waitForSelector('.st-logo-box img');
await page.locator('.st-pal', { hasText: 'Petróleo' }).click();
await page.locator('#st-brand-name').fill('Acme Logística');
await page.locator('.st-brand button[type=submit]').click();
await toast('Marca guardada');
const st = await store();
ok('se guarda en la empresa (paleta, logo y nombre)', st.org.brand_palette === 'petroleo' && st.org.brand_logo?.startsWith('data:image/png') && st.org.name === 'Acme Logística');
ok('el panel toma la paleta al guardar', (await cssVar('--report')) === '#0F5E6B');
ok('la cabecera del panel lleva el logo y el nombre', await page.locator('.pn-brand .ds-brand-logo img').isVisible() && (await page.locator('.pn-brand b').innerText()) === 'Acme Logística');
await page.screenshot({ path: `${OUT}/${W}-02-panel-con-marca.png` });

// ── 2 · El canal con la marca ────────────────────────────────────────
await go('/canal/demo?lang=es', '.ds-hero');
ok('la entrada lleva el logo, sobre su placa blanca', await page.locator('.entry-brand .ds-brand-logo img').isVisible()
  && (await page.locator('.entry-brand .ds-brand-logo').evaluate(e => getComputedStyle(e).backgroundColor)) === 'rgb(255, 255, 255)');
ok('Denunciar, sobre el color de la paleta', (await page.locator('.ds-pane.is-report').evaluate(e => getComputedStyle(e).backgroundColor)) === 'rgb(15, 94, 107)');
ok('la pestaña dice el nombre de la empresa', (await page.title()).includes('Acme Logística'));
await page.screenshot({ path: `${OUT}/${W}-03-canal-con-marca.png` });
await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
await page.waitForSelector('.cats');
ok('las pantallas de Denunciar llevan el logo en la barra de arriba', await page.locator('.flow-head .ds-brand-logo img').isVisible());
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(300);
// 8b: el canal siempre en claro, aunque el sistema esté en oscuro
ok('con el sistema en oscuro, el canal SIGUE en claro (8b)', (await page.evaluate(() => document.documentElement.dataset.theme)) !== 'dark');
const left = await page.evaluate(() => ({ local: Object.keys(localStorage).filter(k => k !== 'reportia-panel-lang'), cookies: document.cookie }));
ok('el canal no guarda nada ni en el navegador ni en cookies', left.local.length === 0 && left.cookies === '', JSON.stringify(left));
await page.screenshot({ path: `${OUT}/${W}-04-canal-sistema-oscuro.png` });
await page.emulateMedia({ colorScheme: 'light' });

// ── 3 · Apariencia de cada gestor ────────────────────────────────────
await go('/admin/ajustes', '.st-app');
await page.locator('.st-app').getByRole('radio', { name: 'Oscuro' }).click();
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
ok('«Oscuro» pone el panel en oscuro al momento', true);
ok('se guarda en el perfil', await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')).profiles.find(x => x.id === 'demo-user')?.appearance === 'dark', null, { timeout: 5000 }).then(() => true, () => false));
await go('/admin', '.ds-case');
ok('…y se mantiene al volver a entrar', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
await page.screenshot({ path: `${OUT}/${W}-05-tablero-oscuro.png` });
await go('/admin/ajustes', '.st-app');
await page.locator('.st-app').getByRole('radio', { name: 'Como el sistema' }).click();
await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
ok('«Como el sistema» sigue al sistema, también si cambia con la pantalla abierta', true);
await page.emulateMedia({ colorScheme: 'light' });
await page.locator('.st-app').getByRole('radio', { name: 'Claro' }).click();
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(300);
ok('«Claro» se queda en claro aunque el sistema esté en oscuro', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
await page.locator('.st-app').getByRole('radio', { name: 'Como el sistema' }).click();
await page.emulateMedia({ colorScheme: 'light' });

// Quitar el logo: el canal vuelve a enseñar solo el nombre
await go('/admin/ajustes', '.st-brand');
await page.locator('.st-logo').getByRole('button', { name: /Quitar/ }).click();
await page.locator('.st-brand button[type=submit]').click();
await toast('Marca guardada');
await go('/canal/demo?lang=es', '.ds-hero');
ok('sin logo, el canal enseña solo el nombre', (await page.locator('.entry-brand .ds-brand-logo').count()) === 0 && (await page.locator('.entry-brand b').innerText()) === 'Acme Logística');

// Al salir del canal y del panel, la web de Reportia no se queda con la marca ni con el modo oscuro
await page.emulateMedia({ colorScheme: 'dark' });
await go('/canal/demo?lang=es', '.ds-hero');
// La portada es una página aparte (se carga entera): no lleva nada del canal
await page.getByRole('link', { name: /Volver a Reportia/ }).click();
await page.waitForSelector('.lp-hero');
ok('la portada no se queda con la marca ni con el modo del canal', await page.evaluate(() => !document.documentElement.dataset.theme && !document.documentElement.getAttribute('style')));
// Y la web que sí es de la aplicación (el alta, a la que se llega desde el canal de ejemplo sin recargar), tampoco
await go('/canal/demo?lang=es', '.ds-hero');
await page.getByRole('link', { name: 'Crear mi canal' }).click();
await page.waitForSelector('.v2');
ok('la web de Reportia no se queda con la marca ni con el modo oscuro', !(await page.evaluate(() => document.documentElement.dataset.theme)) && (await cssVar('--report')) === '#2F54EB');
await page.emulateMedia({ colorScheme: 'light' });

// ── 4 · Contraste con las ocho paletas, en claro y en oscuro ─────────
const PALETTES = ['azul', 'marino', 'petroleo', 'bosque', 'burdeos', 'violeta', 'teja', 'grafito'];
const setPalette = (id) => page.evaluate((p) => { const k = 'reportia-demo-store-v4'; const s = JSON.parse(sessionStorage.getItem(k)); s.org.brand_palette = p; s.org.brand_logo = null; sessionStorage.setItem(k, JSON.stringify(s)); }, id);
const SCREENS = [
  ['entrada', '/canal/demo?lang=es', '.ds-hero', null],
  ['paso 1 con un tema elegido', '/canal/demo/formulario?lang=es', '.cats', async () => { await page.getByRole('radio', { name: /Fraude/ }).click(); }],
  ['tablero', '/admin', '.ds-case', null],
  ['ficha', '/admin/complaints/c-w2lc9pxa', '.cs-desc', null],
  ['ajustes', '/admin/ajustes', '.st-brand', null],
];
let total = 0;
for (const mode of ['light', 'dark']) {
  await page.emulateMedia({ colorScheme: mode });
  for (const id of PALETTES) {
    await setPalette(id);
    const bad = [];
    for (const [name, path, sel, act] of SCREENS) {
      await go(path, sel);
      if (act) await act();
      await page.waitForTimeout(250);
      for (const b of await page.evaluate(audit)) bad.push(`${name}: ${b}`);
    }
    total += bad.length;
    ok(`contraste · ${id} en ${mode === 'light' ? 'claro' : 'oscuro'} (${SCREENS.length} pantallas)`, bad.length === 0, bad.length ? `\n   · ${bad.join('\n   · ')}` : '');
  }
  await go('/canal/demo?lang=es', '.ds-hero');
  await page.screenshot({ path: `${OUT}/${W}-06-entrada-grafito-${mode}.png` });
}
await setPalette('azul');

console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n${problems.join('\n')}` : `\nsin problemas · ${PALETTES.length * 2 * SCREENS.length} pantallas medidas, ${total} combinaciones por debajo del mínimo`);
await browser.close();
process.exit(problems.length ? 1 : 0);
