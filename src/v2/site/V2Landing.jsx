import React, { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  HandCoins, UserRoundX, Scale, HardHat, DatabaseZap, Handshake, Calculator, Leaf, Megaphone,
  MailCheck, Mail, Copy,
  Check, ArrowUpRight, ArrowRight, EyeOff, Paperclip, KeyRound, Languages,
  ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet,
  UserRound, LayoutDashboard, Link2, Building2, Plus,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { BOE_URL, ICON, boeArt, fmt, Stable, stableOf, Swap } from '../V2Layout.jsx';
import { PLANS, TRIAL_DAYS, CONTACT_EMAIL, formatPrice } from './plans.js';

const DEMO_PATH = '/canal/demo';
const STATUS_FLOW = ['received', 'investigating', 'resolved'];
const WHAT_ICONS = [Megaphone, ShieldCheck, Building2];
const WHAT_TONES = ['pop', 'navy', 'soft'];
// Les categories reals del formulari, cadascuna amb la seva icona
const CAT_ICONS = {
  fraud: HandCoins, harassment: UserRoundX, discrimination: Scale, safety: HardHat,
  data: DatabaseZap, conflict: Handshake, accounting: Calculator, environmental: Leaf,
};
// Les vuit categories en dues files, per a la franja d'exemples
const CAT_ROWS = [['fraud', 'harassment', 'discrimination', 'safety'], ['data', 'conflict', 'accounting', 'environmental']];
// El recorregut: qui actua a cada pas (rep = qui denuncia, co = l'empresa) i quina pantalla s'ensenya
const HOW = [['rep', 'canal'], ['rep', 'formulario'], ['rep', 'codigo'], ['co', 'panel']];

/**
 * Captura real del producte en l'idioma de la pàgina. Les imatges són a public/landing i es
 * refan amb scripts/landing-shots.mjs. kind: phone (pantalla de mòbil) o card (peça del panell).
 */
function Shot({ name, lang, alt, kind = 'phone' }) {
  const [w, h] = kind === 'phone' ? [780, 1600] : [1104, 1200];
  return (
    <span className={`v2-lp-${kind}`}>
      <img src={`/landing/${name}-${lang}.webp`} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
    </span>
  );
}

/**
 * Fa entrar cada peça marcada amb data-rv quan arriba a la pantalla. Només s'amaga res quan
 * l'observador ja funciona: sense ell, o amb el moviment reduït, tot es veu des del principi.
 */
function useReveal(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    root.querySelectorAll('[data-rv]').forEach(el => io.observe(el));
    root.classList.add('v2-rv-on');
    return () => { io.disconnect(); root.classList.remove('v2-rv-on'); };
  }, [ref]);
}

const Tx = stableOf(T => T.v2site.landing);
const Lp = stableOf(T => T.v2site.lp);

/**
 * Xifra que puja fins al seu valor quan arriba a la pantalla. Sense l'observador, o amb el moviment
 * reduït, es queda en el valor final, que és el que hi ha escrit des del principi.
 */
function CountUp({ to, ms = 900 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - start) / ms);
        el.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);
  return <span ref={ref}>{to}</span>;
}

/** Codi QR real del canal d'exemple. Si no es pot generar, la peça simplement no surt. */
function DemoQr({ alt }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(`${window.location.origin}${DEMO_PATH}`, {
        errorCorrectionLevel: 'M', margin: 0, width: 264, color: { dark: '#0A1830', light: '#ffffff' },
      }))
      .then(url => { if (alive) setSrc(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return <span className="v2-land-qr">{src && <img src={src} alt={alt} width="88" height="88" />}</span>;
}

export default function V2Landing() {
  const { lang } = useOutletContext();
  const s = translations[lang].v2site;
  const t = s.landing;
  const tl = s.lp;
  const tv = translations[lang].v2;
  const ta = translations[lang].v2admin;
  const root = useRef(null);
  useReveal(root);
  const [copied, setCopied] = useState(false);
  async function copyMail() {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* el correu ja és a la vista */ }
  }

  useEffect(() => { document.title = t.docTitle; }, [t]);
  // Textos que reserven l'espai de l'idioma més llarg (en canviar d'idioma no es mou res)
  const st = (pick, props) => <Stable lang={lang} pick={T => pick(T.v2site.landing, T.v2site)} {...props} />;

  return (
    <div className="v2-lp" ref={root}>
      {/* ── Portada: què és, en una frase, i el funcionament explicat amb peces del producte ── */}
      <section className="v2-lp-hero" aria-labelledby="v2-land-title">
        <div className="v2-wrap v2-lp-hero-grid">
          <div className="v2-lp-hero-text">
            <p className="v2-lp-pill-top"><i aria-hidden="true" /><Lp k="eyebrow" /></p>
            <Lp as="h1" className="v2-lp-h1" id="v2-land-title" pick={x => <><span>{x.titleA}</span> <span className="v2-lp-hl">{x.titleB}</span></>} />
            {st(x => x.promise, { as: 'p', className: 'v2-lp-sub' })}
            <div className="v2-lp-cta">
              <Link className="v2-btn v2-btn-primary icon-trail" to="/crear-compte">
                {st((x, site) => site.navSignup)}<ArrowRight {...ICON} />
              </Link>
              <Link className="v2-btn v2-btn-ghostnavy" to={`${DEMO_PATH}?lang=${lang}`}>{st((x, site) => site.navDemo)}</Link>
            </div>
            <ul className="v2-lp-facts">
              {[0, 1, 2].map(i => (
                <li key={i}><Check {...ICON} /><Lp pick={x => fmt(x.facts[i], { days: TRIAL_DAYS })} /></li>
              ))}
            </ul>
          </div>

          {/* El recorregut en tres peces, amb els textos reals del formulari i del panell */}
          <div className="v2-lp-flow" role="img" aria-label={tl.stageAlt}>
            <span className="v2-lp-sun" aria-hidden="true" />
            <div className="v2-lp-flow-in" aria-hidden="true">
              <div className="v2-lp-fc is-a">
                <p className="v2-lp-fc-top"><b>1</b><Lp k="stage1" /></p>
                <Stable as="p" className="v2-lp-fc-q" lang={lang} pick={T => T.v2.s1Title} />
                <div className="v2-lp-fc-opt">
                  <span className="v2-lp-radio" />
                  <div>
                    <p className="v2-lp-fc-opt-t"><Stable lang={lang} pick={T => T.v2.anonTitle} /><span className="v2-lp-tag">{tv.recommended}</span></p>
                    <Stable as="p" className="v2-lp-fc-opt-d" lang={lang} pick={T => T.v2.anonF1} />
                  </div>
                </div>
              </div>
              <div className="v2-lp-fc is-b">
                <p className="v2-lp-fc-top"><b>2</b><Lp k="stage2" /></p>
                <p className="v2-lp-fc-code">A3B7-C9X2</p>
                <Lp as="p" className="v2-lp-fc-note" k="codeNote" />
              </div>
              <div className="v2-lp-fc is-c">
                <p className="v2-lp-fc-top"><b>3</b><Lp k="stage3" /></p>
                <p className="v2-lp-fc-ref"><span>REF-7P2MQA</span><span className="v2-lp-chip">{ta.status.received}</span></p>
                <div className="v2-lp-meter">
                  <p><Stable lang={lang} pick={T => T.v2admin.kAck} /><Stable lang={lang} className="is-r" pick={T => fmt(T.v2admin.dlLeft, { n: 6 })} /></p>
                  <span className="v2-lp-bar"><i style={{ width: '14%' }} /></span>
                </div>
                <div className="v2-lp-meter">
                  <p><Stable lang={lang} pick={T => T.v2admin.kResp} /><Stable lang={lang} className="is-r" pick={T => fmt(T.v2admin.dlLeft, { n: 91 })} /></p>
                  <span className="v2-lp-bar"><i style={{ width: '3%' }} /></span>
                </div>
                <p className="v2-lp-fc-btn"><MailCheck {...ICON} /><Stable lang={lang} pick={T => T.v2admin.ackSend} /></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Què és: una foto a l'esquerra; a la dreta, la definició i les tres idees ── */}
      <section className="v2-lp-what" id="que-es" aria-labelledby="v2-lp-what-t">
        <div className="v2-wrap v2-lp-what-grid">
          <figure className="v2-lp-photo" data-rv="">
            <img src="/landing/foto-manos.webp" alt="" width="1200" height="1500" loading="lazy" decoding="async" />
          </figure>
          <div>
            <div className="v2-lp-head" data-rv="">
              <Lp as="p" className="v2-lp-eb" k="ebWhat" />
              <Lp as="h2" className="v2-sec-title" id="v2-lp-what-t" k="whatTitle" />
              <Lp as="p" className="v2-lead" k="whatLead" />
            </div>
            <ul className="v2-lp-points">
              {WHAT_ICONS.map((Icon, i) => (
                <li key={i} data-rv="" style={{ '--d': `${i * 70}ms` }}>
                  <span className={`v2-lp-ico is-${WHAT_TONES[i]}`} aria-hidden="true"><Icon {...ICON} /></span>
                  {/* títol i text en una sola peça: cada idioma flueix seguit i l'espai sobrant queda a baix */}
                  <Lp as="div" pick={x => <><h3>{x.what[i].t}</h3><p>{x.whatShort[i]}</p></>} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Com funciona: els quatre passos a la vista, cadascun amb la seva pantalla real ── */}
      <section className="v2-lp-how" id="funciona" aria-labelledby="v2-lp-how-t">
        <div className="v2-wrap">
          <div className="v2-lp-head is-center" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebHow" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-how-t" k="howTitle" />
            <Lp as="p" className="v2-lead" k="howLead" />
          </div>
        </div>
        <ol className="v2-lp-film">
          {HOW.map(([who, shot], i) => (
            <li key={shot} className={`is-${who}`} data-rv="" style={{ '--d': `${i * 70}ms` }}>
              <div className="v2-lp-film-stage"><Shot name={shot} lang={lang} alt={tl.how[i].alt} /></div>
              <p className="v2-lp-film-rail" aria-hidden="true"><b>{i + 1}</b><i /></p>
              <span className={`v2-lp-who is-${who}`}>{who === 'co' ? tl.whoCompany : tl.whoReporter}</span>
              <Lp as="div" pick={x => <><h3>{x.howShort[i]}</h3><p>{x.howLine[i]}</p></>} />
            </li>
          ))}
        </ol>
      </section>

      {/* ── Què es pot comunicar: exemples que passen sols, un per categoria ── */}
      <section className="v2-lp-cat" aria-labelledby="v2-lp-cat-t">
        <div className="v2-wrap">
          <div className="v2-lp-head" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebCat" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-cat-t" k="catTitle" />
            <Lp as="p" className="v2-lead" k="catLead" />
          </div>
        </div>
        {/* Cada fila es pinta tres vegades seguides perquè la cinta no s'acabi mai; les còpies no es llegeixen */}
        <div className="v2-lp-wall" data-rv="">
          {CAT_ROWS.map((row, r) => (
            <div className={`v2-lp-row is-${r}`} key={r}>
              {[0, 1, 2].map(copy => (
                <ul className="v2-lp-track" key={copy} aria-hidden={copy ? true : undefined}>
                  {row.map((value) => {
                    const Icon = CAT_ICONS[value];
                    return (
                      <li className="v2-lp-say" key={value}>
                        <p className="v2-lp-say-cat"><Icon {...ICON} /><Stable lang={lang} pick={T => T.categories.find(c => c.value === value)?.label ?? value} /></p>
                        <Lp as="p" className="v2-lp-say-q" pick={(x, T, l) => (l === 'en' ? `“${x.catSay[value]}”` : `«${x.catSay[value]}»`)} />
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Terminis legals: la línia de temps de l'article 9 ── */}
      <section className="v2-lp-dead" aria-labelledby="v2-lp-dead-t">
        <div className="v2-wrap">
          <div className="v2-lp-dead-top">
          <div className="v2-lp-head" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebDead" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-dead-t" k="deadTitle" />
            <Lp as="p" className="v2-lead" k="deadLead" />
            <a className="v2-lp-dead-ref" href={boeArt(9)} target="_blank" rel="noopener noreferrer">
              <Lp k="deadRef" /><span className="v2-vh"> {t.opensBoe}</span><ArrowUpRight {...ICON} />
            </a>
          </div>
            <figure className="v2-lp-dead-shot" data-rv="" style={{ '--d': '140ms' }}>
              <Shot kind="card" name="plazos" lang={lang} alt={tl.plazosAlt} />
            </figure>
          </div>
          <ol className="v2-lp-line">
            {tl.dead.map((d, i) => (
              <li key={i} className={i === 3 ? 'is-opt' : undefined} data-rv="" style={{ '--d': `${i * 140}ms` }}>
                <span className="v2-lp-dot" aria-hidden="true" />
                <Lp as="div" pick={x => <><p className="v2-lp-when">{x.dead[i].k}</p><h3>{x.dead[i].t}</h3><p className="v2-lp-why">{x.dead[i].d}</p></>} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Obligació legal ── */}
      <section className="v2-land-obl" aria-labelledby="v2-land-obl-t">
        {/* La xifra que decideix l'obligació, en gran i sobre la foto: el text de sota ja la diu */}
        <div className="v2-wrap">
          <figure className="v2-lp-banner" data-rv="">
            <img src="/landing/foto-reunion.webp" alt="" width="2000" height="860" loading="lazy" decoding="async" />
            <p className="v2-lp-big" aria-hidden="true"><CountUp to={50} /><i>+</i></p>
          </figure>
        </div>
        <div className="v2-wrap v2-land-obl-grid">
          <div className="v2-land-obl-main" data-rv="">
            {st(x => x.oblTitle, { as: 'h2', className: 'v2-sec-title', id: 'v2-land-obl-t' })}
            {st(x => x.oblAnswer, { as: 'p', className: 'v2-land-answer' })}
            {st(x => x.oblText, { as: 'p', className: 'v2-land-obl-text' })}
            <a className="v2-link v2-land-ext" href={BOE_URL} target="_blank" rel="noopener noreferrer">
              <Tx k="oblLink" /><ArrowUpRight {...ICON} />
            </a>
          </div>
          <dl className="v2-land-refs" aria-label={t.oblRefsLabel}>
            {t.oblRefs.map((r, i) => (
              <div className="v2-land-ref" key={r.n}>
                <dt>
                  <a href={boeArt(r.n)} target="_blank" rel="noopener noreferrer">
                    {r.art}<span className="v2-vh"> {t.opensBoe}</span><ArrowUpRight {...ICON} />
                  </a>
                </dt>
                <Tx as="dd" pick={x => x.oblRefs[i].text} />
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── La llei, punt per punt: cada exigència es desplega; plegada, només es veu què demana ── */}
      <section className="v2-land-law v2-wrap" id="ley" aria-labelledby="v2-land-law-t">
        <Tx as="h2" className="v2-sec-title" id="v2-land-law-t" k="lawTitle" />
        <Tx as="p" className="v2-lead v2-land-two-lead" k="lawLead" />

        <div className="v2-land-law-grid" data-rv="">
          <div className="v2-lp-reqs">
            {t.lawRows.map((r, i) => (
              <details className="v2-land-q" key={i}>
                <summary><Tx pick={x => x.lawRows[i].req} /><span className="v2-lp-art">{r.art}</span><Plus {...ICON} /></summary>
                <Tx as="p" pick={x => x.lawRows[i].how} />
                <p className="v2-lp-req-ref">
                  <a className="v2-link" href={boeArt(r.n)} target="_blank" rel="noopener noreferrer">
                    {t.lawColArt} {r.art}<span className="v2-vh"> {t.opensBoe}</span>
                  </a>
                </p>
              </details>
            ))}
          </div>

          <aside className="v2-land-own" aria-labelledby="v2-land-own-t">
            <span className="v2-land-badge" aria-hidden="true"><Building2 {...ICON} /></span>
            <Tx as="h3" id="v2-land-own-t" k="lawOwnTitle" />
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
      </section>

      {/* ── Posada en marxa ── */}
      <section className="v2-land-steps v2-wrap" aria-labelledby="v2-land-steps-t">
        <Tx as="h2" className="v2-sec-title" id="v2-land-steps-t" k="stepsTitle" />
        <ol className="v2-land-step-list" data-rv="">
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">1</span>
            <Tx as="h3" k="step1t" />
            <Tx as="p" k="step1d" />
          </li>
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">2</span>
            <Tx as="h3" k="step2t" />
            <Tx as="p" k="step2d" />
            <span className="v2-land-path"><Link2 {...ICON} /><Tx k="step2path" /></span>
          </li>
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">3</span>
            <Tx as="h3" k="step3t" />
            <Tx as="p" k="step3d" />
            {/* la fila sencera reserva l'espai de l'idioma més llarg; la fletxa va enganxada a l'estat
                següent perquè no quedi penjada al final de línia */}
            <Tx className="v2-land-flow-box" inner="v2-land-flow" pick={(x, T) => STATUS_FLOW.map((k, i) => (
              <span className="v2-land-flow-step" key={k}>
                {i > 0 && <ArrowRight {...ICON} />}
                <span className="v2-land-status">{T.v2admin.status[k]}</span>
              </span>
            ))} />
          </li>
        </ol>
      </section>

      {/* ── A la web de l'empresa: les tres peces reals que es copien del panell ── */}
      <section className="v2-land-int v2-wrap" aria-labelledby="v2-land-int-t">
        <div className="v2-land-int-text">
          <Tx as="h2" className="v2-sec-title" id="v2-land-int-t" k="intTitle" />
          <Tx as="p" k="intText" />
        </div>
        <dl className="v2-land-int-pieces" data-rv="">
          <div>
            <Tx as="dt" k="intLink" />
            <dd><span className="v2-land-path"><Link2 {...ICON} /><Tx k="step2path" /></span></dd>
          </div>
          <div>
            <Tx as="dt" k="intButton" />
            <dd><span className="v2-land-sample-btn">{t.intBtnLabel}</span></dd>
          </div>
          <div>
            <Tx as="dt" k="intQr" />
            <dd><DemoQr alt={t.intQrAlt} /></dd>
          </div>
        </dl>
      </section>

      {/* ── Preus ── */}
      <section className="v2-land-price v2-wrap" id="precios" aria-labelledby="v2-land-price-t">
        <Tx as="h2" className="v2-sec-title" id="v2-land-price-t" k="priceTitle" />
        <Tx as="p" className="v2-lead v2-land-two-lead" k="priceLead" />

        <div className="v2-land-plans" data-rv="">
          <ul className="v2-land-plan-list">
            {PLANS.map(p => (
              <li className="v2-land-plan" key={p.id}>
                <Tx as="h3" pick={x => x.plans[p.id].name} />
                <Tx as="p" className="v2-land-plan-size" pick={x => x.plans[p.id].size} />
                {p.price != null ? (
                  <p className="v2-land-plan-price">
                    <b>{formatPrice(p.price, lang)}</b>
                    <Tx pick={x => <>{x.perYear}<br />{x.plusVat}</>} />
                  </p>
                ) : (
                  <p className="v2-land-plan-price is-custom">
                    <b><Tx k="custom" /></b>
                    <Tx k="customNote" />
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="v2-land-incl">
            <Tx as="h3" k="inclTitle" />
            <ul>
              {t.incl.map((item, i) => <li key={i}><Check {...ICON} /><Tx pick={x => x.incl[i]} /></li>)}
            </ul>
          </div>

          <div className="v2-land-plans-foot">
            <Tx as="p" pick={x => fmt(x.trialNote, { days: TRIAL_DAYS })} />
            <div className="v2-land-plans-actions">
              <a className="v2-link" href={`mailto:${CONTACT_EMAIL}`}><Tx k="priceContact" /></a>
              <Link className="v2-btn v2-btn-primary icon-trail" to="/crear-compte">
                <Tx k="priceCta" /><ArrowRight {...ICON} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preguntes freqüents: <details> natiu, es llegeix i es navega sense JavaScript ── */}
      <section className="v2-land-faq v2-wrap" id="preguntas" aria-labelledby="v2-land-faq-t">
        <div className="v2-land-faq-head">
          <Tx as="h2" className="v2-sec-title" id="v2-land-faq-t" k="faqTitle" />
          <Tx as="p" pick={x => <>{x.faqMore} {x.faqWrite} <a className="v2-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>} />
        </div>
        <div className="v2-land-faq-list" data-rv="">
          {t.faq.map((item, i) => (
            <details className="v2-land-q" key={i}>
              <summary><Tx pick={x => x.faq[i].q} /><Plus {...ICON} /></summary>
              <Tx as="p" pick={x => x.faq[i].a} />
            </details>
          ))}
        </div>
      </section>

      {/* ── Contacte: el correu sempre a la vista; copiar-lo confirma que s'ha copiat ── */}
      <section className="v2-lp-contact v2-wrap" id="contacto" aria-labelledby="v2-lp-contact-t">
        <div className="v2-lp-contact-box" data-rv="">
          <figure className="v2-lp-photo">
            <img src="/landing/foto-mesa.webp" alt="" width="1200" height="1200" loading="lazy" decoding="async" />
          </figure>
          <div>
            <Lp as="h2" className="v2-sec-title" id="v2-lp-contact-t" k="contactTitle" />
            <Lp as="p" className="v2-lp-contact-text" k="contactText" />
          </div>
          <div className="v2-lp-contact-do">
            <a className="v2-lp-mail" href={`mailto:${CONTACT_EMAIL}`}><Mail {...ICON} />{CONTACT_EMAIL}</a>
            <div className="v2-lp-contact-btns">
              <button type="button" className="v2-btn v2-btn-primary icon-lead" onClick={copyMail}>
                {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
                <Swap lang={lang} on={copied} pick={T => T.v2site.lp.contactCopy} pickOn={T => T.v2site.lp.contactCopied} />
              </button>
              <a className="v2-btn v2-btn-secondary icon-lead" href={`mailto:${CONTACT_EMAIL}`}><Mail {...ICON} /><Lp k="contactWrite" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tancament ── */}
      <section className="v2-land-end" aria-labelledby="v2-land-end-t">
        {/* Algú davant d'un finestral: es veu que hi és, no qui és */}
        <img className="v2-lp-end-photo" src="/landing/foto-silueta.webp" alt="" width="1800" height="1200" loading="lazy" decoding="async" />
        <div className="v2-wrap v2-land-end-grid" data-rv="">
          <div>
            <Tx as="h2" className="v2-sec-title" id="v2-land-end-t" k="endTitle" />
            <Tx as="p" k="endText" />
          </div>
          <div className="v2-land-end-actions">
            <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
              <Tx pick={(x, T) => T.v2site.navSignup} /><ArrowRight {...ICON} />
            </Link>
            <Link className="v2-btn v2-btn-ghostnavy" to={`${DEMO_PATH}?lang=${lang}`}><Tx pick={(x, T) => T.v2site.navDemo} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
