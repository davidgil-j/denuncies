import React, { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  HandCoins, UserRoundX, Scale, HardHat, DatabaseZap, Handshake, Calculator, Leaf,
  ArrowRight, ArrowUpRight, Check, Copy, Link2, Plus, Pause, Play, Server, LockKeyhole, UsersRound, ShieldCheck,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { BOE_URL, ICON, boeArt, fmt, Stable, stableOf, Swap } from '../V2Layout.jsx';
import { PLANS, TRIAL_DAYS, CONTACT_EMAIL, formatPrice } from './plans.js';

const DEMO_PATH = '/canal/demo';
const STATUS_FLOW = ['received', 'investigating', 'resolved'];
// Las categorías reales del formulario, cada una con su icono
const CAT_ICONS = {
  fraud: HandCoins, harassment: UserRoundX, discrimination: Scale, safety: HardHat,
  data: DatabaseZap, conflict: Handshake, accounting: Calculator, environmental: Leaf,
};
const CATS = Object.keys(CAT_ICONS);
// El recorrido: la captura real que se enseña en cada paso, dentro de un móvil
const HOW = ['canal', 'formulario', 'codigo', 'panel'];
// Cada cuánto pasa solo al paso (o al ejemplo) siguiente
const STEP_MS = 3000;
const SAY_MS = 3600;
// Fotos del inicio (1) y del cierre (2): public/landing/inicio-N*.webp, hechas con scripts/landing-fotos.mjs.
// Cuatro tamaños: el navegador baja el que toca según el ancho (un móvil pequeño, ~55 KB en lugar de ~100 KB)
const photo = (n) => ({
  wide: `/landing/inicio-${n}-d.webp 1440w, /landing/inicio-${n}.webp 2400w`,
  tall: `/landing/inicio-${n}-s.webp 720w, /landing/inicio-${n}-m.webp 1100w`,
  src: `/landing/inicio-${n}-d.webp`,
});
// Cada cifra clave enlaza con su artículo: es el índice dentro de landing.oblRefs
const FIG_REF = [0, 1, 1, 3];

// Textos que reservan el espacio del idioma más largo: al cambiar de idioma, nada se mueve
const Tx = stableOf(T => T.v2site.landing);
const Lp = stableOf(T => T.v2site.lp);

/** Código QR real del canal de ejemplo. Si no se puede generar, la pieza simplemente no sale. */
function DemoQr({ alt }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(`${window.location.origin}${DEMO_PATH}`, {
        errorCorrectionLevel: 'M', margin: 0, width: 192, color: { dark: '#0A1830', light: '#ffffff' },
      }))
      .then(url => { if (alive) setSrc(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return <span className="v2-lp-qr">{src && <img src={src} alt={alt} width="56" height="56" />}</span>;
}

const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Hace aparecer las piezas marcadas con data-rv cuando entran en la pantalla. Si el navegador no tiene
 * observador, o la persona ha pedido menos movimiento, no se esconde nada: todo se ve desde el principio.
 */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || calm() || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    root.querySelectorAll('[data-rv]').forEach(el => io.observe(el));
    root.classList.add('has-rv');
    return () => { io.disconnect(); root.classList.remove('has-rv'); };
  }, []);
  return ref;
}

/**
 * Pasa solo de un elemento al siguiente mientras la pieza está a la vista. Se detiene cuando se pone el ratón encima
 * o se elige un elemento, y no arranca si la persona ha pedido menos movimiento.
 */
function useCycle(count, ms) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [seen, setSeen] = useState(false);
  const [live, setLive] = useState(false);
  // Detenido a mano (botón de pausa, o al elegir un elemento con un clic): no vuelve a arrancar solo (WCAG 2.2.2)
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    setLive(!calm());
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const running = live && seen && !held && !stopped;
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setIndex(i => (i + 1) % count), ms);
    return () => clearInterval(id);
  }, [running, count, ms]);
  return {
    ref, index, live, running, stopped,
    pick: i => { setIndex(i); setHeld(true); },
    choose: i => { setIndex(i); setStopped(true); },
    release: () => setHeld(false),
    toggle: () => setStopped(s => !s),
  };
}

/**
 * Portada de Reportia en siete bloques: inicio, cómo funciona, qué se puede comunicar, cumplimiento, precios,
 * preguntas y cierre. El inicio es una foto a pantalla completa; el resto de imágenes son capturas
 * reales del producto (public/landing, rehechas con scripts/landing-shots.mjs). El movimiento (entradas, recorrido que avanza solo) es un añadido:
 * sin él, o con «reducir movimiento», todo el contenido se ve igual.
 */
export default function V2Landing() {
  const { lang } = useOutletContext();
  const s = translations[lang].v2site;
  const t = s.landing;
  const tl = s.lp;
  const tv = translations[lang].v2;
  const [copied, setCopied] = useState(false);
  const root = useReveal();
  const how = useCycle(HOW.length, STEP_MS);
  const say = useCycle(CATS.length, SAY_MS);

  useEffect(() => { document.title = t.docTitle; }, [t]);

  async function copyMail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* el correo ya está a la vista */ }
  }

  // Texto estable que viene de otro apartado de los textos (cabecera, canal o panel)
  const st = (pick, props) => <Stable lang={lang} pick={pick} {...props} />;
  const boe = <span className="v2-vh"> {t.opensBoe}</span>;

  return (
    <div className="v2-lp" ref={root}>
      {/* ── 1 · Inicio: una foto a pantalla completa, el titular, una frase y los dos botones ── */}
      <section className="v2-lp-hero" aria-labelledby="v2-land-title">
        <picture className="v2-lp-hero-bg">
          <source media="(max-width: 719px)" srcSet={photo(1).tall} sizes="100vw" />
          <img src={photo(1).src} srcSet={photo(1).wide} sizes="100vw" alt="" width="1440" height="900" decoding="async" fetchpriority="high" />
        </picture>
        <div className="v2-wrap v2-lp-hero-in">
          <Lp as="h1" className="v2-lp-h1" id="v2-land-title" pick={x => <><span>{x.titleA}</span> <span>{x.titleB}</span></>} />
          <Tx as="p" className="v2-lp-sub" k="promise" />
          <div className="v2-lp-cta">
            <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
              {st(T => T.v2site.navSignup)}<ArrowRight {...ICON} />
            </Link>
            <Link className="v2-btn v2-btn-ghostnavy" to={`${DEMO_PATH}?lang=${lang}`}>{st(T => T.v2site.navDemo)}</Link>
          </div>
          <Tx as="p" className="v2-lp-hero-trial" pick={x => fmt(x.trialNote, { days: TRIAL_DAYS })} />
        </div>
      </section>

      {/* ── 2 · Cómo funciona: cuatro móviles con el producto real; el paso activo se ilumina y avanza solo ── */}
      <section className="v2-lp-sec is-white" id="funciona" aria-labelledby="v2-lp-how-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Lp as="h2" className="v2-sec-title" id="v2-lp-how-t" k="howTitle" />
            <Lp as="p" className="v2-lp-lead" k="howLead" />
          </header>

          <div data-rv="steps">
            <ol
              className={`v2-lp-steps${how.live ? ' is-live' : ''}${how.running ? ' is-running' : ''}`}
              ref={how.ref} style={{ '--step-ms': `${STEP_MS}ms` }} onMouseLeave={how.release}
            >
              {HOW.map((shot, i) => (
                <li
                  key={shot} className={i === how.index ? 'is-on' : i < how.index ? 'is-done' : undefined}
                  onMouseEnter={() => how.pick(i)} onClick={() => how.choose(i)}
                >
                  <span className="v2-lp-phone">
                    <img src={`/landing/${shot}-${lang}.webp`} alt={tl.howAlt[i]} width="810" height="1440" loading="lazy" decoding="async" />
                  </span>
                  <div className="v2-lp-step-cap">
                    <b aria-hidden="true">{i + 1}</b>
                    <Lp as="h3" pick={x => x.howShort[i]} />
                    <Lp as="p" className="v2-lp-step-d" pick={x => x.howLine[i]} />
                  </div>
                </li>
              ))}
            </ol>
            {/* la frase del paso activo, en una sola línea: las cuatro ocupan el mismo sitio */}
            <div className="v2-lp-step-line" aria-hidden="true">
              {HOW.map((shot, i) => <Lp as="p" key={shot} className={i === how.index ? 'is-on' : undefined} pick={x => x.howLine[i]} />)}
            </div>
            {how.live && (
              <button type="button" className="v2-lp-pause" onClick={how.toggle}>
                {how.stopped ? <Play {...ICON} /> : <Pause {...ICON} />}{how.stopped ? tl.play : tl.pause}
              </button>
            )}
          </div>

          {/* Lo que ve la empresa: la lista de denuncias, en grande */}
          <div className="v2-lp-panel" data-rv="img">
            <Lp as="h3" className="v2-lp-sub-title" k="panelTitle" />
            <figure>
              <img src={`/landing/panel-lista-${lang}.webp`} alt={tl.panelAlt} width="2560" height="1600" loading="lazy" decoding="async" />
            </figure>
          </div>

          <div className="v2-lp-setup">
            <Lp as="h3" className="v2-lp-sub-title" k="setupTitle" />
            <ol className="v2-lp-setup-list" data-rv="kids">
              <li>
                <b aria-hidden="true">1</b>
                <Tx as="div" pick={x => <><h4>{x.step1t}</h4><p>{x.step1d}</p></>} />
              </li>
              <li>
                <b aria-hidden="true">2</b>
                <Tx as="div" pick={x => <><h4>{x.step2t}</h4><p>{x.step2d}</p></>} />
                {/* Las tres piezas reales que se copian del panel: la dirección, el botón y el código QR */}
                <div className="v2-lp-pieces">
                  <span className="v2-lp-path"><Link2 {...ICON} /><Tx k="step2path" /></span>
                  <span className="v2-lp-sample"><Tx k="intBtnLabel" /></span>
                  <DemoQr alt={t.intQrAlt} />
                </div>
              </li>
              <li>
                <b aria-hidden="true">3</b>
                <Tx as="div" pick={x => <><h4>{x.step3t}</h4><p>{x.step3d}</p></>} />
                {/* la fila entera reserva el espacio del idioma más largo */}
                {st(T => STATUS_FLOW.map((k, i) => (
                  <span className="v2-lp-state" key={k}>
                    {i > 0 && <ArrowRight {...ICON} />}
                    <span className="v2-lp-tag">{T.v2admin.status[k]}</span>
                  </span>
                )), { className: 'v2-lp-states-box', inner: 'v2-lp-states' })}
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── 3 · Qué se puede comunicar: un ejemplo cada vez, en grande; las ocho categorías del formulario al lado ── */}
      <section className="v2-lp-sec is-soft" id="ejemplos" aria-labelledby="v2-lp-cat-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Lp as="h2" className="v2-sec-title" id="v2-lp-cat-t" k="catTitle" />
          </header>
          <div className="v2-lp-say" ref={say.ref} onMouseLeave={say.release} data-rv="">
            <div className="v2-lp-say-stage" aria-hidden="true">
              {CATS.map((value, i) => {
                const Icon = CAT_ICONS[value];
                return (
                  <figure key={value} className={i === say.index ? 'is-on' : undefined}>
                    <figcaption><Icon {...ICON} />{st(T => T.categories.find(c => c.value === value)?.label ?? value)}</figcaption>
                    <Lp as="blockquote" pick={x => x.catSay[value]} />
                  </figure>
                );
              })}
            </div>
            <ul className="v2-lp-chips">
              {CATS.map((value, i) => {
                const Icon = CAT_ICONS[value];
                return (
                  <li key={value}>
                    <button type="button" className="v2-lp-chip" aria-pressed={i === say.index} onClick={() => say.choose(i)} onMouseEnter={() => say.pick(i)}>
                      <Icon {...ICON} />{st(T => T.categories.find(c => c.value === value)?.label ?? value)}
                      {/* el ejemplo, para quien no ve la pieza grande */}
                      <span className="v2-vh">: {tl.catSay[value]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {say.live && (
              <button type="button" className="v2-lp-pause" onClick={say.toggle}>
                {say.stopped ? <Play {...ICON} /> : <Pause {...ICON} />}{say.stopped ? tl.play : tl.pause}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 4 · Cumplimiento: todo lo legal en un solo sitio, con los enlaces al BOE ── */}
      <section className="v2-lp-sec is-white" id="ley" aria-labelledby="v2-lp-law-t">
        <div className="v2-wrap">
          <div className="v2-lp-law-top">
            <header className="v2-lp-head">
              <Tx as="h2" className="v2-sec-title" id="v2-lp-law-t" k="oblTitle" />
              <Tx as="p" className="v2-lp-answer" k="oblAnswer" />
              <Tx as="p" className="v2-lp-lead" k="oblText" />
              <p className="v2-lp-links">
                <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer"><Tx k="oblLink" /><ArrowUpRight {...ICON} /></a>
              </p>
              {/* El único artículo de la lista que no sale ni en las cifras ni en el desplegable */}
              <p className="v2-lp-note">
                <a className="v2-link" href={boeArt(t.oblRefs[2].n)} target="_blank" rel="noopener noreferrer">{t.oblRefs[2].art}{boe}</a>
                <Tx pick={x => x.oblRefs[2].text} />
              </p>
            </header>

            <dl className="v2-lp-figs" data-rv="kids">
              {tl.figs.map((f, i) => {
                const ref = t.oblRefs[FIG_REF[i]];
                return (
                  <div key={i}>
                    <Lp as="dt" pick={x => x.figs[i].v} />
                    <Lp as="dd" pick={x => x.figs[i].l} />
                    <dd className="v2-lp-fig-art">
                      <a href={boeArt(ref.n)} target="_blank" rel="noopener noreferrer">{ref.art}{boe}<ArrowUpRight {...ICON} /></a>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Los plazos del artículo 9, en una línea de tiempo */}
          <div className="v2-lp-dead" data-rv="line">
            <div>
              <Lp as="h3" className="v2-lp-sub-title" k="deadTitle" />
              <ol className="v2-lp-line">
                {tl.dead.map((d, i) => (
                  <li key={i} className={i === 3 ? 'is-opt' : undefined}>
                    <span className="v2-lp-dot" aria-hidden="true" />
                    <Lp as="div" pick={x => <><p className="v2-lp-when">{x.dead[i].k}</p><h4>{x.dead[i].t}</h4></>} />
                  </li>
                ))}
              </ol>
              <p className="v2-lp-links">
                <a className="v2-link" href={boeArt(9)} target="_blank" rel="noopener noreferrer"><Lp k="deadRef" />{boe}<ArrowUpRight {...ICON} /></a>
              </p>
            </div>
          </div>

          {/* Lo que pide la ley, punto por punto: plegado solo se ve qué exige; el cómo, al abrir */}
          <div className="v2-lp-law-grid">
            <div>
              <Tx as="h3" className="v2-lp-sub-title" k="lawTitle" />
              <div className="v2-lp-reqs">
                {t.lawRows.map((r, i) => (
                  <details className="v2-lp-q" key={i}>
                    <summary><Tx pick={x => x.lawRows[i].req} /><span className="v2-lp-art">{r.art}</span><Plus {...ICON} /></summary>
                    <Tx as="p" pick={x => x.lawRows[i].how} />
                    <p className="v2-lp-q-ref">
                      <a className="v2-link" href={boeArt(r.n)} target="_blank" rel="noopener noreferrer">{t.lawColArt} {r.art}{boe}</a>
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <aside className="v2-lp-own" aria-labelledby="v2-lp-own-t">
              <Tx as="h3" className="v2-lp-sub-title" id="v2-lp-own-t" k="lawOwnTitle" />
              <Tx as="p" k="lawOwnLead" />
              <ol>
                {t.lawOwn.map((o, i) => (
                  <li key={i}>
                    <Tx block pick={x => (
                      <>
                        {x.lawOwn[i].text}
                        <a href={boeArt(o.n)} target="_blank" rel="noopener noreferrer">{x.lawOwn[i].art}<span className="v2-vh"> {x.opensBoe}</span></a>
                      </>
                    )} />
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </section>

      {/* ── 4b · Seguridad y privacidad: cuatro piezas cortas, todas comprobadas ── */}
      <section className="v2-lp-sec is-white v2-lp-secu" id="seguridad" aria-labelledby="v2-lp-sec-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Tx as="h2" className="v2-sec-title" id="v2-lp-sec-t" k="secTitle" />
          </header>
          <ul className="v2-lp-secu-list">
            {[Server, LockKeyhole, UsersRound, ShieldCheck].map((Icon, i) => (
              <li key={i}>
                <Icon {...ICON} />
                <h3>{t.sec[i].t}</h3>
                <p>{t.sec[i].d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5 · Precios ── */}
      <section className="v2-lp-sec is-soft" id="precios" aria-labelledby="v2-lp-price-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Tx as="h2" className="v2-sec-title" id="v2-lp-price-t" k="priceTitle" />
            <Tx as="p" className="v2-lp-lead" k="priceLead" />
          </header>

          <div className="v2-lp-plans">
            <ul className="v2-lp-plan-list" data-rv="kids">
              {PLANS.map(p => (
                <li key={p.id}>
                  <Tx as="h3" pick={x => x.plans[p.id].name} />
                  <Tx as="p" className="v2-lp-plan-size" pick={x => x.plans[p.id].size} />
                  {p.price != null ? (
                    <p className="v2-lp-plan-price">
                      <b>{formatPrice(p.price, lang)}</b>
                      <Tx pick={x => <>{x.perYear}<br />{x.plusVat}</>} />
                    </p>
                  ) : (
                    <p className="v2-lp-plan-price is-custom">
                      <b><Tx k="custom" /></b>
                      <Tx k="customNote" />
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {/* Lo que incluyen todos los planes, en un panel oscuro: se distingue del fondo a primera vista */}
            <div className="v2-lp-incl" data-rv="">
              <Tx as="h3" k="inclTitle" />
              <ul>
                {t.incl.map((item, i) => <li key={i}><Check {...ICON} /><Tx pick={x => x.incl[i]} /></li>)}
              </ul>
              <div className="v2-lp-incl-foot">
                <Tx as="p" pick={x => fmt(x.trialNote, { days: TRIAL_DAYS })} />
                <div>
                  <a className="v2-lp-incl-link" href={`mailto:${CONTACT_EMAIL}`}><Tx k="priceContact" /></a>
                  <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
                    <Tx k="priceCta" /><ArrowRight {...ICON} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 · Preguntas frecuentes: <details> nativo, se lee y se recorre sin JavaScript ── */}
      <section className="v2-lp-sec is-white" id="preguntas" aria-labelledby="v2-lp-faq-t">
        <div className="v2-wrap v2-lp-faq">
          <header className="v2-lp-head">
            <Tx as="h2" className="v2-sec-title" id="v2-lp-faq-t" k="faqTitle" />
            <Tx as="p" className="v2-lp-lead" pick={x => <>{x.faqMore} {x.faqWrite} <a className="v2-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>} />
          </header>
          <div className="v2-lp-reqs">
            {t.faq.map((item, i) => (
              <details className="v2-lp-q" key={i}>
                <summary><Tx pick={x => x.faq[i].q} /><Plus {...ICON} /></summary>
                <Tx as="p" pick={x => x.faq[i].a} />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7 · Cierre: foto a sangre, los dos botones y el correo para quien prefiere que se lo enseñen. Enlaza con el pie ── */}
      <section className="v2-lp-end" id="contacto" aria-labelledby="v2-lp-end-t">
        {/* la foto que no se ha usado en el inicio: la página se abre y se cierra con foto */}
        <picture className="v2-lp-end-bg">
          <source media="(max-width: 719px)" srcSet={photo(2).tall} sizes="100vw" />
          <img src={photo(2).src} srcSet={photo(2).wide} sizes="100vw" alt="" width="1440" height="900" loading="lazy" decoding="async" />
        </picture>
        <div className="v2-wrap">
          <Tx as="h2" className="v2-sec-title" id="v2-lp-end-t" k="endTitle" />
          <Tx as="p" className="v2-lp-lead" k="endText" />
          <div className="v2-lp-cta">
            <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
              {st(T => T.v2site.navSignup)}<ArrowRight {...ICON} />
            </Link>
            <Link className="v2-btn v2-btn-ghostnavy" to={`${DEMO_PATH}?lang=${lang}`}>{st(T => T.v2site.navDemo)}</Link>
          </div>
          <div className="v2-lp-end-mail">
            {st(T => <>{T.v2site.lp.contactTitle} {T.v2site.landing.faqWrite} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>, { as: 'p' })}
            <button type="button" className="v2-lp-copy" onClick={copyMail}>
              {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
              <Swap lang={lang} on={copied} pick={T => T.v2site.lp.contactCopy} pickOn={T => T.v2site.lp.contactCopied} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
