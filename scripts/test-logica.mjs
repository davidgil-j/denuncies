#!/usr/bin/env node
// Pruebas de la lógica que no necesita navegador ni base de datos. Uso: npm run test:logic
//
//  · Plazos de la Ley 2/2023 (src/lib/deadlines.js): la misma fecha en Madrid, Canarias, Londres,
//    Nueva York o Tokio, y la misma que guarda la base de datos al ampliar (Europe/Madrid).
//  · Limpieza de fotos de las denuncias anónimas (src/lib/cleanImage.js): sin EXIF, XMP ni texto.
//  · «Tu marca» (src/v2/lib/brand.js): las ocho paletas, en claro y en oscuro, pasan el contraste, y los colores
//    por defecto de src/v2/ds.css son los de la paleta azul en claro.
//  · Decisiones de producto (src/v2/config/producto.js) y la portada (src/v2/landing): coinciden con la base de datos y
//    con los textos aprobados, la portada sale entera en los tres idiomas y vercel.json da a cada visita su página.
// Para lo de las zonas horarias se vuelve a lanzar a sí mismo con TZ distintas.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ZONES = ['Europe/Madrid', 'Atlantic/Canary', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati'];

if (!process.env.LOGIC_CHILD) {
  let fail = 0;
  for (const tz of ZONES) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, TZ: tz, LOGIC_CHILD: '1' }, encoding: 'utf8' });
    process.stdout.write(`\nZona ${tz}\n${r.stdout}`);
    if (r.status !== 0) { fail++; process.stdout.write(r.stderr); }
  }
  console.log(fail ? `\n✗ fallos en ${fail} zonas` : `\n✓ todo correcto en las ${ZONES.length} zonas`);
  process.exit(fail ? 1 : 0);
}

const { deadlineInfo, extensionUntil, madridDay, addMonthsDay, dayToIso, daysBetween } = await import('../src/lib/deadlines.js');
const { cleanForAnonymous, stripJpeg, stripPng, stripWebp } = await import('../src/lib/cleanImage.js');
const { isMissingSchema } = await import('../src/lib/whenFallback.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra); } };
// Fecha de calendario tal como la verá quien mira la pantalla (en su zona)
const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ── Plazos ────────────────────────────────────────────────────────────
// 31 de agosto a las 23:30 en Canarias = 1 de septiembre a las 00:30 en Madrid (hallazgo B-1)
const late = { created_at: '2026-08-31T22:30:00Z', status: 'received' };
const i1 = deadlineInfo(late, new Date('2026-09-05T10:00:00Z'));
ok('recibida a las 00:30 de Madrid cuenta como 1 de septiembre', dayToIso(madridDay(late.created_at)) === '2026-09-01');
ok('acuse hasta el 8 de septiembre, en cualquier zona', local(i1.ackDue) === '2026-09-08', local(i1.ackDue));
ok('respuesta hasta el 1 de diciembre, en cualquier zona', local(i1.respDue) === '2026-12-01', local(i1.respDue));
ok('la ampliación promete el 1 de marzo de 2027, lo mismo que guarda la base de datos', local(extensionUntil(late.created_at)) === '2027-03-01', local(extensionUntil(late.created_at)));
ok('el 5 de septiembre quedan 3 días para el acuse', i1.ack.days === 3, String(i1.ack.days));

ok('31 de mayo + 3 meses = 31 de agosto', dayToIso(addMonthsDay(madridDay('2026-05-31'), 3)) === '2026-08-31');
ok('30 de noviembre + 3 meses = 28 de febrero', dayToIso(addMonthsDay(madridDay('2026-11-30'), 3)) === '2027-02-28');
ok('30 de noviembre de 2027 + 3 meses = 29 de febrero (bisiesto)', dayToIso(addMonthsDay(madridDay('2027-11-30'), 3)) === '2028-02-29');
ok('una fecha ampliada (AAAA-MM-DD) se respeta tal cual', local(deadlineInfo({ ...late, status: 'investigating', extended_until: '2027-03-01' }).respDue) === '2027-03-01');
ok('del 28 de marzo al 29 (cambio de hora) es 1 día', daysBetween('2026-03-28T12:00:00Z', '2026-03-29T12:00:00Z') === 1);

// Vence el último día a las 23:59 de Madrid, no antes
const r = { created_at: '2026-06-01T08:00:00Z', status: 'investigating', acknowledged_at: '2026-06-02T08:00:00Z' };
ok('el último día (1 de septiembre, 23:30 en Madrid) aún está en plazo', deadlineInfo(r, new Date('2026-09-01T21:30:00Z')).resp.state !== 'overdue');
ok('a las 00:10 del día siguiente en Madrid, vencida', deadlineInfo(r, new Date('2026-09-01T22:10:00Z')).resp.state === 'overdue');
ok('con el plazo vencido no se ofrece ampliar', deadlineInfo(r, new Date('2026-09-02T10:00:00Z')).canExtend === false);
ok('dentro de plazo sí', deadlineInfo(r, new Date('2026-08-20T10:00:00Z')).canExtend === true);

// Caso reabierto (B-2): conserva su primera respuesta, sin cuenta atrás
const reo = deadlineInfo({ ...r, status: 'investigating', answered_at: '2026-07-01T10:00:00Z' }, new Date('2026-07-10T10:00:00Z'));
ok('un caso reabierto no tiene «días para responder» (antes: undefined)', reo.resp.days === undefined && reo.resp.state === 'met' && reo.canExtend === false);
// Acuse tardío (B-13)
const lateAck = deadlineInfo({ created_at: '2026-06-01T08:00:00Z', status: 'reviewing', acknowledged_at: '2026-06-09T08:00:00Z' });
ok('un acuse enviado el día 8 está fuera de plazo', lateAck.ack.late === true);
ok('un acuse enviado el día 7 está en plazo', deadlineInfo({ created_at: '2026-06-01T08:00:00Z', status: 'reviewing', acknowledged_at: '2026-06-08T21:00:00Z' }).ack.late === false);

// ── Cuándo se prueba «la versión de antes» (B-12) ───────────────────────
ok('una columna que no existe sí indica una migración pendiente', isMissingSchema({ code: '42703', message: 'column complaints.title does not exist' }));
ok('una función que no existe, también', isMissingSchema({ code: 'PGRST202', message: 'Could not find the function public.submit_complaint' }));
ok('un error 500 o un corte de red, no', !isMissingSchema({ code: '', message: 'Failed to fetch' }) && !isMissingSchema({ code: '57014', message: 'canceling statement due to statement timeout' }));

// ── Fotos de denuncias anónimas (A2-1) ─────────────────────────────────
const has = (bytes, text) => Buffer.from(bytes).includes(Buffer.from(text, 'latin1'));
const seg = (marker, payload) => { const p = Buffer.from(payload, 'latin1'); return Buffer.concat([Buffer.from([0xff, marker, (p.length + 2) >> 8, (p.length + 2) & 0xff]), p]); };
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8]), seg(0xe0, 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0'), seg(0xe1, 'Exif\0\0GPSLatitude 41.38 Maria'), seg(0xe1, 'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>iPhone</x:xmpmeta>'),
  seg(0xfe, 'comentario de Maria'), seg(0xdb, 'tabla-de-cuantizacion'), Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x00]), Buffer.from('datos-de-la-imagen'), Buffer.from([0xff, 0xd9]),
]);
const cj = stripJpeg(new Uint8Array(jpeg));
ok('JPEG: fuera EXIF (GPS), XMP y comentarios', cj && !has(cj, 'Exif') && !has(cj, 'GPS') && !has(cj, 'xmpmeta') && !has(cj, 'Maria'));
ok('JPEG: se conserva la imagen (JFIF, tablas y datos)', cj && cj[0] === 0xff && cj[1] === 0xd8 && has(cj, 'JFIF') && has(cj, 'tabla-de-cuantizacion') && has(cj, 'datos-de-la-imagen'));
ok('JPEG roto: no se da por limpio', stripJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2])) === null);

const crc = () => Buffer.alloc(4);
const chunk = (type, data) => { const d = Buffer.from(data, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(d.length); return Buffer.concat([len, Buffer.from(type, 'latin1'), d, crc()]); };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', 'cabecera13...'), chunk('tEXt', 'Author\0Maria'), chunk('eXIf', 'GPS 41.38'), chunk('IDAT', 'pixeles'), chunk('IEND', '')]);
const cp = stripPng(new Uint8Array(png));
ok('PNG: fuera texto y EXIF, se conservan cabecera e imagen', cp && !has(cp, 'Maria') && !has(cp, 'GPS') && has(cp, 'IHDR') && has(cp, 'pixeles') && has(cp, 'IEND'));

const wchunk = (type, data) => { const d = Buffer.from(data, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32LE(d.length); return Buffer.concat([Buffer.from(type, 'latin1'), len, d, d.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
const wbody = Buffer.concat([wchunk('VP8X', Buffer.from([0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]).toString('latin1')), wchunk('VP8 ', 'imagen-webp'), wchunk('EXIF', 'GPS Maria'), wchunk('XMP ', '<x>iPhone</x>')]);
const wsize = Buffer.alloc(4); wsize.writeUInt32LE(wbody.length + 4);
const webp = Buffer.concat([Buffer.from('RIFF'), wsize, Buffer.from('WEBP'), wbody]);
const cw = stripWebp(new Uint8Array(webp));
ok('WebP: fuera EXIF y XMP, con la cabecera y el tamaño corregidos', cw && !has(cw, 'Maria') && !has(cw, 'iPhone') && has(cw, 'imagen-webp') && (cw[20] & 0x0c) === 0 && Buffer.from(cw).readUInt32LE(4) === cw.length - 8);

const f = (bytes, name, type) => new File([bytes], name, { type });
const outJ = await cleanForAnonymous(f(jpeg, 'IMG_0042_Maria.jpg', 'image/jpeg'));
ok('una JPEG que no se puede redibujar sale limpia igualmente (antes: tal cual)', !!outJ && !has(new Uint8Array(await outJ.arrayBuffer()), 'GPS'));
ok('una foto HEIC que no se puede convertir no se envía (antes: con su GPS)', (await cleanForAnonymous(f(Buffer.from('ftypheic GPS Maria'), 'IMG_0042.heic', 'image/heic'))) === null);
ok('una JPEG rota tampoco', (await cleanForAnonymous(f(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2]), 'roto.jpg', 'image/jpeg'))) === null);
const pdf = f(Buffer.from('%PDF-1.4 prueba'), 'informe.pdf', 'application/pdf');
ok('un PDF no se toca (el formulario avisa de sus datos ocultos)', (await cleanForAnonymous(pdf)) === pdf);

// ── «Tu marca»: paletas y modo oscuro ─────────────────────────────────
// Lo mismo que mide la prueba de navegador «contraste», pero de las 16 combinaciones a la vez y sin navegador
const { PALETTE_IDS, themeVars } = await import('../src/v2/lib/brand.js');
const lum = (hex) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// [texto o borde, fondo, mínimo]: 4,5 en texto; 3 en bordes de campo, iconos y el borde de lo elegido
const PAIRS = [
  ['ink', 'bg', 7], ['ink', 'surface', 7], ['muted', 'surface', 4.5], ['muted', 'bg', 4.5], ['muted', 'soft', 4.5],
  ['field-line', 'surface', 3], ['field-line', 'input-bg', 3], ['field-line-strong', 'soft', 3],
  ['report', 'surface', 4.5], ['report', 'bg', 4.5], ['on-report', 'report', 4.5], ['on-report', 'report-hover', 4.5],
  ['report-soft-ink', 'report-soft', 4.5], ['report-soft-ink', 'surface', 4.5], ['report-soft-ink', 'bg', 4.5], ['report-link-hover', 'surface', 4.5],
  ['ink', 'report-soft', 4.5], ['muted', 'report-soft', 4.5], ['report', 'report-soft', 3],
  ['on-solid', 'solid', 4.5],
  ['danger-ink', 'surface', 4.5], ['danger-ink', 'bg', 4.5], ['danger-ink', 'danger-bg', 4.5], ['warn-ink', 'surface', 4.5], ['warn-ink', 'warn-bg', 4.5],
  ['ink', 'note-bg', 4.5], ['warn-ink', 'note-bg', 4.5],
  ['on-ink', 'ink', 4.5], ['on-ink-muted', 'ink', 4.5], ['on-ink-warn', 'ink', 3], ['on-ink-danger', 'ink', 3],
];
for (const mode of ['light', 'dark']) {
  const bad = [];
  for (const id of PALETTE_IDS) {
    const v = themeVars(id, mode);
    for (const [fg, bg, min] of PAIRS) {
      const r = ratio(v[`--${fg}`], v[`--${bg}`]);
      if (r < min) bad.push(`${id}: ${fg} sobre ${bg} ${r.toFixed(2)} < ${min}`);
    }
  }
  ok(`las ocho paletas pasan el contraste en modo ${mode === 'light' ? 'claro' : 'oscuro'} (${PALETTE_IDS.length * PAIRS.length} medidas)`, bad.length === 0, bad.join(' · '));
}
const css = fs.readFileSync(new URL('../src/v2/ds.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const defaults = Object.fromEntries([...root.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const azul = themeVars('azul', 'light');
const differ = Object.keys(azul).filter(k => (defaults[k] ?? '').toUpperCase() !== String(azul[k]).toUpperCase());
ok('ds.css lleva por defecto los colores de la paleta azul en claro (los mismos que brand.js)', differ.length === 0, differ.map(k => `${k}: ${defaults[k]} ≠ ${azul[k]}`).join(' · '));
ok('una paleta desconocida se pinta con la azul', themeVars('fucsia', 'light')['--report'] === azul['--report']);

// ── Decisiones de producto y portada ──────────────────────────────────
{
  const P = await import('../src/v2/config/producto.js');
  const { translations } = await import('../src/translations.js');
  const { siteTexts } = await import('../src/translations-site.js');
  const T = (l) => ({ ...translations[l], v2site: { ...translations[l].v2site, ...siteTexts[l].v2site } });
  const m009 = fs.readFileSync(new URL('../supabase/migrations/009_organization_account.sql', import.meta.url), 'utf8');
  ok(`los días de prueba (${P.DIAS_PRUEBA}) son los de la base de datos (009)`, m009.includes(`set default (now() + interval '${P.DIAS_PRUEBA} days')`));
  ok('cada plan tiene nombre en los tres idiomas y un precio (o «a medida»)', P.PLANES.every(p => ['ca', 'es', 'en'].every(l => T(l).v2site.landing.plans[p.id]?.name) && (p.precio === null || p.precio > 0)));
  const nums = { ca: ['600.001', '1.000.000'], es: ['600.001', '1.000.000'], en: ['600,001', '1,000,000'] };
  ok('la multa de producto.js es la del texto legal aprobado, sin redondear, en los tres idiomas', P.MULTA.minimo === 600001 && P.MULTA.maximo === 1000000
    && ['ca', 'es', 'en'].every(l => nums[l].every(n => T(l).v2site.landing.oblRefs[3].text.includes(n))));
  const { generarPortada, LANGS } = await import('../src/v2/landing/generar.js');
  const { VIDEOS, landingLang } = await import('./vite-portada.mjs');
  for (const lang of LANGS) {
    const html = generarPortada({ lang, T: T(lang), P, assets: { css: '', js: '/x.js', font: '/x.woff2', video: VIDEOS, origin: 'https://canal.reportia.es' } });
    const gaps = html.match(/undefined|\[object Object\]|\bNaN\b|\{[a-z]+\}/g);
    ok(`portada en ${lang}: entera, sin huecos y con los precios y los artículos de la multa`, !gaps && html.includes(`<html lang="${lang}">`)
      && ['#a6-5', '#a6-7'].every(a => html.includes(a)) && P.PLANES.filter(p => p.precio).every(p => html.includes(String(p.precio))) && html.length < 120000, gaps?.join(' '));
  }
  ok('idioma de la portada: ?lang= manda; si no, el del navegador; castellano por defecto', landingLang('en', 'ca-ES') === 'en' && landingLang(null, 'ca-ES,ca') === 'ca'
    && landingLang(null, 'en-GB') === 'en' && landingLang(null, 'fr-FR') === 'es' && landingLang(null, '') === 'es');
  const { resolveFile } = await import('../e2e/lib/vercel.mjs');
  const empty = fs.mkdtempSync(`${(await import('node:os')).tmpdir()}/reportia-vercel-`);
  const page = (p, headers = {}) => (resolveFile(empty, { headers: { host: 'canal.reportia.es', ...headers } }, new URL(p, 'http://x')).file ?? '').replace(empty, '');
  ok('vercel.json: la raíz da la portada del idioma (y la dirección propia de una empresa, su canal)', page('/') === '/inicio-es.html' && page('/', { 'accept-language': 'ca-ES' }) === '/inicio-ca.html'
    && page('/?lang=en') === '/inicio-en.html' && page('/', { host: 'canal.acme.es' }) === '/canal.html');
  ok('vercel.json: el canal con su página y lo demás con la aplicación', page('/canal/acme') === '/canal.html' && page('/admin/login') === '/app.html' && page('/crear-compte') === '/app.html');
  fs.rmSync(empty, { recursive: true, force: true });
}

console.log(`  ${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
