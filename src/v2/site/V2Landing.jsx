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
const REPORTER_ICONS = [EyeOff, Paperclip, KeyRound, Languages];
const MANAGER_ICONS = [ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet];
const STATUS_FLOW = ['received', 'investigating', 'resolved'];
const WHAT_ICONS = [Megaphone, ShieldCheck, Building2];
const WHAT_TONES = ['pop', 'navy', 'soft'];
// Les categories reals del formulari, cadascuna amb la seva icona
const CAT_ICONS = {
  fraud: HandCoins, harassment: UserRoundX, discrimination: Scale, safety: HardHat,
  data: DatabaseZap, conflict: Handshake, accounting: Calculator, environmental: Leaf,
};
// Les rajoles alternen els tres tons de la pàgina, com un tauler
const TILE_TONES = ['pop', 'soft', 'navy', 'soft', 'soft', 'navy', 'soft', 'pop'];
// El recorregut: qui actua a cada pas (rep = qui denuncia, co = l'empresa) i quines captures s'ensenyen
const HOW = [
  { who: 'rep', shots: [['canal', 'alt']] },
  { who: 'rep', shots: [['formulario', 'alt']] },
  { who: 'rep', shots: [['codigo', 'alt'], ['seguimiento', 'alt2']] },
  { who: 'co', shots: [['plazos', 'alt']] },
];
const STEP_MS = 5600;

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
 * El recorregut en quatre passos. Avança sol mentre és a la pantalla i ningú hi té el ratolí o el
 * focus a sobre; quan la persona tria un pas, s'atura i mana ella. Amb el moviment reduït no avança.
 * Els quatre textos i les quatre captures ocupen la mateixa cel·la: l'alçada no canvia en passar de pas.
 */
function HowItWorks({ lang, tl }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [seen, setSeen] = useState(false);
  const [held, setHeld] = useState(false);
  const box = useRef(null);
  const calm = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  useEffect(() => {
    if (!box.current || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  const playing = auto && seen && !held && !calm;
  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => setActive(a => (a + 1) % HOW.length), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, active]);

  // El detall que es destaca a cada pas, amb textos que ja són al producte
  const tips = [T => T.v2site.lp.facts[2], T => T.v2.anonF1, T => T.v2site.lp.codeNote, T => T.v2site.lp.deadLead];

  return (
    <div
      className="v2-lp-how-box" ref={box} data-rv=""
      onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}
    >
      <ol className="v2-lp-tabs">
        {HOW.map((h, i) => (
          <li key={i}>
            <button
              type="button" className="v2-lp-tab" aria-current={i === active ? 'step' : undefined} aria-controls="v2-lp-how-view"
              onClick={() => { setActive(i); setAuto(false); }}
            >
              <span className="v2-lp-tab-n" aria-hidden="true">{i + 1}</span>
              <Lp className="v2-lp-tab-t" pick={x => x.howShort[i]} />
              <span className="v2-lp-tab-bar" aria-hidden="true">
                <i
                  key={`${active}-${playing}`}
                  className={i < active ? 'is-full' : i === active ? (playing ? 'is-run' : 'is-full') : undefined}
                  style={{ animationDuration: `${STEP_MS}ms` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="v2-lp-how-view" id="v2-lp-how-view">
        <div className="v2-lp-how-copy">
          {HOW.map((h, i) => (
            <div key={i} className="v2-lp-how-item" data-on={i === active ? '' : undefined} aria-hidden={i === active ? undefined : true}>
              <span className={`v2-lp-who is-${h.who}`}>{h.who === 'co' ? tl.whoCompany : tl.whoReporter}</span>
              <Lp as="div" pick={x => <><h3>{x.how[i].t}</h3><p>{x.how[i].d}</p></>} />
              <p className="v2-lp-how-tip"><Check {...ICON} /><Stable lang={lang} pick={tips[i]} /></p>
            </div>
          ))}
        </div>
        <div className={`v2-lp-how-stage is-${HOW[active].who}`}>
          <span className="v2-lp-disc" aria-hidden="true" />
          {HOW.map((h, i) => (
            <div key={i} className={`v2-lp-how-shot${h.shots.length > 1 ? ' is-pair' : ''}`} data-on={i === active ? '' : undefined} aria-hidden={i === active ? undefined : true}>
              {h.shots.map(([name, altKey]) => (
                <Shot key={name} name={name} kind={name === 'plazos' ? 'card' : 'phone'} lang={lang} alt={name === 'plazos' ? tl.plazosAlt : tl.how[i][altKey]} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

      {/* ── Què és: la definició a l'esquerra, les tres idees a la dreta ── */}
      <section className="v2-lp-what" id="que-es" aria-labelledby="v2-lp-what-t">
        <div className="v2-wrap v2-lp-split">
          <div className="v2-lp-head" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebWhat" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-what-t" k="whatTitle" />
            <Lp as="p" className="v2-lead" k="whatLead" />
          </div>
          <ul className="v2-lp-points">
            {WHAT_ICONS.map((Icon, i) => (
              <li key={i} data-rv="" style={{ '--d': `${i * 90}ms` }}>
                <span className={`v2-lp-ico is-${WHAT_TONES[i]}`} aria-hidden="true"><Icon {...ICON} /></span>
                {/* títol i text en una sola peça: cada idioma flueix seguit i l'espai sobrant queda a baix */}
                <Lp as="div" pick={x => <><h3>{x.what[i].t}</h3><p>{x.what[i].d}</p></>} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Com funciona: el recorregut sencer, pas a pas, amb captures reals ── */}
      <section className="v2-lp-how" id="funciona" aria-labelledby="v2-lp-how-t">
        <div className="v2-wrap">
          <div className="v2-lp-head is-center" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebHow" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-how-t" k="howTitle" />
            <Lp as="p" className="v2-lead" k="howLead" />
          </div>
          <HowItWorks lang={lang} tl={tl} />
        </div>
      </section>

      {/* ── Què es pot comunicar: les categories reals del formulari, amb un exemple de cadascuna ── */}
      <section className="v2-lp-cat" aria-labelledby="v2-lp-cat-t">
        <div className="v2-wrap">
          <div className="v2-lp-head" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebCat" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-cat-t" k="catTitle" />
            <Lp as="p" className="v2-lead" k="catLead" />
          </div>
          <ul className="v2-lp-tiles">
            {Object.entries(CAT_ICONS).map(([value, Icon], i) => (
              <li key={value} className={`is-${TILE_TONES[i]}`} data-rv="" style={{ '--d': `${(i % 4) * 70}ms` }}>
                <span className="v2-lp-tile-ico" aria-hidden="true"><Icon {...ICON} /></span>
                <Stable as="h3" lang={lang} pick={T => T.categories.find(c => c.value === value)?.label ?? value} />
                <Lp as="p" pick={x => <><span className="v2-lp-eg">{x.catEg}</span>{x.catEx[value]}</>} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Terminis legals: la línia de temps de l'article 9 ── */}
      <section className="v2-lp-dead" aria-labelledby="v2-lp-dead-t">
        <div className="v2-wrap">
          <div className="v2-lp-head" data-rv="">
            <Lp as="p" className="v2-lp-eb" k="ebDead" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-dead-t" k="deadTitle" />
            <Lp as="p" className="v2-lead" k="deadLead" />
            <a className="v2-lp-dead-ref" href={boeArt(9)} target="_blank" rel="noopener noreferrer">
              <Lp k="deadRef" /><span className="v2-vh"> {t.opensBoe}</span><ArrowUpRight {...ICON} />
            </a>
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
        <div className="v2-wrap v2-land-obl-grid">
          <div className="v2-land-obl-main" data-rv="">
            {/* La xifra que decideix l'obligació, en gran: el text del costat ja la diu */}
            <p className="v2-lp-big" aria-hidden="true">50<i>+</i></p>
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

      {/* ── Dues parts: qui denuncia i qui gestiona, unides pel codi ── */}
      <section className="v2-land-two v2-wrap" id="funciones" aria-labelledby="v2-land-two-t">
        <Tx as="h2" className="v2-sec-title" id="v2-land-two-t" k="twoTitle" />
        <Tx as="p" className="v2-lead v2-land-two-lead" k="twoLead" />

        <div className="v2-land-pair" data-rv="">
          <div className="v2-land-side">
            <div className="v2-land-side-head">
              <span className="v2-land-badge" aria-hidden="true"><UserRound {...ICON} /></span>
              <div>
                <Tx as="h3" k="reporterTitle" />
                <Tx as="p" k="reporterSub" />
              </div>
            </div>
            <ul className="v2-land-caps">
              {t.reporterItems.map((item, i) => {
                const Icon = REPORTER_ICONS[i];
                return <li key={i}><Icon {...ICON} /><Tx pick={x => x.reporterItems[i]} /></li>;
              })}
            </ul>
          </div>

          <div className="v2-land-seam">
            <span className="v2-land-seam-icon" aria-hidden="true"><MessagesSquare {...ICON} /></span>
            <Tx className="v2-land-seam-label" k="seamLabel" />
          </div>

          <div className="v2-land-side is-private">
            <div className="v2-land-side-head">
              <span className="v2-land-badge" aria-hidden="true"><LayoutDashboard {...ICON} /></span>
              <div>
                <Tx as="h3" k="managerTitle" />
                <Tx as="p" k="managerSub" />
              </div>
            </div>
            <ul className="v2-land-caps">
              {t.managerItems.map((item, i) => {
                const Icon = MANAGER_ICONS[i];
                return <li key={i}><Icon {...ICON} /><Tx pick={x => x.managerItems[i]} /></li>;
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── La llei, punt per punt: què exigeix i com ho cobreix el producte ── */}
      <section className="v2-land-law v2-wrap" id="ley" aria-labelledby="v2-land-law-t">
        <Tx as="h2" className="v2-sec-title" id="v2-land-law-t" k="lawTitle" />
        <Tx as="p" className="v2-lead v2-land-two-lead" k="lawLead" />

        <div className="v2-land-law-grid" data-rv="">
          <table className="v2-land-table">
            <thead>
              <tr>
                <th scope="col"><Tx k="lawColReq" /></th>
                <th scope="col"><Tx k="lawColArt" /></th>
                <th scope="col"><Tx k="lawColHow" /></th>
              </tr>
            </thead>
            <tbody>
              {t.lawRows.map((r, i) => (
                <tr key={i}>
                  <th scope="row"><Tx pick={x => x.lawRows[i].req} /></th>
                  <td className="v2-land-art">
                    <a href={boeArt(r.n)} target="_blank" rel="noopener noreferrer">
                      <span className="v2-land-art-pre">{t.lawColArt} </span>{r.art}<span className="v2-vh"> {t.opensBoe}</span><ArrowUpRight {...ICON} />
                    </a>
                  </td>
                  <td><Tx pick={x => x.lawRows[i].how} /></td>
                </tr>
              ))}
            </tbody>
          </table>

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
