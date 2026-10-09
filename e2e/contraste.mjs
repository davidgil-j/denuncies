// Contraste medido (WCAG): cada texto visible contra el fondo real que tiene detrás (componiendo las
// transparencias), y los bordes de los campos e iconos contra su fondo. Mínimos: 4,5:1 en texto (3:1 si es
// grande), 3:1 en bordes de campos e iconos.
import { chromium } from './lib/playwright.mjs';
const B = 'http://localhost:3111';
const browser = await chromium.launch();
const audit = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] === 1) break; } } let out = [255, 255, 255, 1]; for (const c of stack.reverse()) out = over(c, out); return out; };
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const hex = (c) => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bad = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; const text = n.textContent.trim();
    if (!text || !el || !vis(el) || el.closest('[data-off], .ds-vh, .v2-vh, [aria-hidden="true"], svg, option')) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.05 || (s.clip === 'rect(0px, 0px, 0px, 0px)')) { hidden = true; break; } }
    if (hidden) continue;
    const cs = getComputedStyle(el);
    const disabled = el.closest(':disabled, [aria-disabled="true"]');
    if (disabled) continue; // los controles apagados quedan fuera de la norma
    const bg = bgOf(el); const fg = over(parse(cs.color), bg);
    const size = parseFloat(cs.fontSize); const big = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5) - 0.01) { const k = `texto ${hex(fg)} sobre ${hex(bg)} · ${r.toFixed(2)}:1 · ${Math.round(size)}px`; if (!bad.has(k)) bad.set(k, text.slice(0, 38)); }
  }
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')) {
    if (!vis(el) || el.disabled || el.closest('.ds-vh')) continue;
    const cs = getComputedStyle(el); const inner = over(parse(cs.backgroundColor), bgOf(el.parentElement)); const outer = bgOf(el.parentElement);
    const border = parseFloat(cs.borderTopWidth) > 0 ? over(parse(cs.borderTopColor), outer) : null;
    const edge = Math.max(border ? ratio(border, outer) : 0, ratio(inner, outer));
    if (edge < 3 - 0.01) { const k = `campo: borde ${border ? hex(border) : 'sin borde'} y fondo ${hex(inner)} sobre ${hex(outer)} · ${edge.toFixed(2)}:1`; if (!bad.has(k)) bad.set(k, el.getAttribute('aria-label') || el.id || el.placeholder || el.tagName); }
  }
  for (const svg of document.querySelectorAll('button svg, a svg, .ds-chip svg')) {
    if (!vis(svg) || svg.closest(':disabled, [aria-disabled="true"], .ds-vh')) continue;
    const cs = getComputedStyle(svg); const bg = bgOf(svg.parentElement); const fg = over(parse(cs.stroke !== 'none' && cs.stroke ? cs.stroke : cs.color), bg);
    const r = ratio(fg, bg);
    if (r < 3 - 0.01) { const k = `icono ${hex(fg)} sobre ${hex(bg)} · ${r.toFixed(2)}:1`; if (!bad.has(k)) bad.set(k, (svg.closest('button, a')?.getAttribute('aria-label') || svg.closest('button, a, .ds-chip')?.innerText || '').trim().slice(0, 30)); }
  }
  return [...bad].map(([k, v]) => `${k} — «${v}»`);
};
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const page = await ctx.newPage();
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!location.pathname.startsWith('/admin/login') && !location.pathname.includes('password')) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } localStorage.setItem('reportia-panel-lang', 'es'); });
let total = 0; const seen = new Set();
const check = async (name) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); const res = (await page.evaluate(audit)).filter(x => { const k = x.split(' — ')[0]; if (seen.has(k)) return false; seen.add(k); return true; }); total += res.length; console.log(`${res.length ? 'MAL' : 'ok '} ${name}${res.length ? '\n   · ' + res.join('\n   · ') : ''}`); };
const go = async (path, sel) => { await page.goto(B + path, { waitUntil: 'networkidle' }); await page.waitForSelector(sel); };
await go('/canal/demo?lang=es', '.ds-hero'); await check('canal · entrada');
await page.locator('.entry-linkbtn').first().click(); await page.locator('dialog[open]').waitFor(); await check('canal · canales externos'); await page.keyboard.press('Escape');
await page.locator('.entry-linkbtn').nth(1).click(); await page.locator('dialog[open]').waitFor(); await check('canal · qué guardamos'); await page.keyboard.press('Escape');
await go('/canal/demo/denuncia?lang=es', '.cats'); await check('canal · paso 1');
await page.getByRole('radio', { name: /Fraude/ }).click(); await check('canal · paso 1 con tema elegido');
await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForSelector('#dn-description');
await page.getByRole('button', { name: 'Continuar' }).click(); await check('canal · paso 2 con error');
await page.fill('#dn-description', 'Un proveedor factura cada mes servicios de limpieza que no se prestan en la nave 2 desde marzo.'); await check('canal · paso 2');
await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForSelector('.opts');
await page.getByRole('button', { name: 'Enviar denuncia' }).click(); await check('canal · paso 3 con error');
await page.getByRole('radio', { name: /Sí, con mis datos/ }).check({ force: true }); await check('canal · paso 3 con datos');
await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).check({ force: true }); await page.locator('#dn-privacy').check();
await page.getByRole('button', { name: 'Enviar denuncia' }).click(); await page.waitForSelector('.code-big'); await check('canal · enviada');
await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.locator('dialog[open]').waitFor(); await check('canal · ¿has guardado el código?'); await page.locator('dialog[open] .ds-dialog-actions .ds-btn').last().click();
await page.waitForSelector('.mc'); await check('canal · mi caso recién enviada');
await go('/canal/demo/consulta?lang=es', 'form'); await check('canal · escribir el código');
await page.getByLabel('Tu código').fill('ZZZZ9999'); await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.waitForTimeout(900); await check('canal · código que no existe');
await page.getByLabel('Tu código').fill('F4QJ7MBN'); await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.waitForSelector('.mc'); await check('canal · mi caso cerrado');
await go('/canal/demo/privacidad?lang=es', '.priv-sec'); await check('canal · privacidad');
await go('/canal/no-existe?lang=es', '.canal-lost'); await check('canal · no existe');
await page.evaluate(() => { sessionStorage.clear(); });
await go('/admin/login?from=demo&lang=es', '.ac-form'); await check('panel · acceso');
await page.getByRole('button', { name: 'Entrar' }).click(); await check('panel · acceso con error');
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es'); await page.locator('#ac-pw').fill('una-contraseña'); await page.getByRole('button', { name: 'Entrar' }).click(); await page.waitForSelector('.ds-otp'); await check('panel · verificación');
await go('/admin/forgot-password?from=demo', '.ac-form'); await check('panel · recuperar contraseña');
await go('/admin/reset-password', '.ac-form'); await page.waitForTimeout(500); await check('panel · contraseña nueva');
await page.evaluate(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); });
await go('/admin', '.ds-case'); await check('panel · tablero');
await page.locator('.ds-case').first().hover(); await check('panel · tablero con el ratón en una tarjeta');
await page.getByRole('button', { name: 'Filtrar' }).click(); await page.locator('dialog[open]').waitFor(); await check('panel · filtros'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Más acciones' }).click(); await check('panel · menú «···»'); await page.keyboard.press('Escape');
await page.locator('.pn-avatar').click(); await check('panel · menú de la cuenta'); await page.keyboard.press('Escape');
await go('/admin?cat=other&pr=low&st=archived', '.pn-filtered'); await check('panel · tablero filtrado y vacío');
await go('/admin/complaints/c-vk7p2mqa', '.cs-desc'); await check('panel · ficha de un caso nuevo');
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click(); await page.locator('dialog[open]').waitFor(); await page.getByRole('dialog').locator('textarea').fill(''); await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click(); await check('panel · acuse con error'); await page.keyboard.press('Escape');
await go('/admin/complaints/c-w2lc9pxa', '.cs-desc'); await check('panel · ficha con datos y mensajes');
await go('/admin/complaints/c-f4qj7mbn', '.cs-desc'); await check('panel · ficha de un caso cerrado');
await go('/admin/complaints/c-p3ve8nqc', '.cs-desc'); await check('panel · ficha en investigación (crítica, vencida)');
await go('/admin/complaints/no-existe', 'h1'); await page.waitForTimeout(500); await check('panel · caso que no existe');
await go('/admin/nueva', '.rg-form'); await page.getByRole('button', { name: 'Registrar y obtener el código' }).click(); await check('panel · registrar con errores');
await go('/admin/report', '.rp-figs dd'); await check('panel · informe');
await go('/admin/integration', '.sh-qr img'); await check('panel · compartir');
await go('/admin/ajustes', '.tm-list li'); await check('panel · equipo y ajustes');
await page.getByRole('button', { name: 'Cambiar los permisos de Daniel Ortega Ruiz' }).click(); await page.waitForSelector('.tm-perms'); await check('panel · permisos'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Contratar' }).click(); await page.locator('dialog[open]').waitFor(); await check('panel · planes'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Invitar' }).click(); await page.getByRole('button', { name: 'Enviar la invitación' }).click(); await check('panel · invitar con errores'); await page.keyboard.press('Escape');
await go('/admin/mfa', '.sg-state'); await check('panel · verificación en dos pasos');
console.log(`\n${total} combinaciones por debajo del mínimo`);
await browser.close();
