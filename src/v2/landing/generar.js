// La portada de Reportia, como página estática: una por idioma, generada al compilar (y al vuelo con `npm run dev`) por el
// plugin de vite.config.js. Sin React: se lee sin JavaScript, pinta a la primera y no se mueve nada mientras carga.
// En azul noche, con lo urgente delante y el producto de verdad como imagen (29 oct 2026), en Switzer: la franja
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

/** Las capturas del producto en el inicio (public/landing/producto, sacadas de los vídeos 4K), en el idioma de la página */
const shot = (name, lang) => ({ src: `/landing/producto/${name}-${lang}-s.webp`, srcset: `/landing/producto/${name}-${lang}-s.webp 1x, /landing/producto/${name}-${lang}.webp 2x` });

/**
 * La página entera de un idioma.
 *   T: los textos de ese idioma (translations[lang] con los de la web) · P: src/v2/config/producto.js
 *   assets: { css (texto), js (ruta), font (ruta de la tipografía, Switzer), video: por idioma, { report, manage }
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

  // La marca: el logotipo oficial (verde, sobre la foto oscura) y el nombre del producto
  const marca = () => `
      <a class="lp-brand" href="${here(lang)}" aria-label="${esc(s.homeLabel)}">
        <img src="/marca/reportia-logo.svg" width="116" height="24" alt="${esc(P.EMPRESA)}" fetchpriority="high">
        ${nombre ? `<span class="lp-brand-name">${esc(nombre)}</span>` : ''}
      </a>`;

  const langs = (cls) => `
      <ul class="${cls}" aria-label="${esc(T.v2.langGroup)}">
        ${LANGS.map(l => `<li><a href="${here(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a></li>`).join('')}
      </ul>`;

  const nav = [['#ley', x.navLaw], ['#funciona', x.navHow], ['#precio', x.navPrice]];

  // ── Arriba del todo, sobre la foto: la franja roja de la Autoridad y la cabecera fina ──
  // A la izquierda, la marca y los apartados de esta página. A la derecha, lo que no es de la página: el idioma, «Acceder»
  // (para quien ya tiene cuenta, como botón secundario) y «Crear el canal», en el azul del producto
  const cabecera = `
  <div class="lp-masthead">
    <div class="lp-alert">
      <p class="lp-wrap">${esc(x.alert)}</p>
    </div>
    <header class="lp-top">
      <div class="lp-wrap lp-top-in">
        ${marca()}
        <nav class="lp-nav" aria-label="${esc(s.navLabel)}">
          <ul>${nav.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ul>
        </nav>
        <div class="lp-top-tools">
          ${langs('lp-langs lp-top-langs')}
          <a class="lp-btn is-ghost-light is-sm lp-top-login" href="${login}">${esc(s.navLogin)}</a>
        </div>
        <a class="lp-btn is-sm lp-top-cta" href="${signup}"><span class="lp-cta-long">${esc(x.navCta)}</span><span class="lp-cta-short">${esc(x.navCtaShort)}</span></a>
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
    </header>
  </div>`;

  // ── Inicio: sobre azul noche, la obligación y la multa a la izquierda y, como imagen, el producto de verdad a la derecha
  // (el panel con los plazos de cada denuncia y, delante, el móvil con el código secreto). Debajo, en una fila, los cuatro
  // datos de la ley (la cifra y una frase entera) con sus artículos al pie ──
  const ficha = [
    [x.lawBoxV[0], x.lawBox[0]],
    [euros(P.MULTA.maximo, lang), x.lawBox[1], true],
    [x.lawBoxV[1], x.lawBox[2]],
    [x.lawBoxV[2], x.lawBox[3]],
  ];
  const fuente = fmt(esc(x.lawBoxSource), Object.fromEntries([9, 10, 63, 65].map(n => [`a${n}`, ext(boeArt(n), n)])));
  const panel = shot('panel', lang);
  const movil = shot('movil', lang);
  const inicio = `
  <section class="lp-hero" aria-labelledby="lp-h1">
    <div class="lp-wrap lp-hero-in">
      <div class="lp-hero-text">
        <h1 id="lp-h1">${esc(x.title)}</h1>
        <p class="lp-hero-sub">${esc(x.leadA)} ${fmt(esc(x.leadFine), { fine: `<b>${esc(multa)}</b>` })} ${esc(x.leadB)}</p>
        <p class="lp-cta">
          <a class="lp-btn" href="${signup}">${esc(x.cta)}${icono('arrow-right')}</a>
          <a class="lp-btn is-ghost-light" href="${demo}">${esc(s.navDemo)}</a>
        </p>
        <p class="lp-hero-note">${esc(trial)}</p>
      </div>
      <div class="lp-shots">
        <img class="lp-shot-panel" src="${panel.src}" srcset="${panel.srcset}" width="1200" height="600" alt="${esc(x.shotPanel)}" fetchpriority="high" decoding="async">
        <img class="lp-shot-phone" src="${movil.src}" srcset="${movil.srcset}" width="450" height="525" alt="${esc(x.shotPhone)}" decoding="async">
      </div>
      <div class="lp-facts" role="group" aria-labelledby="lp-facts-t">
        <h2 class="lp-vh" id="lp-facts-t">${esc(x.lawBoxTitle)}</h2>
        <dl>
          ${ficha.map(([v, l, fine]) => `<div${fine ? ' class="is-fine"' : ''}><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join('')}
        </dl>
        <p class="lp-facts-source">${fuente}</p>
      </div>
    </div>
  </section>`;

  // Un apartado: a la izquierda su título (y, si lo tiene, una frase que lo explica); a la derecha, el contenido. Sin número
  // ni rótulo encima: el título carga solo
  const apartado = (id, titulo, body, lead = '') => `
  <section class="lp-sec" id="${id}" aria-labelledby="lp-${id}-t">
    <div class="lp-wrap lp-sec-in">
      <header class="lp-sec-head">
        <h2 class="lp-sec-title" id="lp-${id}-t">${esc(titulo)}</h2>
        ${lead ? `<p class="lp-sec-lead">${esc(lead)}</p>` : ''}
      </header>
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
      <header class="lp-show-head">
        <h2 class="lp-show-title" id="lp-show-t">${esc(x.videoTitle)}</h2>
        <p class="lp-show-lead">${esc(x.videoLead)}</p>
      </header>
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

  // ── Lo que te puede pedir la Autoridad: una tabla de dos columnas, lo que pide la ley y cómo lo tienes con Reportia ──
  const pedir = apartado('ley', x.askTitle, `
        <table class="lp-ask">
          <thead><tr><th scope="col">${esc(x.askColLaw)}</th><th scope="col">${esc(x.askColUs)}</th></tr></thead>
          <tbody>
            ${x.ask.map(r => `<tr><th scope="row">${esc(r.t)} <span class="lp-ask-art">${ext(boeArt(r.n), fmt(x.art, { n: r.art }))}</span></th><td>${esc(r.d)}</td></tr>`).join('')}
          </tbody>
        </table>`, x.askLead);

  // ── Empieza hoy: los tres pasos en fila, cada uno con su título y una frase (el número es el orden de verdad) ──
  const activo = apartado('empezar', x.howTitle, `
        <ol class="lp-steps">
          ${x.how.map((h, i) => `<li><span class="lp-step-n" aria-hidden="true">${i + 1}</span><h3>${esc(h.t)}</h3><p>${esc(h.d)}</p></li>`).join('')}
        </ol>`);

  // ── Anónimo de verdad: cuatro garantías, en dos columnas ──
  const anonimo = apartado('anonimo', x.anonTitle, `
        <ul class="lp-anon">
          ${x.anon.map(r => `<li><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p></li>`).join('')}
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

  // ── Cierre: sobre azul noche, la frase de la urgencia y los dos botones ──
  const cierre = `
  <section class="lp-end" aria-labelledby="lp-end-t">
    <div class="lp-wrap lp-end-in">
      <h2 id="lp-end-t">${esc(x.endTitle)}</h2>
      <p class="lp-cta">
        <a class="lp-btn" href="${signup}">${esc(x.cta)}${icono('arrow-right')}</a>
        <a class="lp-btn is-ghost-light" href="${demo}">${esc(s.navDemo)}</a>
      </p>
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
  <meta name="theme-color" content="#0B1230">
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
  <link rel="preload" href="${assets.font}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" as="image" href="${panel.src}" imagesrcset="${panel.srcset}" media="(min-width: 1081px)" fetchpriority="high">
  <style>@font-face { font-family: 'Switzer'; font-style: normal; font-weight: 100 900; font-display: swap; src: url(${assets.font}) format('woff2'); }
${assets.css}</style>
  <script src="${assets.js}" defer></script>
</head>
<body>
  <a class="lp-skip" href="#main">${esc(T.v2.skip)}</a>
${cabecera}
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
