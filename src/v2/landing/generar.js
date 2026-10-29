// La portada de Reportia, como página estática: una por idioma, generada al compilar (y al vuelo con `npm run dev`) por el
// plugin de vite.config.js. Sin React: se lee sin JavaScript, pinta a la primera y no se mueve nada mientras carga.
// Diseño «aviso» (boceto Claude outputs/bocetos/portada-1-aviso.png, 29 oct 2026): blanca, titulares con serifa, la franja
// de la Autoridad arriba, la obligación legal en el inicio, el vídeo justo debajo y cuatro apartados. Los textos salen de
// src/translations-site.js (v2site.portada y los nombres de los planes) y las decisiones de negocio (nombre, precios, multa,
// días de prueba…) de src/v2/config/producto.js. El JavaScript (landing.js) solo añade lo opcional: los vídeos se
// reproducen solos al verse y cada apartado entra con un fundido.
import { icono } from './iconos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
const euros = (n, lang) => new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n, lang) => new Intl.NumberFormat(LOCALE[lang], { useGrouping: 'always' }).format(n);
const BOE = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513';
// Ancla de un artículo en el BOE, como boeArt() de V2Layout.jsx: hasta el 9 son a5, a9…; desde el 10, a1-2 (art. 10),
// a6-5 (art. 63), a6-7 (art. 65)…
const boeArt = (n) => `${BOE}#a${n < 10 ? n : `${Math.floor(n / 10)}-${(n % 10) + 2}`}`;
export const LANGS = ['es', 'ca', 'en'];

/**
 * La página entera de un idioma.
 *   T: los textos de ese idioma (translations[lang] con los de la web) · P: src/v2/config/producto.js
 *   assets: { css (texto), js (ruta), font y serif (rutas de las dos tipografías), video: por idioma, { report, manage }
 *   con { src, light, poster, posterLight }, origin }
 *   origin: la dirección pública (VITE_PUBLIC_ORIGIN, la misma que usa la aplicación); si no llega, la de DOMINIO
 */
export function generarPortada({ lang, T, P, assets }) {
  const s = T.v2site;
  const t = s.landing;
  const lp = s.lp;
  const x = s.portada;
  const origin = (assets.origin || `https://${P.DOMINIO}`).replace(/\/+$/, '');
  const url = (l) => (l === 'es' ? `${origin}/` : `${origin}/?lang=${l}`);
  const here = (l) => (l === 'es' ? '/' : `/?lang=${l}`);
  const demo = `/canal/demo?lang=${lang}`;
  const signup = `/crear-compte?lang=${lang}`;
  const login = `/admin/login?lang=${lang}`;
  const mail = `mailto:${P.CORREO_CONTACTO}`;
  const title = `${P.NOMBRE_PRODUCTO} · ${lp.titleA} ${lp.titleB}`;
  const nombre = P.NOMBRE_PRODUCTO.startsWith(P.EMPRESA) ? P.NOMBRE_PRODUCTO.slice(P.EMPRESA.length).trim() : P.NOMBRE_PRODUCTO;
  const trial = fmt(x.trial, { days: P.DIAS_PRUEBA });
  // Un enlace al BOE: se abre aparte y lo dice a quien usa un lector de pantalla
  const ext = (href, text, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="lp-vh"> ${esc(t.opensBoe)}</span></a>`;
  // La multa, como el BOE y sin redondear: «600.001 a 1.000.000 €»
  const multa = fmt(x.fineRange, { min: num(P.MULTA.minimo, lang), max: num(P.MULTA.maximo, lang) });

  // La marca: el logotipo oficial en verde oscuro (sobre blanco) y el nombre del producto
  const marca = (where) => `
      <a class="lp-brand" href="${here(lang)}" aria-label="${esc(s.homeLabel)}">
        <img src="/marca/reportia-logo-oscuro.svg" width="116" height="24" alt="${esc(P.EMPRESA)}"${where === 'top' ? ' fetchpriority="high"' : ''}>
        ${nombre ? `<span class="lp-brand-name">${esc(nombre)}</span>` : ''}
      </a>`;

  const langs = (cls) => `
      <ul class="${cls}" aria-label="${esc(T.v2.langGroup)}">
        ${LANGS.map(l => `<li><a href="${here(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a></li>`).join('')}
      </ul>`;

  const nav = [['#ley', x.navLaw], ['#funciona', x.navHow], ['#precio', x.navPrice]];

  // ── Cabecera blanca, fija arriba al bajar: la marca, los apartados, el idioma, «Acceder» y «Crear el canal» ──
  const cabecera = `
  <header class="lp-top">
    <div class="lp-wrap lp-top-in">
      ${marca('top')}
      <nav class="lp-nav" aria-label="${esc(s.navLabel)}">
        <ul>${nav.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')}
          <li><a href="${login}">${esc(s.navLogin)}</a></li></ul>
      </nav>
      ${langs('lp-langs lp-top-langs')}
      <a class="lp-btn is-ink is-sm" href="${signup}"><span class="lp-cta-long">${esc(x.navCta)}</span><span class="lp-cta-short">${esc(x.navCtaShort)}</span></a>
      <details class="lp-menu">
        <summary aria-label="${esc(s.menuOpen)}">${icono('menu', 22)}</summary>
        <div class="lp-menu-panel">
          <ul>${nav.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')}
            <li><a href="${login}">${esc(s.navLogin)}</a></li>
            <li><a href="${demo}">${esc(s.navDemoShort)}</a></li></ul>
          ${langs('lp-langs')}
        </div>
      </details>
    </div>
  </header>`;

  // ── La franja de aviso: la Autoridad ya funciona (Orden PJC/908/2025) ──
  const aviso = `
  <div class="lp-alert">
    <p class="lp-wrap">${esc(x.alert)}</p>
  </div>`;

  // ── Inicio: la obligación, en una frase; a la derecha, lo que dice la ley con sus artículos ──
  const ficha = [
    ['50', x.lawBox[0], [10]],
    [euros(P.MULTA.maximo, lang), x.lawBox[1], [63, 65], true],
    [x.lawBoxV[0], x.lawBox[2], [9]],
    [x.lawBoxV[1], x.lawBox[3], [9]],
  ];
  // «Art. 10» enlaza al artículo; en «Arts. 63 y 65», cada número enlaza al suyo
  const artLinks = (arts) => (arts.length > 1
    ? fmt(esc(x.arts), { a: ext(boeArt(arts[0]), arts[0]), b: ext(boeArt(arts[1]), arts[1]) })
    : ext(boeArt(arts[0]), fmt(x.art, { n: arts[0] })));
  const inicio = `
  <section class="lp-hero" aria-labelledby="lp-h1">
    <div class="lp-wrap lp-hero-in">
      <div class="lp-hero-text">
        <h1 id="lp-h1">${esc(x.title)}</h1>
        <p class="lp-hero-sub">${esc(x.leadA)} ${fmt(esc(x.leadFine), { fine: `<b>${esc(multa)}</b>` })} ${esc(x.leadB)}</p>
        <p class="lp-cta">
          <a class="lp-btn" href="${signup}">${esc(x.cta)}${icono('arrow-right')}</a>
          <a class="lp-btn is-line" href="${demo}">${esc(s.navDemo)}</a>
        </p>
        <p class="lp-hero-note">${esc(trial)}</p>
      </div>
      <aside class="lp-law-card" aria-labelledby="lp-law-card-t">
        <h2 id="lp-law-card-t">${esc(x.lawBoxTitle)}</h2>
        <dl>
          ${ficha.map(([v, l, arts, fine]) => `<div${fine ? ' class="is-fine"' : ''}><dt>${esc(v)}</dt><dd>${esc(l)}</dd><dd class="lp-art">${artLinks(arts)}</dd></div>`).join('')}
        </dl>
      </aside>
    </div>
  </section>`;

  // Un apartado: a la izquierda su título; a la derecha, el contenido. Sin número ni rótulo encima: el título carga solo
  const apartado = (id, titulo, body) => `
  <section class="lp-sec" id="${id}" aria-labelledby="lp-${id}-t">
    <div class="lp-wrap lp-sec-in">
      <h2 class="lp-sec-title" id="lp-${id}-t">${esc(titulo)}</h2>
      <div class="lp-sec-body">${body}</div>
    </div>
  </section>`;

  // ── Cómo funciona: el vídeo real de la demo, grande y justo debajo del inicio (quien denuncia y quien gestiona) ──
  // Los vídeos van en el idioma de la página (producto y subtítulos). Las dos pestañas son un grupo de radio: funcionan sin
  // JavaScript y no mueven nada al cargar
  const vids = assets.video[lang];
  const tab = (id, label, checked) => `
          <input class="lp-vtab-in" type="radio" name="lp-video" id="lp-v-${id}"${checked ? ' checked' : ''}>
          <label class="lp-vtab" for="lp-v-${id}">${icono('circle-play', 18)}${esc(label)}</label>`;
  // Hasta 760 px, la versión del móvil (el producto en el móvil, en vertical). El póster lo pone landing.js al acercarse a los
  // vídeos (data-poster, o el vertical, data-poster-light, en el móvil): si estuviera en el HTML se bajaría al cargar. Sin
  // JavaScript no hay póster: se ve el reproductor con su botón
  const player = (id, v, desc) => `
            <figure class="lp-video lp-video-${id}">
              <div class="lp-video-box">
                <video controls muted playsinline loop preload="none" data-poster="${v.poster}" data-poster-light="${v.posterLight}" aria-label="${esc(desc)}" data-video="${id}">
                  <source src="${v.light}" type="video/mp4" media="(max-width: 760px)">
                  <source src="${v.src}" type="video/mp4">
                </video>
              </div>
              <figcaption class="lp-vh">${esc(desc)}</figcaption>
            </figure>`;
  const funciona = `
  <section class="lp-show" id="funciona" aria-labelledby="lp-show-t">
    <div class="lp-wrap">
      <h2 class="lp-show-title" id="lp-show-t">${esc(x.videoTitle)}</h2>
      <div class="lp-videos" role="group" aria-label="${esc(lp.videoGroup)}">
        ${tab('report', lp.videoReport, true)}
        ${tab('manage', lp.videoManage, false)}
        <div class="lp-video-stage">
          ${player('report', vids.report, lp.videoReportDesc)}
          ${player('manage', vids.manage, lp.videoManageDesc)}
        </div>
      </div>
    </div>
  </section>`;

  // ── Lo que te pueden pedir (la Autoridad ya puede pedirlo), con su artículo ──
  const pedir = apartado('ley', x.askTitle, `
        <ul class="lp-rows">
          ${x.ask.map(r => `<li><div><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p></div>${ext(boeArt(r.n), fmt(x.art, { n: r.art }), 'lp-row-art')}</li>`).join('')}
        </ul>`);

  // ── Activo en cuanto creas la cuenta: los tres pasos en fila (el número es el orden de verdad) ──
  const activo = apartado('empezar', x.howTitle, `
        <ol class="lp-steps">
          ${x.how.map((h, i) => `<li><span class="lp-step-n" aria-hidden="true">${i + 1}</span><h3>${esc(h)}</h3></li>`).join('')}
        </ol>`);

  // ── Anónimo de verdad ──
  const anonimo = apartado('anonimo', x.anonTitle, `
        <ul class="lp-rows">
          ${x.anon.map(r => `<li><div><h3>${esc(r.t)}</h3>${r.d ? `<p>${esc(r.d)}</p>` : ''}</div></li>`).join('')}
        </ul>`);

  // ── Precio: los tres planes en una ficha ──
  const plan = (id) => t.plans[id];
  const precio = apartado('precio', x.priceTitle, `
        <ul class="lp-plans">
          ${P.PLANES.map(p => `<li>
            <h3>${esc(plan(p.id).name)}</h3>
            <p class="lp-plan-size">${esc(plan(p.id).size)}</p>
            ${p.precio != null
    ? `<p class="lp-plan-price"><b>${euros(p.precio, lang)}</b><span>${esc(t.perYear)}, ${esc(t.plusVat)}</span></p>`
    : `<p class="lp-plan-price"><b>${esc(t.custom)}</b><span>${esc(t.customNote)}</span></p>`}
          </li>`).join('')}
        </ul>
        <p class="lp-plans-note">${esc(t.priceLead)} ${esc(trial)}</p>`);

  // ── Cierre: una frase y el botón, sobre azul noche ──
  const cierre = `
  <section class="lp-end" aria-labelledby="lp-end-t">
    <div class="lp-wrap lp-end-in">
      <h2 id="lp-end-t">${esc(x.endTitle)}</h2>
      <p><a class="lp-btn is-light" href="${signup}">${esc(x.cta)}${icono('arrow-right')}</a></p>
    </div>
  </section>`;

  // ── Pie ──
  const pie = `
  <footer class="lp-foot">
    <div class="lp-wrap lp-foot-in">
      <p class="lp-foot-brand"><img src="/marca/reportia-icono-64.png" width="24" height="24" alt=""><span>${esc(s.footerName)}</span></p>
      <nav aria-label="${esc(s.footerNav)}">
        <ul>
          <li><a href="/privacitat?lang=${lang}">${esc(s.privacy.title)}</a></li>
          <li><a href="${demo}">${esc(s.navDemoShort)}</a></li>
          <li><a href="${login}">${esc(s.navLogin)}</a></li>
          <li><a href="${mail}">${esc(s.footerContact)}</a></li>
        </ul>
      </nav>
      ${langs('lp-langs')}
    </div>
  </footer>`;

  const robots = P.INDEXAR_WEB ? 'index, follow' : 'noindex, nofollow';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(s.metaDesc)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${url(lang)}">
  ${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${url(l)}">`).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${url('es')}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${LOCALE[lang].replace('-', '_')}">
  <meta property="og:site_name" content="${esc(P.NOMBRE_PRODUCTO)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(s.metaDesc)}">
  <meta property="og:url" content="${url(lang)}">
  <meta property="og:image" content="${origin}/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" sizes="32x32" href="/marca/reportia-icono-32.png">
  <link rel="apple-touch-icon" href="/marca/reportia-icono-180.png">
  <link rel="preload" href="${assets.serif}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${assets.font}" as="font" type="font/woff2" crossorigin>
  <style>@font-face { font-family: 'Manrope'; font-style: normal; font-weight: 200 800; font-display: swap; src: url(${assets.font}) format('woff2'); }
@font-face { font-family: 'Source Serif 4'; font-style: normal; font-weight: 200 900; font-display: swap; src: url(${assets.serif}) format('woff2'); }
${assets.css}</style>
  <script src="${assets.js}" defer></script>
</head>
<body>
  <a class="lp-skip" href="#main">${esc(T.v2.skip)}</a>
${cabecera}
${aviso}
  <main id="main" tabindex="-1">
${inicio}
${funciona}
${pedir}
${activo}
${anonimo}
${precio}
${cierre}
  </main>
${pie}
</body>
</html>
`;
}
