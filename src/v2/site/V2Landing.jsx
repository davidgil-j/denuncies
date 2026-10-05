import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Check, ArrowUpRight, ArrowRight, EyeOff, Paperclip, KeyRound, Languages,
  ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet,
  UserRound, LayoutDashboard, Link2, Building2, Plus,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { BOE_URL, ICON, boeArt, fmt, Stable, stableOf } from '../V2Layout.jsx';
import Ficha from '../Ficha.jsx';
import { PLANS, TRIAL_DAYS, CONTACT_EMAIL, formatPrice } from './plans.js';

const DEMO_PATH = '/canal/demo';
const REPORTER_ICONS = [EyeOff, Paperclip, KeyRound, Languages];
const MANAGER_ICONS = [ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet];
const STATUS_FLOW = ['received', 'investigating', 'resolved'];

/** Text de la portada que reserva l'espai de l'idioma més llarg: en canviar d'idioma, res no es mou. */
const Tx = stableOf(T => T.v2site.landing);

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

  useEffect(() => { document.title = t.docTitle; }, [t]);
  // Textos que reserven l'espai de l'idioma més llarg (en canviar d'idioma no es mou res)
  const st = (pick, props) => <Stable lang={lang} pick={T => pick(T.v2site.landing, T.v2site)} {...props} />;

  return (
    <>
      {/* ── Portada: el missatge a l'esquerra, la peça real del canal a la dreta ── */}
      <section className="v2-land-hero" aria-labelledby="v2-land-title">
        <div className="v2-wrap v2-land-hero-grid">
          <div className="v2-land-hero-text">
            {st(x => x.title, { as: 'h1', className: 'v2-land-h1', id: 'v2-land-title' })}
            {st(x => x.promise, { as: 'p', className: 'v2-promise' })}
            {st(x => x.lead, { as: 'p', className: 'v2-lead' })}
            <div className="v2-actions">
              <Link className="v2-btn v2-btn-primary icon-trail" to="/crear-compte">
                {st((x, site) => site.navSignup)}<ArrowRight {...ICON} />
              </Link>
              <Link className="v2-btn v2-btn-secondary" to={`${DEMO_PATH}?lang=${lang}`}>{st((x, site) => site.navDemo)}</Link>
            </div>
          </div>

          <figure className="v2-land-stage">
            <Ficha lang={lang} as="div" className="v2-land-ficha" />
            {st(x => x.figCaption, { as: 'figcaption' })}
          </figure>
        </div>
      </section>

      {/* ── Obligació legal ── */}
      <section className="v2-land-obl" aria-labelledby="v2-land-obl-t">
        <div className="v2-wrap v2-land-obl-grid">
          <div className="v2-land-obl-main">
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

        <div className="v2-land-pair">
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

        <div className="v2-land-law-grid">
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
        <ol className="v2-land-step-list">
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
        <dl className="v2-land-int-pieces">
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

        <div className="v2-land-plans">
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
        <div className="v2-land-faq-list">
          {t.faq.map((item, i) => (
            <details className="v2-land-q" key={i}>
              <summary><Tx pick={x => x.faq[i].q} /><Plus {...ICON} /></summary>
              <Tx as="p" pick={x => x.faq[i].a} />
            </details>
          ))}
        </div>
      </section>

      {/* ── Tancament ── */}
      <section className="v2-land-end" aria-labelledby="v2-land-end-t">
        <div className="v2-wrap v2-land-end-grid">
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
    </>
  );
}
