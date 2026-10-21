// La portada de Reportia (fase 5 de docs/PLAN_FASES.md), como página estática: una por idioma, generada al compilar
// (y al vuelo con `npm run dev`) por el plugin de vite.config.js. Sin React: se lee sin JavaScript, pinta a la primera
// y no se mueve nada mientras carga. Los textos salen de src/translations.js (v2site) y las decisiones de negocio
// (nombre, precios, multa, dominio…) de src/v2/config/producto.js. El JavaScript (landing.js) solo añade lo opcional,
// si la persona no ha pedido menos movimiento: los vídeos se reproducen solos al verse y cada apartado entra con un fundido.
import { icono } from './iconos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
const euros = (n, lang) => new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const BOE = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513';
// Ancla de un artículo en el BOE, como boeArt() de V2Layout.jsx: hasta el 9 son a5, a9…; desde el 10, a1-2 (art. 10),
// a6-5 (art. 63), a6-7 (art. 65)…
const boeArt = (n) => `${BOE}#a${n < 10 ? n : `${Math.floor(n / 10)}-${(n % 10) + 2}`}`;
const CAT_ICON = { fraud: 'hand-coins', harassment: 'user-round-x', discrimination: 'scale', safety: 'hard-hat', data: 'database-zap', conflict: 'handshake', accounting: 'calculator', environmental: 'leaf' };
const SEC_ICON = ['server', 'lock-keyhole', 'users-round', 'shield-check'];
export const LANGS = ['es', 'ca', 'en'];

/** Las fotos del inicio y del cierre (public/landing): el navegador baja la que toca según el ancho */
const photo = (n) => ({
  wide: `/landing/inicio-${n}-d.webp 1440w, /landing/inicio-${n}.webp 2400w`,
  tall: `/landing/inicio-${n}-s.webp 720w, /landing/inicio-${n}-m.webp 1100w`,
  src: `/landing/inicio-${n}-d.webp`,
});

/**
 * La página entera de un idioma.
 *   T: los textos de ese idioma (translations[lang]) · P: src/v2/config/producto.js
 *   assets: { css (texto), js (ruta), font (ruta), video: por idioma, { report, manage } con { src, light, poster, posterLight }, origin }
 *   origin: la dirección pública (VITE_PUBLIC_ORIGIN, la misma que usa la aplicación); si no llega, la de DOMINIO
 */
export function generarPortada({ lang, T, P, assets }) {
  const s = T.v2site;
  const t = s.landing;
  const lp = s.lp;
  const origin = (assets.origin || `https://${P.DOMINIO}`).replace(/\/+$/, '');
  const url = (l) => (l === 'es' ? `${origin}/` : `${origin}/?lang=${l}`);
  const here = (l) => (l === 'es' ? '/' : `/?lang=${l}`);
  const demo = `/canal/demo?lang=${lang}`;
  const signup = `/crear-compte?lang=${lang}`;
  const login = `/admin/login?lang=${lang}`;
  const mail = `mailto:${P.CORREO_CONTACTO}`;
  const title = `${P.NOMBRE_PRODUCTO} · ${lp.titleA} ${lp.titleB}`;
  const nombre = P.NOMBRE_PRODUCTO.startsWith(P.EMPRESA) ? P.NOMBRE_PRODUCTO.slice(P.EMPRESA.length).trim() : P.NOMBRE_PRODUCTO;
  const trial = fmt(t.trialNote, { days: P.DIAS_PRUEBA });
  const ext = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="lp-vh"> ${esc(t.opensBoe)}</span></a>`;

  // La marca: el logotipo oficial (verde, sobre oscuro) y el nombre del producto
  const marca = (where) => `
      <a class="lp-brand" href="${here(lang)}" aria-label="${esc(s.homeLabel)}">
        <img src="/marca/reportia-logo.svg" width="116" height="24" alt="${esc(P.EMPRESA)}"${where === 'top' ? ' fetchpriority="high"' : ''}>
        ${nombre ? `<span class="lp-brand-name">${esc(nombre)}</span>` : ''}
      </a>`;

  const langs = (cls) => `
      <ul class="${cls}" aria-label="${esc(T.v2.langGroup)}">
        ${LANGS.map(l => `<li><a href="${here(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a></li>`).join('')}
      </ul>`;

  const nav = [['#funciona', s.navHow], ['#ley', s.navLaw], ['#precios', s.navPricing], ['#preguntas', s.navFaq]];

  // ── Cabecera fina, sobre la foto ──
  const cabecera = `
  <header class="lp-top">
    <div class="lp-wrap lp-top-in">
      ${marca('top')}
      <nav class="lp-nav" aria-label="${esc(s.navLabel)}">
        <ul>${nav.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ul>
      </nav>
      <div class="lp-top-tools">
        ${langs('lp-langs')}
        <a class="lp-top-login" href="${login}">${esc(s.navLogin)}</a>
        <a class="lp-btn is-light is-sm" href="${signup}">${esc(s.navSignup)}</a>
      </div>
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

  // ── 1 · Inicio: la foto a sangre, el titular, una frase y los dos botones ──
  const inicio = `
  <section class="lp-hero" aria-labelledby="lp-h1">
    <picture class="lp-hero-bg">
      <source media="(max-width: 719px)" srcset="${photo(1).tall}" sizes="100vw">
      <img src="${photo(1).src}" srcset="${photo(1).wide}" sizes="100vw" alt="" width="1440" height="900" fetchpriority="high" decoding="async">
    </picture>
    <div class="lp-wrap lp-hero-in">
      <h1 id="lp-h1">${esc(lp.titleA)}<br>${esc(lp.titleB)}</h1>
      <p class="lp-hero-sub">${esc(t.promise)}</p>
      <p class="lp-cta">
        <a class="lp-btn is-light" href="${signup}">${esc(s.navSignup)}${icono('arrow-right')}</a>
        <a class="lp-btn is-ghost-light" href="${demo}">${esc(s.navDemo)}</a>
      </p>
      <p class="lp-hero-note">${esc(trial)}</p>
    </div>
  </section>`;

  // ── 2 · Cómo funciona: el vídeo real de la demo (quien denuncia y quien gestiona) y los cuatro pasos ──
  // Los vídeos van en el idioma de la página (producto y subtítulos). Las dos pestañas son un grupo de radio: funcionan sin
  // JavaScript y no mueven nada al cargar
  const vids = assets.video[lang];
  const video = (id, v, label, desc, checked) => `
        <input class="lp-vtab-in" type="radio" name="lp-video" id="lp-v-${id}"${checked ? ' checked' : ''}>
        <label class="lp-vtab" for="lp-v-${id}">${icono('circle-play', 18)}${esc(label)}</label>`;
  // Hasta 760 px, la versión del móvil (el producto en el móvil, en vertical). El póster es la primera imagen del vídeo (al
  // reproducir no cambia nada) y lo pinta el propio vídeo: si fuera una imagen aparte, el navegador la taparía con su
  // recuadro gris mientras el vídeo no arranca. Lo pone landing.js al acercarse a los vídeos (data-poster, o el vertical,
  // data-poster-light, en el móvil): van a la resolución del vídeo y, si estuvieran en el HTML, se bajarían al cargar y
  // competirían con la foto del inicio. Sin JavaScript no hay póster: se ve el reproductor con su botón
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
  <section class="lp-sec" id="funciona" aria-labelledby="lp-how-t">
    <div class="lp-wrap">
      <header class="lp-head">
        <h2 id="lp-how-t">${esc(lp.howTitle)}</h2>
        <p class="lp-lead">${esc(lp.howLead)}</p>
      </header>
      <div class="lp-videos" role="group" aria-label="${esc(lp.videoGroup)}">
        ${video('report', vids.report, lp.videoReport, lp.videoReportDesc, true)}
        ${video('manage', vids.manage, lp.videoManage, lp.videoManageDesc, false)}
        <div class="lp-video-stage">
          ${player('report', vids.report, lp.videoReportDesc)}
          ${player('manage', vids.manage, lp.videoManageDesc)}
        </div>
      </div>
      <ol class="lp-steps">
        ${lp.howShort.map((h, i) => `<li><span class="lp-n" aria-hidden="true">${i + 1}</span><div><h3>${esc(h)}</h3><p>${esc(lp.howLine[i])}</p></div></li>`).join('')}
      </ol>
    </div>
  </section>`;

  // ── 3 · Qué se puede comunicar: las ocho categorías del formulario, con un ejemplo descriptivo cada una ──
  const cats = Object.keys(CAT_ICON).map(v => ({ v, label: T.categories.find(c => c.value === v)?.label ?? v }));
  const comunicar = `
  <section class="lp-sec is-soft" id="ejemplos" aria-labelledby="lp-cat-t">
    <div class="lp-wrap">
      <header class="lp-head">
        <h2 id="lp-cat-t">${esc(lp.catTitle)}</h2>
      </header>
      <ul class="lp-cats">
        ${cats.map(c => `<li>${icono(CAT_ICON[c.v], 20)}<div><h3>${esc(c.label)}</h3><p>${esc(lp.catSay[c.v])}</p></div></li>`).join('')}
      </ul>
      <p class="lp-more"><a href="${demo}">${esc(s.navDemo)}${icono('arrow-right', 16)}</a></p>
    </div>
  </section>`;

  // ── 4 · La ley: quién está obligado, los plazos y lo que pasa si no se tiene (la multa, como un dato más) ──
  // La multa usa los textos aprobados (figs[3] y oblRefs[3], «legal: no se toca» en docs/TEXTOS_PROPUESTA.md), con
  // los dos artículos del BOE de src/v2/config/producto.js
  const facts = [
    [lp.figs[0], 10], [lp.figs[1], 9], [lp.figs[2], 9],
  ];
  const ley = `
  <section class="lp-sec" id="ley" aria-labelledby="lp-law-t">
    <div class="lp-wrap lp-law">
      <div class="lp-law-text">
        <h2 id="lp-law-t">${esc(t.oblTitle)}</h2>
        <p class="lp-answer">${esc(t.oblAnswer)}</p>
        <p>${esc(t.oblText)}</p>
        <p class="lp-link">${ext(BOE, t.oblLink)}${icono('arrow-up-right', 16)}</p>
      </div>
      <dl class="lp-facts">
        ${facts.map(([f, n]) => `<div><dt>${esc(f.v)}</dt><dd>${esc(f.l)} <span class="lp-art">${ext(boeArt(n), `${t.lawColArt} ${n}`)}</span></dd></div>`).join('')}
        <div class="is-fine"><dt>${esc(lp.figs[3].v)}</dt><dd>${esc(t.oblRefs[3].text)} <span class="lp-art">${ext(boeArt(63), `${t.lawColArt} ${P.MULTA.infraccion}`)} · ${ext(boeArt(65), `${t.lawColArt} ${P.MULTA.articulo}`)}</span></dd></div>
      </dl>
    </div>
    <div class="lp-wrap lp-reqs-wrap">
      <div>
        <h3 class="lp-h3">${esc(t.lawTitle)}</h3>
        <div class="lp-reqs">
          ${t.lawRows.map(r => `<details><summary><span>${esc(r.req)}</span><span class="lp-art-tag">${esc(t.lawColArt)} ${esc(r.art)}</span>${icono('plus', 16)}</summary><p>${esc(r.how)} ${ext(boeArt(r.n), `${t.lawColArt} ${r.art}`)}</p></details>`).join('')}
        </div>
      </div>
      <aside class="lp-own" aria-labelledby="lp-own-t">
        <h3 class="lp-h3" id="lp-own-t">${esc(t.lawOwnTitle)}</h3>
        <p>${esc(fmt(t.lawOwnLead, {}))}</p>
        <ol>${t.lawOwn.map(o => `<li>${esc(o.text)} ${ext(boeArt(o.n), o.art)}</li>`).join('')}</ol>
      </aside>
    </div>
  </section>`;

  // ── 5 · Seguridad y privacidad: cuatro piezas cortas, todas comprobadas ──
  const seguridad = `
  <section class="lp-sec is-soft" id="seguridad" aria-labelledby="lp-sec-t">
    <div class="lp-wrap">
      <header class="lp-head"><h2 id="lp-sec-t">${esc(t.secTitle)}</h2></header>
      <ul class="lp-secu">
        ${t.sec.map((x, i) => `<li>${icono(SEC_ICON[i], 20)}<h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></li>`).join('')}
      </ul>
    </div>
  </section>`;

  // ── 6 · Precios: los tres planes, lo que incluyen y los dos servicios opcionales ──
  const planName = (id) => t.plans[id];
  const precios = `
  <section class="lp-sec" id="precios" aria-labelledby="lp-price-t">
    <div class="lp-wrap">
      <header class="lp-head">
        <h2 id="lp-price-t">${esc(t.priceTitle)}</h2>
        <p class="lp-lead">${esc(t.priceLead)}</p>
      </header>
      <ul class="lp-plans">
        ${P.PLANES.map(p => `<li>
          <h3>${esc(planName(p.id).name)}</h3>
          <p class="lp-plan-size">${esc(planName(p.id).size)}</p>
          ${p.precio != null
    ? `<p class="lp-plan-price"><b>${euros(p.precio, lang)}</b> <span>${esc(t.perYear)}, ${esc(t.plusVat)}</span></p>`
    : `<p class="lp-plan-price"><b>${esc(t.custom)}</b> <span>${esc(t.customNote)}</span></p>`}
        </li>`).join('')}
      </ul>
      <div class="lp-price-more">
        <div>
          <h3 class="lp-h3">${esc(t.inclTitle)}</h3>
          <ul class="lp-incl">${t.incl.map(x => `<li>${icono('check', 16)}<span>${esc(x)}</span></li>`).join('')}</ul>
        </div>
        <div>
          <h3 class="lp-h3">${esc(lp.extrasTitle)}</h3>
          <dl class="lp-extras">
            <div><dt>${esc(lp.packTitle)}</dt><dd><b>${euros(P.PACK_PUESTA_EN_MARCHA, lang)}</b> ${esc(lp.packWhen)}, ${esc(t.plusVat)}</dd><dd class="lp-muted">${esc(lp.packText)}</dd></div>
            <div><dt>${esc(lp.extTitle)}</dt><dd><b>${esc(fmt(lp.extFrom, { price: euros(P.GESTION_EXTERNA_DESDE, lang) }))}</b> ${esc(t.perYear)}, ${esc(t.plusVat)}</dd><dd class="lp-muted">${esc(lp.extText)} ${ext(boeArt(6), `${t.lawColArt} 6`)}</dd></div>
          </dl>
        </div>
      </div>
      <div class="lp-price-cta">
        <p>${esc(trial)}</p>
        <p class="lp-cta">
          <a class="lp-btn" href="${signup}">${esc(t.priceCta)}${icono('arrow-right')}</a>
          <a class="lp-btn is-line" href="${mail}">${esc(t.priceContact)}</a>
        </p>
      </div>
    </div>
  </section>`;

  // ── 7 · Preguntas frecuentes: <details>, se abren sin JavaScript ──
  const preguntas = `
  <section class="lp-sec is-soft" id="preguntas" aria-labelledby="lp-faq-t">
    <div class="lp-wrap lp-faq">
      <header class="lp-head">
        <h2 id="lp-faq-t">${esc(t.faqTitle)}</h2>
        <p class="lp-lead">${esc(t.faqMore)} ${esc(t.faqWrite)} <a href="${mail}">${esc(P.CORREO_CONTACTO)}</a>.</p>
      </header>
      <div class="lp-reqs">
        ${t.faq.map(x => `<details><summary><span>${esc(x.q)}</span>${icono('plus', 16)}</summary><p>${esc(x.a)}</p></details>`).join('')}
      </div>
    </div>
  </section>`;

  // ── 8 · Cierre: la otra foto, los dos botones y el correo para quien prefiere que se lo enseñen ──
  const cierre = `
  <section class="lp-end" id="contacto" aria-labelledby="lp-end-t">
    <picture class="lp-hero-bg">
      <source media="(max-width: 719px)" srcset="${photo(2).tall}" sizes="100vw">
      <img src="${photo(2).src}" srcset="${photo(2).wide}" sizes="100vw" alt="" width="1440" height="900" loading="lazy" decoding="async">
    </picture>
    <div class="lp-wrap lp-end-in">
      <h2 id="lp-end-t">${esc(t.endTitle)}</h2>
      <p class="lp-hero-sub">${esc(t.endText)}</p>
      <p class="lp-cta">
        <a class="lp-btn is-light" href="${signup}">${esc(s.navSignup)}${icono('arrow-right')}</a>
        <a class="lp-btn is-ghost-light" href="${demo}">${esc(s.navDemo)}</a>
      </p>
      <p class="lp-hero-note">${esc(lp.contactTitle)} ${esc(t.faqWrite)} <a href="${mail}">${esc(P.CORREO_CONTACTO)}</a></p>
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
  <meta name="color-scheme" content="light dark">
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
  <link rel="preload" as="image" href="${photo(1).src}" imagesrcset="${photo(1).wide}" imagesizes="100vw" media="(min-width: 720px)" fetchpriority="high">
  <link rel="preload" as="image" href="/landing/inicio-1-s.webp" imagesrcset="${photo(1).tall}" imagesizes="100vw" media="(max-width: 719px)" fetchpriority="high">
  <style>@font-face { font-family: 'Manrope'; font-style: normal; font-weight: 200 800; font-display: swap; src: url(${assets.font}) format('woff2'); }
${assets.css}</style>
  <script src="${assets.js}" defer></script>
</head>
<body>
  <a class="lp-skip" href="#main">${esc(T.v2.skip)}</a>
${cabecera}
  <main id="main" tabindex="-1">
${inicio}
${funciona}
${comunicar}
${ley}
${seguridad}
${precios}
${preguntas}
${cierre}
  </main>
${pie}
</body>
</html>
`;
}
