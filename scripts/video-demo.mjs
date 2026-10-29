#!/usr/bin/env node
// Graba los vídeos de la portada con la demo de verdad (Playwright) y los monta con ffmpeg (fase 5 de docs/PLAN_FASES.md).
//
//   1. Arranca la demo:  VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 3111
//   2. node scripts/video-demo.mjs   (BASE=http://localhost:3111 por defecto; --only=denuncia para uno solo; --lang=ca,en para
//      solo esos idiomas: por defecto, los tres)
//
// Una versión por idioma (es, ca, en): el producto grabado en ese idioma y los subtítulos también. Escribe en
// public/landing/video, para «denuncia» (unos 30 s) y «gestion» (unos 45 s), en 4K (H.264, CRF 18):
//   <nombre>-<idioma>.mp4        3840×2160, el producto en el ordenador
//   <nombre>-<idioma>-movil.mp4  2160×3840, el producto en el móvil (la versión que se ve en las pantallas pequeñas). Se
//                                guarda tumbado (3840×2160) con la marca de girarlo al reproducir, como guardan los móviles
//                                sus vídeos en vertical: hay decodificadores que no aceptan 3840 de alto
//   <nombre>-<idioma>.webp y <nombre>-<idioma>-movil.webp: la primera imagen de cada uno, a la misma resolución, para
//   enseñarla antes de reproducir
// Sin sonido, con los subtítulos grabados en la imagen (en una banda propia debajo de la página: nunca tapan nada), y el
// final se funde con el principio para que el bucle no salte. Avisa si un vídeo pasa de 15 MB. Necesita ffmpeg (con
// libx264) y cwebp.
// Los frames se capturan del propio navegador (CDP screencast) a la resolución final: el texto se lee nítido. Para eso
// Chromium arranca con la densidad de pantalla forzada (--force-device-scale-factor): con solo la densidad emulada, la
// captura llega a la mitad de resolución (en píxeles CSS) aunque la página se pinte a densidad 2.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../e2e/lib/playwright.mjs';
import { translations } from '../src/translations.js';
import { panelTexts } from '../src/translations-panel.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/landing/video');
const BASE = process.env.BASE ?? 'http://localhost:3111';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-video-'));
const WARN_BYTES = 15_000_000;
const FPS = 30;
// La clave con la que la demo guarda sus datos en sessionStorage (src/lib/demoStore.js)
const DEMO_KEY = /const KEY = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'src/lib/demoStore.js'), 'utf8'))[1];

// ── Lo que cambia con el idioma: los subtítulos, lo que se escribe y el caso de ejemplo que se abre en el panel ──
// Los subtítulos se escriben para cada idioma (no se traducen palabra por palabra). Los botones que se pulsan salen de las
// traducciones del producto (labels()), así que el guion sigue funcionando si cambia un texto.
// caso: los datos de ejemplo de la demo están en castellano; en las otras versiones, el caso que se abre se graba traducido
// (solo en la grabación: la demo no cambia)
const GUION = {
  es: {
    locale: 'es-ES',
    denuncia: {
      caps: {
        inicio: 'Tu canal: un lado para denunciar y otro para gestionar',
        tema: 'Quien informa elige de qué se trata',
        relato: 'Lo explica con sus palabras y puede adjuntar pruebas',
        nombre: 'Decide si da su nombre. Por defecto, es anónima',
        codigo: 'Recibe un código secreto para seguir su caso sin dar su nombre',
        caso: 'Con el código ve cómo va su caso y habla con tu equipo',
      },
      texto: 'Un proveedor de transporte factura rutas que no aparecen en el registro de salidas.',
      archivo: 'facturas-marzo.pdf',
      mensaje: 'Puedo aportar las facturas de marzo.',
    },
    gestion: {
      caps: {
        acceso: 'Tu equipo entra con contraseña y verificación en dos pasos',
        tablero: 'El tablero: nuevas, en curso y cerradas, con los plazos legales a la vista',
        ficha: 'Cada caso dice cuál es el siguiente paso y cuántos días quedan',
        acuse: 'El acuse de recibo sale con un clic',
        respuesta: 'Respondes a quien informa, aunque no sepas quién es',
        quien: 'Decides quién lo lleva y todo queda en el historial',
        final: 'El caso ya está en curso, con su plazo de respuesta',
      },
      respuesta: 'Gracias por contarlo. Lo estamos revisando y te escribiremos esta semana.',
      caso: null,
    },
  },
  ca: {
    locale: 'ca-ES',
    denuncia: {
      caps: {
        inicio: 'El teu canal: un costat per denunciar i un altre per gestionar',
        tema: 'Qui informa tria de què es tracta',
        relato: 'Ho explica amb les seves paraules i pot adjuntar-hi proves',
        nombre: 'Decideix si diu qui és. Per defecte, és anònima',
        codigo: 'Rep un codi secret per seguir el cas sense identificar-se',
        caso: 'Amb el codi veu com va el cas i parla amb el teu equip',
      },
      texto: 'Un proveïdor de transport factura rutes que no consten al registre de sortides.',
      archivo: 'factures-marc.pdf',
      mensaje: 'Puc aportar les factures de març.',
    },
    gestion: {
      caps: {
        acceso: 'El teu equip hi entra amb contrasenya i verificació en dos passos',
        tablero: 'El tauler: noves, en curs i tancades, amb els terminis legals a la vista',
        ficha: 'Cada cas et diu quin és el pas següent i quants dies queden',
        acuse: 'L’acusament de recepció surt amb un clic',
        respuesta: 'Respons a qui informa, encara que no sàpigues qui és',
        quien: 'Tries qui el porta i tot queda a l’historial',
        final: 'El cas ja és en curs, amb el seu termini per respondre',
      },
      respuesta: "Gràcies per explicar-nos-ho. Ho estem revisant i t'escriurem aquesta setmana.",
      caso: {
        description: 'Fa unes quantes setmanes que un dels responsables del torn de nit fa comentaris de caràcter sexual a diverses companyes i s’hi acosta més del compte quan són soles als passadissos de preparació de comandes. Algunes companyes han demanat canviar de torn per no coincidir-hi. Tinc captures dels missatges que va enviar al grup de missatgeria del torn.',
        department: 'Magatzem central, torn de nit',
        incident_when: 'Des del setembre',
        involved_people: 'Un dels responsables del torn de nit',
      },
    },
  },
  en: {
    locale: 'en-GB',
    denuncia: {
      caps: {
        inicio: 'Your channel: one side to report, the other to manage',
        tema: 'The person reporting picks what it’s about',
        relato: 'They describe it in their own words and can attach evidence',
        nombre: 'They choose whether to give their name. It’s anonymous by default',
        codigo: 'They get a secret code to follow up without revealing who they are',
        caso: 'With the code, they can track the case and talk to your team',
      },
      texto: "A transport supplier is billing for routes that don't appear in the dispatch log.",
      archivo: 'march-invoices.pdf',
      mensaje: 'I can send over the March invoices.',
    },
    gestion: {
      caps: {
        acceso: 'Your team signs in with a password and two-step verification',
        tablero: 'The board: new, in progress and closed, with every legal deadline in view',
        ficha: 'Each case tells you the next step and how many days you have left',
        acuse: 'Acknowledging receipt takes one click',
        respuesta: 'You can reply to the reporter, even if you don’t know who they are',
        quien: 'Choose who handles it. Everything is logged in the case history',
        final: 'The case is now in progress, with its reply deadline',
      },
      respuesta: "Thanks for letting us know. We're looking into it and will write back this week.",
      caso: {
        description: 'For several weeks now, one of the night-shift supervisors has been making sexual comments to several female colleagues and standing closer to them than he needs to when they are alone in the order-picking aisles. Some of them have asked to change shifts so they don’t have to work with him. I have screenshots of the messages he sent to the shift’s group chat.',
        department: 'Main warehouse, night shift',
        incident_when: 'Since September',
        involved_people: 'One of the night-shift supervisors',
      },
    },
  },
};
const LANGS = (process.argv.find(a => a.startsWith('--lang='))?.slice(7) ?? Object.keys(GUION).join(',')).split(',');
if (!LANGS.every(l => GUION[l])) { console.error(`Idiomas: ${Object.keys(GUION).join(', ')}`); process.exit(1); }

/** Los nombres de lo que se pulsa, en el idioma de la grabación (los mismos textos que enseña el producto) */
function labels(lang) {
  const t = translations[lang];
  const p = panelTexts[lang].panel;
  const re = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return {
    start: t.canal.start, fraud: re(t.canal.cats.fraud[0]), next: t.canal.next, send: re(t.canal.send), copy: t.canal.copy,
    seeCase: t.canal.seeCase, chatSend: t.ds.chatSend, moreCase: t.canal.moreCase, leaveCase: t.canal.leaveCase,
    email: p.email, enter: p.enter, nextStep: p.n1, ackSend: p.ackSend, ackSent: p.ackSent, send2: p.send, tabConv: p.tabConv,
    tabManage: p.tabManage, owner: p.owner, assigned: re(p.aAssigned.replace('{who} ', '').replace('{to}', 'Núria Soler Vidal')),
    board: p.back, colOpen: re(p.cols.open),
  };
}

// 4K. El ordenador: la página a 1280×640 con densidad 3 (3840×1920) y la banda de subtítulos de 240 px debajo = 3840×2160.
// El móvil: la página a 360×580 con densidad 6 (2160×3480) y la banda de 360 px = 2160×3840.
// La banda y su letra, a la misma escala en los dos (la de antes, 120 px a densidad 1,5 y 2)
const BAND = '#0B1230';
const FORMATS = {
  escritorio: { w: 1280, h: 640, dsf: 3, band: 240, mobile: false, suffix: '', crf: 18, cap: { font: 77, max: 3390 } },
  movil: { w: 360, h: 580, dsf: 6, band: 360, mobile: true, suffix: '-movil', crf: 18, cap: { font: 84, max: 1980 }, tumbado: true },
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
function recorderInit({ mobile, lang }) {
  try { localStorage.setItem('reportia-panel-lang', lang); } catch { /* sin almacenamiento */ }
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

/**
 * Antes de grabar, el caso de ejemplo en el idioma de la grabación: se cambia en los datos de la demo (sessionStorage de
 * esta pestaña) y se vuelve a cargar la página para que la demo los lea. Si la demo aún no los ha creado, se pasa antes
 * por el canal de ejemplo, que los crea
 */
async function translateCase(page, lang, caso, startUrl, ready) {
  const patch = ([key, id, data, language]) => {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const c = s.complaints.find(x => x.id === id);
    if (!c) return false;
    Object.assign(c, data, { language });
    s.audit.filter(a => a.complaint_id === id && a.action === 'created').forEach(a => { a.details.language = language; });
    sessionStorage.setItem(key, JSON.stringify(s));
    return true;
  };
  const args = [DEMO_KEY, 'c-vk7p2mqa', caso, lang];
  if (!(await page.evaluate(patch, args))) {
    await page.goto(`${BASE}/canal/demo?lang=${lang}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ds-hero');
    if (!(await page.evaluate(patch, args))) throw new Error(`No encuentro el caso de ejemplo en ${DEMO_KEY}`);
  }
  await page.goto(startUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(ready);
}

/** Una grabación: abre la página, captura cada frame del navegador y apunta cuándo empieza cada subtítulo */
async function record(browser, format, lang, video) {
  const F = FORMATS[format];
  const G = GUION[lang];
  const startUrl = video.url(lang);
  const ctx = await browser.newContext({
    viewport: { width: F.w, height: F.h }, deviceScaleFactor: F.dsf, isMobile: F.mobile, hasTouch: F.mobile,
    locale: G.locale, colorScheme: 'light', reducedMotion: 'no-preference', permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.addInitScript(recorderInit, { mobile: F.mobile, lang });
  // Nada sale del ordenador
  await ctx.route(u => !/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(startUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector(video.ready);
  const caso = G[video.name].caso;
  if (caso) await translateCase(page, lang, caso, startUrl, video.ready);
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
  // Todos los frames (el navegador solo manda uno cuando algo cambia): con everyNthFrame 2 se perdía el primero y, si la
  // página empieza quieta, la grabación empezaba tarde
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 96, maxWidth: Math.round(F.w * F.dsf), maxHeight: Math.round(F.h * F.dsf), everyNthFrame: 1 });
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
  // Si lo escrito no llega al campo (la página aún se estaba actualizando), se vuelve a escribir
  const type = async (loc, text, delay = 30) => {
    await click(loc, { after: 150 });
    await loc.pressSequentially(text, { delay });
    if ((await loc.inputValue()) !== text) { await loc.fill(''); await loc.pressSequentially(text, { delay }); }
  };

  await video.flow(page, { pause, cue, click, type, pointAt, reveal, mobile: F.mobile, L: labels(lang), G: G[video.name] });

  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await pause(200);
  await pending;
  await ctx.close();
  if (errors.length) throw new Error(`Errores en la página: ${errors.join(' · ')}`);
  return { frames, cues, tEnd, dir };
}

// ── Los subtítulos: cada uno, una imagen con fondo transparente (Manrope, como el producto) ──
// browser: uno sin la densidad forzada (la imagen sale al tamaño exacto de la banda)
async function captionImages(browser, format, cues, dir) {
  const F = FORMATS[format];
  const font = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2')).toString('base64');
  const W = Math.round(F.w * F.dsf);
  const page = await browser.newPage({ viewport: { width: W, height: F.band }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: Manrope; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
    html, body { margin: 0; }
    #band { display: grid; place-items: center; width: ${W}px; height: ${F.band}px; padding: 0 ${F.band / 5}px; box-sizing: border-box; background: ${BAND}; }
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
  // El primer subtítulo, desde la primera imagen: el póster lo lleva y el bucle no parpadea al volver al principio. Cada
  // uno empieza justo donde acaba el anterior (con un hueco de 1 ms, a veces caía un frame sin subtítulo)
  const at = cues.map((c, i) => (i === 0 ? 0 : Math.max(0, c.t - t0)).toFixed(3)).concat(total.toFixed(3));
  cues.forEach((c, i) => {
    graph += `;[v${i}][${i + 1}:v]overlay=x=0:y=${PH}:format=rgb:enable='gte(t,${at[i]})*lt(t,${at[i + 1]})'[v${i + 1}]`;
  });
  // Cortado a la duración de la grabación: el concat de ffmpeg cuenta dos veces la última imagen (repetida en la lista para
  // las versiones que no respetan su duración), y el final quedaba quieto y sin subtítulo
  const mid = path.join(dir, 'mid.mkv');
  run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${graph};[v${cues.length}]format=rgb24[vo]`, '-map', '[vo]', '-t', total.toFixed(3), '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-crf', '0', mid]);
  // En 4K, los frames ocupan cientos de MB: fuera antes del segundo paso (el disco va justo)
  frames.forEach(f => fs.rmSync(f.file, { force: true }));

  // 2 · La primera imagen (también el póster) y el fundido final hacia ella: el bucle no salta
  const first = path.join(dir, 'first.png');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mid, '-frames:v', '1', first]);
  const dur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mid]).stdout.trim());
  const fade = 0.7;
  const out = path.join(OUT, `${outName}${F.suffix}.mp4`);
  // El vertical se guarda tumbado (girado 90° a la derecha) y después se le pone la marca de girarlo 90° a la izquierda al
  // reproducir: el decodificador ve un 3840×2160 normal y la persona, el vídeo de pie
  const encoded = F.tumbado ? path.join(dir, 'tumbado.mp4') : out;
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mid, '-loop', '1', '-t', '1.2', '-i', first,
    '-filter_complex', `[0:v]fps=${FPS},format=gbrp,settb=AVTB,setsar=1[a];[1:v]fps=${FPS},format=gbrp,settb=AVTB,setsar=1[b];[a][b]xfade=transition=fade:duration=${fade}:offset=${(dur - fade).toFixed(3)}${F.tumbado ? ',transpose=1' : ''},scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`,
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', String(F.crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', encoded]);
  fs.rmSync(mid, { force: true });
  if (F.tumbado) run('ffmpeg', ['-y', '-loglevel', 'error', '-display_rotation:v:0', '90', '-i', encoded, '-c', 'copy', '-movflags', '+faststart', out]);
  // El póster, a la mitad (1920 o 1080 de ancho): se ve igual de nítido en la caja del vídeo y pesa la cuarta parte
  const poster = path.join(OUT, `${outName}${F.suffix}.webp`);
  run('cwebp', ['-quiet', '-q', '90', '-m', '6', '-resize', String(W / 2), '0', first, '-o', poster]);
  const size = fs.statSync(out).size;
  const secs = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).stdout.trim());
  console.log(`  ${path.relative(ROOT, out)}: ${W}×${H}, ${secs.toFixed(1)} s, ${(size / 1048576).toFixed(2)} MB (crf ${F.crf}) · póster ${(fs.statSync(poster).size / 1024).toFixed(0)} KB`);
  if (size > WARN_BYTES) console.log(`  AVISO: ${path.basename(out)} pasa de 15 MB`);
  // Los frames de trabajo de esta grabación ya no hacen falta (a esta resolución ocupan cientos de MB)
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Los dos recorridos ──
// L: los nombres de lo que se pulsa (labels()) · G: los subtítulos y los textos del idioma (GUION)
const VIDEOS = {
  // Quien denuncia: el canal de ejemplo, de la entrada a «Mi caso», y vuelta a la entrada (unos 30 s)
  denuncia: {
    url: (lang) => `${BASE}/canal/demo?lang=${lang}`, ready: '.ds-hero',
    async flow(page, { pause, cue, click, type, mobile, L, G }) {
      cue(G.caps.inicio);
      await pause(2000);
      await click(page.getByRole('link', { name: L.start }), { then: G.caps.tema, after: 300 });
      await page.waitForSelector('.cats');
      await pause(700);
      const fraud = page.getByRole('radio', { name: L.fraud });
      await click(fraud, { after: 350 });
      // Alguna vez el primer clic no llega a marcarlo (y «Continuar» sigue apagado): se marca antes de seguir
      if (!(await fraud.isChecked())) { await fraud.check(); await pause(300); }
      await click(page.getByRole('button', { name: L.next }), { then: G.caps.relato, after: 300 });
      await type(page.locator('#dn-description'), G.texto, 24);
      if (!mobile) {
        const pdf = path.join(WORK, G.archivo);
        fs.writeFileSync(pdf, '%PDF-1.4\n% ejemplo\n');
        await page.locator('input[type=file]').setInputFiles([pdf]);
        await page.locator('.proof-file').first().waitFor();
      }
      await pause(700);
      await click(page.getByRole('button', { name: L.next }), { then: G.caps.nombre, after: 300 });
      await page.waitForSelector('.opts');
      await pause(1300);
      await click(page.locator('#dn-privacy'), { after: 300 });
      await click(page.getByRole('button', { name: L.send }), { after: 0 });
      await page.waitForSelector('.code-big', { timeout: 15000 });
      cue(G.caps.codigo);
      await pause(2200);
      await click(page.getByRole('button', { name: L.copy }), { after: 600 });
      await click(page.getByRole('button', { name: L.seeCase }), { then: G.caps.caso, after: 0 });
      await page.waitForSelector('.mc');
      await pause(900);
      await type(page.locator('#mc-msg'), G.mensaje, 30);
      await click(page.getByRole('button', { name: L.chatSend }), { after: 0 });
      await page.locator('.ds-chat-msg.is-mine').first().waitFor();
      await pause(1700);
      if (mobile) {
        await click(page.getByRole('button', { name: L.moreCase }), { after: 300 });
        await click(page.getByRole('dialog').getByRole('button', { name: L.leaveCase }), { then: G.caps.inicio, after: 0 });
      } else {
        await click(page.getByRole('button', { name: L.leaveCase }), { then: G.caps.inicio, after: 0 });
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
    url: (lang) => `${BASE}/admin/login?from=demo&lang=${lang}`, ready: '.ac-form',
    async flow(page, { pause, cue, click, type, mobile, L, G }) {
      cue(G.caps.acceso);
      await pause(1100);
      await type(page.getByLabel(L.email), 'laura.puig@empresa-demo.es', 20);
      await type(page.locator('#ac-pw'), 'contraseña-larga', 22);
      await click(page.getByRole('button', { name: L.enter }), { after: 0 });
      await page.waitForSelector('.ds-otp');
      await pause(500);
      await click(page.locator('.ds-otp-box').first(), { after: 100 });
      await page.keyboard.type('481902', { delay: 130 });
      await page.waitForURL(/\/admin\/?(\?.*)?$/, { timeout: 10000 });
      await page.waitForSelector('.ds-case');
      cue(G.caps.tablero);
      await pause(4300);
      const card = page.locator('.ds-case', { hasText: 'REF-7P2MQA' }).first();
      await click(card.getByRole('link').first(), { then: G.caps.ficha, after: 0 });
      await page.waitForSelector('.cs');
      await pause(3800);
      await click(page.locator('.cs-next').getByRole('button', { name: L.nextStep }), { then: G.caps.acuse, after: 1300 });
      await click(page.getByRole('dialog').getByRole('button', { name: L.ackSend, exact: true }), { after: 0 });
      await page.getByText(L.ackSent).first().waitFor({ timeout: 8000 });
      await pause(1500);
      if (mobile) await click(page.getByRole('tab', { name: L.tabConv, exact: true }), { then: G.caps.respuesta, after: 400 });
      else cue(G.caps.respuesta);
      // El acuse ya está en la conversación: la ficha ha terminado de actualizarse
      await page.locator('.ds-chat-msg.is-mine').first().waitFor({ state: 'attached' });
      await type(page.locator('#cs-msg'), G.respuesta, 22);
      await click(page.locator('.ds-compose').getByRole('button', { name: L.send2 }), { after: 0 });
      await page.locator('.ds-chat-msg.is-mine', { hasText: G.respuesta.slice(0, 20) }).waitFor();
      await pause(1800);
      if (mobile) await click(page.getByRole('tab', { name: L.tabManage, exact: true }), { then: G.caps.quien, after: 400 });
      else cue(G.caps.quien);
      const who = page.getByLabel(L.owner);
      await click(who, { after: 200 });
      await who.selectOption({ label: 'Núria Soler Vidal' });
      await page.locator('.cs-hist').getByText(L.assigned).waitFor();
      await pause(400);
      await page.locator('.cs-hist').evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await pause(2400);
      const back = mobile ? page.locator('.cs-bar').getByRole('link', { name: L.board }) : page.getByRole('link', { name: L.board }).first();
      await click(back, { then: G.caps.final, after: 0 });
      await page.waitForSelector('.ds-case');
      if (mobile) await click(page.getByRole('tab', { name: L.colOpen }), { after: 200 });
      await pause(600);
      await page.locator('.ds-case', { hasText: 'REF-7P2MQA' }).first().evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await pause(3300);
    },
  },
};

fs.mkdirSync(OUT, { recursive: true });
// Un Chromium por formato, con su densidad forzada (ver arriba), y otro normal para los subtítulos
const browsers = Object.fromEntries(await Promise.all(Object.entries(FORMATS).map(async ([format, F]) => [format, await chromium.launch({ args: [`--force-device-scale-factor=${F.dsf}`] })])));
const plain = await chromium.launch();
try {
  for (const lang of LANGS) {
    for (const [name, v] of Object.entries(VIDEOS)) {
      if (only && only !== name) continue;
      for (const format of Object.keys(FORMATS)) {
        console.log(`Grabando ${name} en ${lang} (${format})…`);
        // A veces un clic o lo escrito no llega a la página (va cargada con la captura): se graba otra vez desde el principio
        let rec;
        for (let attempt = 1; !rec; attempt++) {
          try {
            rec = await record(browsers[format], format, lang, { ...v, name });
          } catch (e) {
            await Promise.all(browsers[format].contexts().map(c => c.close().catch(() => {})));
            if (attempt >= 3) throw e;
            console.log(`  falló (${e.message.split('\n')[0]}): se repite`);
          }
        }
        const caps = await captionImages(plain, format, rec.cues, rec.dir);
        assemble(rec, caps, format, `${name}-${lang}`);
      }
    }
  }
} finally {
  await Promise.all([...Object.values(browsers), plain].map(b => b.close()));
  fs.rmSync(WORK, { recursive: true, force: true });
}
console.log('Hecho.');
