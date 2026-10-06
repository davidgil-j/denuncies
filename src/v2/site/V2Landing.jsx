import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  HandCoins, UserRoundX, Scale, HardHat, DatabaseZap, Handshake, Calculator, Leaf,
  ArrowRight, ArrowUpRight, Check, Copy, MailCheck, Link2, Plus,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { BOE_URL, ICON, boeArt, fmt, Stable, stableOf, Swap } from '../V2Layout.jsx';
import { PLANS, TRIAL_DAYS, CONTACT_EMAIL, formatPrice } from './plans.js';

const DEMO_PATH = '/canal/demo';
const STATUS_FLOW = ['received', 'investigating', 'resolved'];
// Les categories reals del formulari, cadascuna amb la seva icona
const CAT_ICONS = {
  fraud: HandCoins, harassment: UserRoundX, discrimination: Scale, safety: HardHat,
  data: DatabaseZap, conflict: Handshake, accounting: Calculator, environmental: Leaf,
};
const CATS = Object.keys(CAT_ICONS);
// El recorregut: qui actua a cada pas (rep = qui denuncia, co = l'empresa) i quina captura s'ensenya
const HOW = [['rep', 'canal'], ['rep', 'formulario'], ['rep', 'codigo'], ['co', 'panel']];
// Cada xifra clau enllaça amb el seu article: és l'índex dins de landing.oblRefs
const FIG_REF = [0, 1, 1, 3];

// Textos que reserven l'espai de l'idioma més llarg: en canviar d'idioma, res no es mou
const Tx = stableOf(T => T.v2site.landing);
const Lp = stableOf(T => T.v2site.lp);

/** Codi QR real del canal d'exemple. Si no es pot generar, la peça simplement no surt. */
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

/**
 * Portada de Reportia en set blocs: inici, com funciona, què es pot comunicar, compliment, preus,
 * preguntes i tancament. Tot el contingut és visible des del principi; no hi ha fotos, només
 * captures reals del producte (public/landing, refetes amb scripts/landing-shots.mjs).
 */
export default function V2Landing() {
  const { lang } = useOutletContext();
  const s = translations[lang].v2site;
  const t = s.landing;
  const tl = s.lp;
  const tv = translations[lang].v2;
  const ta = translations[lang].v2admin;
  const [copied, setCopied] = useState(false);

  useEffect(() => { document.title = t.docTitle; }, [t]);

  async function copyMail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* el correu ja és a la vista */ }
  }

  // Text estable que ve d'un altre apartat dels textos (capçalera, canal o panell)
  const st = (pick, props) => <Stable lang={lang} pick={pick} {...props} />;
  const boe = <span className="v2-vh"> {t.opensBoe}</span>;

  return (
    <div className="v2-lp">
      {/* ── 1 · Inici: què és, per a qui, que és obligatori i els dos botons ── */}
      <section className="v2-lp-hero" aria-labelledby="v2-land-title">
        <div className="v2-wrap v2-lp-hero-grid">
          <div className="v2-lp-hero-text">
            <p className="v2-lp-pill"><i aria-hidden="true" /><Lp k="eyebrow" /></p>
            <Lp as="h1" className="v2-lp-h1" id="v2-land-title" pick={x => <><span>{x.titleA}</span> <span className="v2-lp-hl">{x.titleB}</span></>} />
            <Tx as="p" className="v2-lp-sub" k="promise" />
            <Lp as="p" className="v2-lp-must" k="heroMust" />
            <div className="v2-lp-cta">
              <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
                {st(T => T.v2site.navSignup)}<ArrowRight {...ICON} />
              </Link>
              <Link className="v2-btn v2-btn-ghostnavy" to={`${DEMO_PATH}?lang=${lang}`}>{st(T => T.v2site.navDemo)}</Link>
            </div>
            <ul className="v2-lp-facts">
              {[0, 1, 2].map(i => (
                <li key={i}><Check {...ICON} /><Lp pick={x => fmt(x.facts[i], { days: TRIAL_DAYS })} /></li>
              ))}
            </ul>
          </div>

          {/* El recorregut en tres peces, amb els textos reals del formulari i del panell */}
          <div className="v2-lp-flow" role="img" aria-label={tl.stageAlt}>
            <ol aria-hidden="true">
              <li className="v2-lp-fc is-a">
                <b>1</b>
                <div className="v2-lp-fc-card">
                  <Lp as="p" className="v2-lp-fc-top" k="stage1" />
                  {st(T => T.v2.s1Title, { as: 'p', className: 'v2-lp-fc-q' })}
                  <div className="v2-lp-fc-opt">
                    <span className="v2-lp-radio" />
                    <div>
                      <p className="v2-lp-fc-opt-t">{st(T => T.v2.anonTitle)}<span className="v2-lp-tag">{tv.recommended}</span></p>
                      {st(T => T.v2.anonF1, { as: 'p', className: 'v2-lp-fc-opt-d' })}
                    </div>
                  </div>
                </div>
              </li>
              <li className="v2-lp-fc is-b">
                <b>2</b>
                <div className="v2-lp-fc-card">
                  <Lp as="p" className="v2-lp-fc-top" k="stage2" />
                  <p className="v2-lp-fc-code">A3B7-C9X2</p>
                  <Lp as="p" className="v2-lp-fc-note" k="codeNote" />
                </div>
              </li>
              <li className="v2-lp-fc is-c">
                <b>3</b>
                <div className="v2-lp-fc-card">
                  <Lp as="p" className="v2-lp-fc-top" k="stage3" />
                  <p className="v2-lp-fc-ref"><span>REF-7P2MQA</span><span className="v2-lp-tag">{ta.status.received}</span></p>
                  <div className="v2-lp-meter">
                    <p>{st(T => T.v2admin.kAck)}{st(T => fmt(T.v2admin.dlLeft, { n: 6 }), { className: 'is-r' })}</p>
                    <span className="v2-lp-bar"><i style={{ width: '14%' }} /></span>
                  </div>
                  <div className="v2-lp-meter">
                    <p>{st(T => T.v2admin.kResp)}{st(T => fmt(T.v2admin.dlLeft, { n: 91 }), { className: 'is-r' })}</p>
                    <span className="v2-lp-bar"><i style={{ width: '3%' }} /></span>
                  </div>
                  <p className="v2-lp-fc-btn"><MailCheck {...ICON} />{st(T => T.v2admin.ackSend)}</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── 2 · Com funciona: el recorregut de qui denuncia i la posada en marxa de l'empresa ── */}
      <section className="v2-lp-sec is-white" id="funciona" aria-labelledby="v2-lp-how-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Lp as="p" className="v2-lp-eb" k="ebHow" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-how-t" k="howTitle" />
            <Lp as="p" className="v2-lp-lead" k="howLead" />
          </header>

          <ol className="v2-lp-steps">
            {HOW.map(([who, shot], i) => (
              <li key={shot}>
                <span className="v2-lp-shot">
                  <img src={`/landing/${shot}-${lang}.webp`} alt={tl.howAlt[i]} width="810" height="1013" loading="lazy" decoding="async" />
                </span>
                <p className="v2-lp-step-top">
                  <b aria-hidden="true">{i + 1}</b>
                  <span className={`v2-lp-who is-${who}`}>{who === 'co' ? tl.whoCompany : tl.whoReporter}</span>
                </p>
                {/* títol i text en una sola peça: cada idioma flueix seguit i l'espai sobrant queda a baix */}
                <Lp as="div" className="v2-lp-step-txt" pick={x => <><h3>{x.howShort[i]}</h3><p>{x.howLine[i]}</p></>} />
              </li>
            ))}
          </ol>

          <div className="v2-lp-setup">
            <Lp as="h3" className="v2-lp-sub-title" k="setupTitle" />
            <ol className="v2-lp-setup-list">
              <li>
                <b aria-hidden="true">1</b>
                <Tx as="div" pick={x => <><h4>{x.step1t}</h4><p>{x.step1d}</p></>} />
              </li>
              <li>
                <b aria-hidden="true">2</b>
                <Tx as="div" pick={x => <><h4>{x.step2t}</h4><p>{x.step2d}</p></>} />
                {/* Les tres peces reals que es copien del panell: l'adreça, el botó i el codi QR */}
                <div className="v2-lp-pieces">
                  <span className="v2-lp-path"><Link2 {...ICON} /><Tx k="step2path" /></span>
                  <span className="v2-lp-sample">{t.intBtnLabel}</span>
                  <DemoQr alt={t.intQrAlt} />
                </div>
              </li>
              <li>
                <b aria-hidden="true">3</b>
                <Tx as="div" pick={x => <><h4>{x.step3t}</h4><p>{x.step3d}</p></>} />
                {/* la fila sencera reserva l'espai de l'idioma més llarg */}
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

      {/* ── 3 · Què es pot comunicar: les vuit categories del formulari, amb un exemple de cadascuna ── */}
      <section className="v2-lp-sec is-soft" id="ejemplos" aria-labelledby="v2-lp-cat-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Lp as="p" className="v2-lp-eb" k="ebCat" />
            <Lp as="h2" className="v2-sec-title" id="v2-lp-cat-t" k="catTitle" />
            <Lp as="p" className="v2-lp-lead" k="catLead" />
          </header>
          <ul className="v2-lp-cats">
            {CATS.map((value) => {
              const Icon = CAT_ICONS[value];
              return (
                <li key={value}>
                  <div className="v2-lp-cat-top">
                    <span className="v2-lp-ico" aria-hidden="true"><Icon {...ICON} /></span>
                    {st(T => T.categories.find(c => c.value === value)?.label ?? value, { as: 'h3' })}
                  </div>
                  <Lp as="p" pick={(x, T, l) => (l === 'en' ? `“${x.catSay[value]}”` : `«${x.catSay[value]}»`)} />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── 4 · Compliment: tot el que és legal en un sol lloc, amb els enllaços al BOE ── */}
      <section className="v2-lp-sec is-white" id="ley" aria-labelledby="v2-lp-law-t">
        <div className="v2-wrap">
          <div className="v2-lp-law-top">
            <header className="v2-lp-head">
              {st(T => T.v2site.navLaw, { as: 'p', className: 'v2-lp-eb' })}
              <Tx as="h2" className="v2-sec-title" id="v2-lp-law-t" k="oblTitle" />
              <Tx as="p" className="v2-lp-answer" k="oblAnswer" />
              <Tx as="p" className="v2-lp-lead" k="oblText" />
              <p className="v2-lp-links">
                <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer"><Tx k="oblLink" /><ArrowUpRight {...ICON} /></a>
              </p>
              {/* L'únic article de la llista que no surt ni a les xifres ni al desplegable */}
              <p className="v2-lp-note">
                <a className="v2-link" href={boeArt(t.oblRefs[2].n)} target="_blank" rel="noopener noreferrer">{t.oblRefs[2].art}{boe}</a>
                <Tx pick={x => x.oblRefs[2].text} />
              </p>
            </header>

            <dl className="v2-lp-figs">
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

          {/* Els terminis de l'article 9, en una línia de temps, amb la fitxa real del panell al costat */}
          <div className="v2-lp-dead">
            <div>
              <Lp as="h3" className="v2-lp-sub-title" k="deadTitle" />
              <ol className="v2-lp-line">
                {tl.dead.map((d, i) => (
                  <li key={i} className={i === 3 ? 'is-opt' : undefined}>
                    <span className="v2-lp-dot" aria-hidden="true" />
                    <Lp as="div" pick={x => <><p className="v2-lp-when">{x.dead[i].k}</p><h4>{x.dead[i].t}</h4><p className="v2-lp-why">{x.dead[i].d}</p></>} />
                  </li>
                ))}
              </ol>
              <p className="v2-lp-links">
                <a className="v2-link" href={boeArt(9)} target="_blank" rel="noopener noreferrer"><Lp k="deadRef" />{boe}<ArrowUpRight {...ICON} /></a>
              </p>
            </div>
            <figure className="v2-lp-dead-shot">
              <img src={`/landing/plazos-${lang}.webp`} alt={tl.plazosAlt} width="630" height="482" loading="lazy" decoding="async" />
            </figure>
          </div>

          {/* El que demana la llei, punt per punt: plegat només es veu què exigeix; el com, en obrir */}
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

      {/* ── 5 · Preus ── */}
      <section className="v2-lp-sec is-soft" id="precios" aria-labelledby="v2-lp-price-t">
        <div className="v2-wrap">
          <header className="v2-lp-head">
            <Lp as="p" className="v2-lp-eb" k="ebPrice" />
            <Tx as="h2" className="v2-sec-title" id="v2-lp-price-t" k="priceTitle" />
            <Tx as="p" className="v2-lp-lead" k="priceLead" />
          </header>

          <div className="v2-lp-plans">
            <ul className="v2-lp-plan-list">
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

            <div className="v2-lp-incl">
              <Tx as="h3" k="inclTitle" />
              <ul>
                {t.incl.map((item, i) => <li key={i}><Check {...ICON} /><Tx pick={x => x.incl[i]} /></li>)}
              </ul>
            </div>

            <div className="v2-lp-plans-foot">
              <Tx as="p" pick={x => fmt(x.trialNote, { days: TRIAL_DAYS })} />
              <div>
                <a className="v2-link" href={`mailto:${CONTACT_EMAIL}`}><Tx k="priceContact" /></a>
                <Link className="v2-btn v2-btn-primary icon-trail" to="/crear-compte">
                  <Tx k="priceCta" /><ArrowRight {...ICON} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 · Preguntes freqüents: <details> natiu, es llegeix i es navega sense JavaScript ── */}
      <section className="v2-lp-sec is-white" id="preguntas" aria-labelledby="v2-lp-faq-t">
        <div className="v2-wrap v2-lp-faq">
          <header className="v2-lp-head">
            <Lp as="p" className="v2-lp-eb" k="ebFaq" />
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

      {/* ── 7 · Tancament: els dos botons i, a sota, el correu per a qui prefereix que l'hi ensenyin ── */}
      <section className="v2-lp-end" id="contacto" aria-labelledby="v2-lp-end-t">
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
