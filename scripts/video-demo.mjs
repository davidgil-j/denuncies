#!/usr/bin/env node
// Graba los vídeos de la portada con la demo de verdad (Playwright) y los monta con ffmpeg (fase 5 de docs/PLAN_FASES.md).
//
//   1. Arranca la demo:  VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 3111
//   2. node scripts/video-demo.mjs                 (BASE=http://localhost:3111 por defecto; --only=denuncia para uno solo)
//
// Escribe en public/landing/video, para «denuncia» (unos 30 s) y «gestion» (unos 45 s):
//   <nombre>.mp4        1920×1080, el producto en el ordenador
//   <nombre>-movil.mp4  720×1280, el producto en el móvil (la versión ligera que se ve en los teléfonos)
//   <nombre>.webp y <nombre>-movil.webp: la primera imagen de cada uno, para enseñarla antes de reproducir
// Sin sonido, con subtítulos en castellano grabados en la imagen (en una banda propia debajo de la página: nunca tapan nada),
// y el final se funde con el principio para que el bucle no salte. Cada archivo pesa menos de 10 MB (si no, se vuelve a comprimir). Necesita ffmpeg (con libx264) y cwebp.
// Los frames se capturan del propio navegador (CDP screencast) a la resolución final: el texto se lee nítido.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../e2e/lib/playwright.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/landing/video');
const BASE = process.env.BASE ?? 'http://localhost:3111';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-video-'));
const MAX_BYTES = 10 * 1024 * 1024;
const FPS = 30;

// El ordenador: la página a 1280×640 con densidad 1,5 (1920×960) y la banda de subtítulos de 120 px debajo = 1920×1080.
// El móvil: la página a 360×580 con densidad 2 (720×1160) y la banda de 120 px = 720×1280
const BAND = '#0B1230';
const FORMATS = {
  escritorio: { w: 1280, h: 640, dsf: 1.5, band: 120, mobile: false, suffix: '', crf: 24, cap: { font: 38, max: 1700 } },
  movil: { w: 360, h: 580, dsf: 2, band: 120, mobile: true, suffix: '-movil', crf: 27, cap: { font: 28, max: 660 } },
};

for (const bin of ['ffmpeg', 'cwebp']) {
  if (spawnSync(bin, ['-version']).error) { console.error(`Falta ${bin} (brew install ${bin === 'cwebp' ? 'webp' : 'ffmpeg'})`); process.exit(1); }
}
const run = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${bin} ${args.slice(0, 6).join(' ')}…\n${(r.stderr || '').slice(-1500)}`);
  return r;
};

// ── Lo que se inyecta en la página mientras se graba: el puntero (o el toque, en el móvil) y sin barras de desplazamiento ──
function recorderInit({ mobile }) {
  try { localStorage.setItem('reportia-panel-lang', 'es'); } catch { /* sin almacenamiento */ }
  const add = () => {
    if (document.getElementById('rec-cursor')) return;
    const st = document.createElement('style');
    st.textContent = `
      html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }
      #rec-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; will-change: transform; }
      #rec-cursor svg { display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
      #rec-cursor .tap { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; border-radius: 50%;
        background: rgba(13,21,48,.22); box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 0 0 3px rgba(13,21,48,.25); opacity: 0; transform: scale(.6); }
      #rec-cursor.is-down .tap { animation: rec-tap 520ms ease-out; }
      #rec-cursor.is-down svg { transform: scale(.9); transform-origin: 3px 3px; }
      @keyframes rec-tap { 0% { opacity: 0; transform: scale(.6); } 25% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.25); } }`;
    document.documentElement.append(st);
    const c = document.createElement('div');
    c.id = 'rec-cursor';
    c.innerHTML = mobile ? '<span class="tap"></span>'
      : '<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 2v19.5l5.2-5 3.4 7.6 3.3-1.5-3.3-7.4H18z" fill="#0D1530" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    c.style.transform = `translate(${Math.round(innerWidth * 0.62)}px, ${Math.round(innerHeight * 0.72)}px)`;
    document.documentElement.append(c);
  };
  if (document.documentElement && document.readyState !== 'loading') add();
  else document.addEventListener('DOMContentLoaded', add);
}

/** Una grabación: abre la página, captura cada frame del navegador y apunta cuándo empieza cada subtítulo */
async function record(browser, format, startUrl, ready, flow) {
  const F = FORMATS[format];
  const ctx = await browser.newContext({
    viewport: { width: F.w, height: F.h }, deviceScaleFactor: F.dsf, isMobile: F.mobile, hasTouch: F.mobile,
    locale: 'es-ES', colorScheme: 'light', reducedMotion: 'no-preference', permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.addInitScript(recorderInit, { mobile: F.mobile });
  // Nada sale del ordenador
  await ctx.route(u => !/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(startUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(ready);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);

  const dir = fs.mkdtempSync(path.join(WORK, `${format}-`));
  const frames = [];
  const cues = [];
  const cdp = await ctx.newCDPSession(page);
  let pending = Promise.resolve();
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    frames.push({ t: metadata?.timestamp ?? Date.now() / 1000, file });
    pending = pending.then(() => fs.promises.writeFile(file, Buffer.from(data, 'base64')));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: Math.round(F.w * F.dsf), maxHeight: Math.round(F.h * F.dsf), everyNthFrame: 1 });
  await page.waitForTimeout(150);

  // ── Las acciones, a ritmo de persona ──
  const pause = (ms) => page.waitForTimeout(ms);
  const cue = (text) => { cues.push({ text, t: Date.now() / 1000 }); };
  // Si lo que se va a tocar no está a la vista (o queda bajo el subtítulo), se desplaza con suavidad hasta él
  const reveal = async (loc) => {
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    // Lo justo: si queda por debajo, sube hasta que se ve con un margen; si queda por encima, baja. Lo de arriba no se pierde
    const moved = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const fixedBottom = [...document.querySelectorAll('body *')].some(n => getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().bottom >= innerHeight - 1 && n.getBoundingClientRect().height < innerHeight / 3 && !n.contains(el)) ? 90 : 0;
      const low = innerHeight - 24 - fixedBottom;
      if (r.top >= 70 && r.bottom <= low) return false;
      const canScroll = document.scrollingElement.scrollHeight > innerHeight + 1;
      if (!canScroll) { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return true; }
      window.scrollBy({ top: r.bottom > low ? r.bottom - low + 32 : r.top - 96, behavior: 'smooth' });
      return true;
    });
    if (moved) await pause(750);
  };
  const pointAt = async (loc, ms = 480) => {
    await reveal(loc);
    const b = await loc.boundingBox();
    const x = Math.round(b.x + Math.min(b.width / 2, F.mobile ? b.width / 2 : 40 + b.width * 0.25));
    const y = Math.round(b.y + b.height / 2);
    await page.evaluate(([px, py, d, mobile]) => {
      const c = document.getElementById('rec-cursor');
      if (!c) return;
      c.style.transition = mobile ? 'none' : `transform ${d}ms cubic-bezier(.35,.7,.25,1)`;
      c.style.transform = `translate(${px}px, ${py}px)`;
    }, [x, y, ms, F.mobile]);
    if (!F.mobile) await pause(ms + 60);
  };
  const press = async () => {
    await page.evaluate(() => { const c = document.getElementById('rec-cursor'); if (!c) return; c.classList.remove('is-down'); void c.offsetWidth; c.classList.add('is-down'); });
    await pause(F.mobile ? 160 : 120);
  };
  // then: el subtítulo que empieza justo al pulsar (lo que se ve a continuación)
  const click = async (loc, { after = 400, then = null } = {}) => {
    await pointAt(loc);
    await press();
    await loc.click();
    if (then) cue(then);
    await pause(after);
  };
  const type = async (loc, text, delay = 30) => {
    await click(loc, { after: 150 });
    await loc.pressSequentially(text, { delay });
  };

  await flow(page, { pause, cue, click, type, pointAt, reveal, mobile: F.mobile });

  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await pause(200);
  await pending;
  await ctx.close();
  if (errors.length) throw new Error(`Errores en la página: ${errors.join(' · ')}`);
  return { frames, cues, tEnd, dir };
}

// ── Los subtítulos: cada uno, una imagen con fondo transparente (Manrope, como el producto) ──
async function captionImages(browser, format, cues, dir) {
  const F = FORMATS[format];
  const font = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2')).toString('base64');
  const W = Math.round(F.w * F.dsf);
  const page = await browser.newPage({ viewport: { width: W, height: F.band }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: Manrope; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
    html, body { margin: 0; }
    #band { display: grid; place-items: center; width: ${W}px; height: ${F.band}px; padding: 0 24px; box-sizing: border-box; background: ${BAND}; }
    #cap { max-width: ${F.cap.max}px; color: #fff; font: 600 ${F.cap.font}px/1.28 Manrope, sans-serif; letter-spacing: -.005em; text-align: center; text-wrap: balance; }
  </style><div id="band"><div id="cap"></div></div>`);
  await page.evaluate(() => document.fonts.ready);
  const files = [];
  for (const [i, c] of cues.entries()) {
    await page.evaluate((t) => { document.getElementById('cap').textContent = t; }, c.text);
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(dir, `cap${i}.png`);
    await page.locator('#band').screenshot({ path: file });
    files.push(file);
  }
  await page.close();
  return files;
}

// ── El montaje: frames → vídeo a 30 fps con los subtítulos → el final se funde con la primera imagen → H.264 ──
function assemble({ frames, cues, tEnd, dir }, capFiles, format, outName) {
  const F = FORMATS[format];
  const W = Math.round(F.w * F.dsf);
  const PH = Math.round(F.h * F.dsf);
  const H = PH + F.band;
  const t0 = frames[0].t;
  const list = [];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : tEnd;
    list.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file '${frames.at(-1).file}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  const total = tEnd - t0;

  // 1 · Los frames y los subtítulos, sin pérdida y en RGB (los colores se convierten una sola vez, al final)
  const inputs = ['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt')];
  capFiles.forEach(f => inputs.push('-i', f));
  let graph = `[0:v]fps=${FPS},scale=${W}:${PH}:flags=lanczos,format=rgb24,pad=${W}:${H}:0:0:color=0x${BAND.slice(1)},setsar=1[v0]`;
  cues.forEach((c, i) => {
    const a = Math.max(0, c.t - t0);
    const b = i + 1 < cues.length ? cues[i + 1].t - t0 : total;
    graph += `;[v${i}][${i + 1}:v]overlay=x=0:y=${PH}:format=rgb:enable='between(t,${a.toFixed(3)},${(b - 0.001).toFixed(3)})'[v${i + 1}]`;
  });
  const mid = path.join(dir, 'mid.mkv');
  run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${graph};[v${cues.length}]format=rgb24[vo]`, '-map', '[vo]', '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-crf', '0', mid]);

  // 2 · La primera imagen (también el póster) y el fundido final hacia ella: el bucle no salta
  const first = path.join(dir, 'first.png');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mid, '-frames:v', '1', first]);
  const dur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mid]).stdout.trim());
  const fade = 0.7;
  const out = path.join(OUT, `${outName}${F.suffix}.mp4`);
  let crf = F.crf;
  for (;;) {
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mid, '-loop', '1', '-t', '1.2', '-i', first,
      '-filter_complex', `[0:v]fps=${FPS},format=gbrp,settb=AVTB,setsar=1[a];[1:v]fps=${FPS},format=gbrp,settb=AVTB,setsar=1[b];[a][b]xfade=transition=fade:duration=${fade}:offset=${(dur - fade).toFixed(3)},scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`,
      '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]);
    if (fs.statSync(out).size <= MAX_BYTES || crf >= 36) break;
    crf += 2;
  }
  const poster = path.join(OUT, `${outName}${F.suffix}.webp`);
  run('cwebp', ['-quiet', '-q', F.mobile ? '78' : '80', '-m', '6', first, '-o', poster]);
  const secs = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).stdout.trim());
  console.log(`  ${path.relative(ROOT, out)}: ${W}×${H}, ${secs.toFixed(1)} s, ${(fs.statSync(out).size / 1048576).toFixed(2)} MB (crf ${crf}) · póster ${(fs.statSync(poster).size / 1024).toFixed(0)} KB`);
}

// ── Los dos recorridos ──
const VIDEOS = {
  // Quien denuncia: el canal de ejemplo, de la entrada a «Mi caso», y vuelta a la entrada (unos 30 s)
  denuncia: {
    url: `${BASE}/canal/demo?lang=es`, ready: '.ds-hero',
    async flow(page, { pause, cue, click, type, mobile }) {
      cue('Tu canal: un lado para denunciar y otro para gestionar');
      await pause(2000);
      await click(page.getByRole('link', { name: 'Presentar una denuncia' }), { then: 'Quien informa elige de qué se trata', after: 300 });
      await page.waitForSelector('.cats');
      await pause(700);
      await click(page.getByRole('radio', { name: /Fraude o corrupción/ }), { after: 350 });
      await click(page.getByRole('button', { name: 'Continuar' }), { then: 'Lo explica con sus palabras y puede adjuntar pruebas', after: 300 });
      await type(page.locator('#dn-description'), 'Un proveedor de transporte factura rutas que no aparecen en el registro de salidas.', 24);
      if (!mobile) {
        const pdf = path.join(WORK, 'facturas-marzo.pdf');
        fs.writeFileSync(pdf, '%PDF-1.4\n% ejemplo\n');
        await page.locator('input[type=file]').setInputFiles([pdf]);
        await page.locator('.proof-file').first().waitFor();
      }
      await pause(700);
      await click(page.getByRole('button', { name: 'Continuar' }), { then: 'Decide si da su nombre. Por defecto, es anónima', after: 300 });
      await page.waitForSelector('.opts');
      await pause(1300);
      await click(page.locator('#dn-privacy'), { after: 300 });
      await click(page.getByRole('button', { name: /Enviar denuncia/ }), { after: 0 });
      await page.waitForSelector('.code-big', { timeout: 15000 });
      cue('Recibe un código secreto para seguir su caso sin dar su nombre');
      await pause(2200);
      await click(page.getByRole('button', { name: 'Copiar' }), { after: 600 });
      await click(page.getByRole('button', { name: 'Ver mi caso' }), { then: 'Con el código ve cómo va su caso y habla con tu equipo', after: 0 });
      await page.waitForSelector('.mc');
      await pause(900);
      await type(page.locator('#mc-msg'), 'Puedo aportar las facturas de marzo.', 30);
      await click(page.getByRole('button', { name: 'Enviar mensaje' }), { after: 0 });
      await page.locator('.ds-chat-msg.is-mine').first().waitFor();
      await pause(1700);
      if (mobile) {
        await click(page.getByRole('button', { name: 'Más opciones' }), { after: 300 });
        await click(page.getByRole('dialog').getByRole('button', { name: 'Salir de mi caso' }), { then: 'Tu canal: un lado para denunciar y otro para gestionar', after: 0 });
      } else {
        await click(page.getByRole('button', { name: 'Salir de mi caso' }), { then: 'Tu canal: un lado para denunciar y otro para gestionar', after: 0 });
      }
      await page.waitForSelector('.ds-hero');
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      // El puntero vuelve a donde empezó: el final es igual que el principio y el bucle no salta
      await page.evaluate(() => { const c = document.getElementById('rec-cursor'); if (c) { c.style.transition = 'transform 500ms ease'; c.style.transform = `translate(${Math.round(innerWidth * 0.62)}px, ${Math.round(innerHeight * 0.72)}px)`; } });
      await pause(1000);
    },
  },
  // Quien gestiona: acceso con verificación, tablero, el caso (acuse, respuesta, quién lo lleva) y vuelta al tablero (unos 45 s)
  gestion: {
    url: `${BASE}/admin/login?from=demo&lang=es`, ready: '.ac-form',
    async flow(page, { pause, cue, click, type, mobile }) {
      cue('Tu equipo entra con contraseña y verificación en dos pasos');
      await pause(1100);
      await type(page.getByLabel('Correo'), 'laura.puig@empresa-demo.es', 20);
      await type(page.locator('#ac-pw'), 'contraseña-larga', 22);
      await click(page.getByRole('button', { name: 'Entrar' }), { after: 0 });
      await page.waitForSelector('.ds-otp');
      await pause(500);
      await click(page.locator('.ds-otp-box').first(), { after: 100 });
      await page.keyboard.type('481902', { delay: 130 });
      await page.waitForURL(/\/admin\/?(\?.*)?$/, { timeout: 10000 });
      await page.waitForSelector('.ds-case');
      cue('El tablero: nuevas, en curso y cerradas, con los plazos legales a la vista');
      await pause(4300);
      const card = page.locator('.ds-case', { hasText: 'REF-7P2MQA' }).first();
      await click(card.getByRole('link').first(), { then: 'Cada caso dice cuál es el siguiente paso y cuántos días quedan', after: 0 });
      await page.waitForSelector('.cs');
      await pause(3800);
      await click(page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }), { then: 'El acuse de recibo sale con un clic', after: 1300 });
      await click(page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }), { after: 0 });
      await page.getByText('Acuse enviado').first().waitFor({ timeout: 8000 });
      await pause(1500);
      if (mobile) await click(page.getByRole('tab', { name: 'Conversación', exact: true }), { then: 'Respondes a quien informa, aunque no sepas quién es', after: 400 });
      else cue('Respondes a quien informa, aunque no sepas quién es');
      await type(page.locator('#cs-msg'), 'Gracias por contarlo. Lo estamos revisando y te escribiremos esta semana.', 22);
      await click(page.locator('.ds-compose').getByRole('button', { name: 'Enviar' }), { after: 0 });
      await page.locator('.ds-chat-msg.is-mine', { hasText: 'Gracias por contarlo' }).waitFor();
      await pause(1800);
      if (mobile) await click(page.getByRole('tab', { name: 'Gestión', exact: true }), { then: 'Decides quién lo lleva y todo queda en el historial', after: 400 });
      else cue('Decides quién lo lleva y todo queda en el historial');
      const who = page.getByLabel('Quién lo lleva');
      await click(who, { after: 200 });
      await who.selectOption({ label: 'Núria Soler Vidal' });
      await page.locator('.cs-hist').getByText(/asignado a Núria Soler Vidal/).waitFor();
      await pause(400);
      await page.locator('.cs-hist').evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await pause(2400);
      const back = mobile ? page.locator('.cs-bar').getByRole('link', { name: 'Tablero' }) : page.getByRole('link', { name: 'Tablero' }).first();
      await click(back, { then: 'El caso ya está en curso, con su plazo de respuesta', after: 0 });
      await page.waitForSelector('.ds-case');
      if (mobile) await click(page.getByRole('tab', { name: /En curso/ }), { after: 200 });
      await pause(600);
      await page.locator('.ds-case', { hasText: 'REF-7P2MQA' }).first().evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await pause(3300);
    },
  },
};

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, v] of Object.entries(VIDEOS)) {
    if (only && only !== name) continue;
    for (const format of Object.keys(FORMATS)) {
      console.log(`Grabando ${name} (${format})…`);
      const rec = await record(browser, format, v.url, v.ready, v.flow);
      const caps = await captionImages(browser, format, rec.cues, rec.dir);
      assemble(rec, caps, format, name);
    }
  }
} finally {
  await browser.close();
}
console.log(`Hecho. Frames de trabajo en ${WORK} (se pueden borrar).`);
