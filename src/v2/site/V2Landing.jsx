import React, { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FileLock2, X, Check, ArrowUpRight, ArrowRight, EyeOff, Paperclip, KeyRound, Languages,
  ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet,
  UserRound, LayoutDashboard, Link2,
} from 'lucide-react';
import { translations } from '../../translations.js';
import { BOE_URL, ICON } from '../V2Layout.jsx';

const DEMO_PATH = '/canal/demo';
const REPORTER_ICONS = [EyeOff, Paperclip, KeyRound, Languages];
const MANAGER_ICONS = [ListChecks, MessagesSquare, UsersRound, History, ShieldCheck, FileSpreadsheet];
const STATUS_FLOW = ['received', 'investigating', 'resolved'];

/**
 * La fitxa del canal ("Així consta una denúncia anònima"), amb els mateixos textos i classes
 * que a V2Home perquè sigui la peça real del producte i no una maqueta.
 */
function Ficha({ tv }) {
  return (
    <div className="v2-ficha v2-land-ficha">
      <div className="v2-ficha-head">
        <FileLock2 {...ICON} />
        <div>
          <p className="v2-ficha-title">{tv.fichaTitle}</p>
          <p className="v2-ficha-sub">{tv.fichaSub}</p>
        </div>
      </div>
      <dl className="v2-ficha-block is-no">
        {[tv.fName, tv.fEmail, tv.fPhone].map((label, i) => (
          <div className="v2-f-row" key={label} style={{ '--i': i }}>
            <dt>{label}</dt>
            <dd><X {...ICON} />{tv.notStored}</dd>
          </div>
        ))}
      </dl>
      <dl className="v2-ficha-block">
        <div className="v2-f-row"><dt>{tv.fFacts}</dt><dd><Check {...ICON} />{tv.stored}</dd></div>
        <div className="v2-f-row"><dt>{tv.fOptional}</dt><dd className="opc">{tv.ifProvided}</dd></div>
        <div className="v2-f-row"><dt>{tv.fLang}</dt><dd><Check {...ICON} />{tv.stored}</dd></div>
      </dl>
      <div className="v2-ficha-foot">
        <p>{tv.fCode}<small>{tv.fCodeNote}</small></p>
        <span className="v2-code" aria-hidden="true">A3B7-C9X2</span>
      </div>
    </div>
  );
}

export default function V2Landing() {
  const { lang } = useOutletContext();
  const s = translations[lang].v2site;
  const t = s.landing;
  const tv = translations[lang].v2;
  const status = translations[lang].v2admin.status;

  useEffect(() => { document.title = t.docTitle; }, [t]);

  return (
    <>
      {/* ── Portada: el missatge a l'esquerra, la peça real del canal a la dreta ── */}
      <section className="v2-land-hero" aria-labelledby="v2-land-title">
        <div className="v2-wrap v2-land-hero-grid">
          <div className="v2-land-hero-text">
            <h1 className="v2-land-h1" id="v2-land-title">{t.title}</h1>
            <p className="v2-promise">{t.promise}</p>
            <p className="v2-lead">{t.lead}</p>
            <div className="v2-actions">
              <Link className="v2-btn v2-btn-primary icon-trail" to="/crear-compte">
                {s.navSignup}<ArrowRight {...ICON} />
              </Link>
              <Link className="v2-btn v2-btn-secondary" to={DEMO_PATH}>{s.navDemo}</Link>
            </div>
          </div>

          <figure className="v2-land-stage">
            <Ficha tv={tv} />
            <figcaption>{t.figCaption}</figcaption>
          </figure>
        </div>
      </section>

      {/* ── Obligació legal ── */}
      <section className="v2-land-obl" aria-labelledby="v2-land-obl-t">
        <div className="v2-wrap v2-land-obl-grid">
          <div className="v2-land-obl-main">
            <h2 className="v2-sec-title" id="v2-land-obl-t">{t.oblTitle}</h2>
            <p className="v2-land-answer">{t.oblAnswer}</p>
            <p className="v2-land-obl-text">{t.oblText}</p>
            <a className="v2-link v2-land-ext" href={BOE_URL} target="_blank" rel="noopener noreferrer">
              {t.oblLink}<ArrowUpRight {...ICON} />
            </a>
          </div>
          <dl className="v2-land-refs" aria-label={t.oblRefsLabel}>
            {t.oblRefs.map(r => (
              <div className="v2-land-ref" key={r.anchor}>
                <dt>
                  <a href={`${BOE_URL}#${r.anchor}`} target="_blank" rel="noopener noreferrer">
                    {r.art}<span className="v2-vh"> {t.opensBoe}</span><ArrowUpRight {...ICON} />
                  </a>
                </dt>
                <dd>{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Dues parts: qui denuncia i qui gestiona, unides pel codi ── */}
      <section className="v2-land-two v2-wrap" aria-labelledby="v2-land-two-t">
        <h2 className="v2-sec-title" id="v2-land-two-t">{t.twoTitle}</h2>
        <p className="v2-lead v2-land-two-lead">{t.twoLead}</p>

        <div className="v2-land-pair">
          <div className="v2-land-side">
            <div className="v2-land-side-head">
              <span className="v2-land-badge" aria-hidden="true"><UserRound {...ICON} /></span>
              <div>
                <h3>{t.reporterTitle}</h3>
                <p>{t.reporterSub}</p>
              </div>
            </div>
            <ul className="v2-land-caps">
              {t.reporterItems.map((item, i) => {
                const Icon = REPORTER_ICONS[i];
                return <li key={item}><Icon {...ICON} /><span>{item}</span></li>;
              })}
            </ul>
          </div>

          <div className="v2-land-seam">
            <span className="v2-land-seam-label">{t.seamLabel}</span>
            <span className="v2-code" aria-hidden="true">A3B7-C9X2</span>
          </div>

          <div className="v2-land-side is-private">
            <div className="v2-land-side-head">
              <span className="v2-land-badge" aria-hidden="true"><LayoutDashboard {...ICON} /></span>
              <div>
                <h3>{t.managerTitle}</h3>
                <p>{t.managerSub}</p>
              </div>
            </div>
            <ul className="v2-land-caps">
              {t.managerItems.map((item, i) => {
                const Icon = MANAGER_ICONS[i];
                return <li key={item}><Icon {...ICON} /><span>{item}</span></li>;
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Posada en marxa ── */}
      <section className="v2-land-steps v2-wrap" aria-labelledby="v2-land-steps-t">
        <h2 className="v2-sec-title" id="v2-land-steps-t">{t.stepsTitle}</h2>
        <ol className="v2-land-step-list">
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">1</span>
            <h3>{t.step1t}</h3>
            <p>{t.step1d}</p>
          </li>
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">2</span>
            <h3>{t.step2t}</h3>
            <p>{t.step2d}</p>
            <span className="v2-land-path"><Link2 {...ICON} />{t.step2path}</span>
          </li>
          <li className="v2-land-step">
            <span className="v2-land-num" aria-hidden="true">3</span>
            <h3>{t.step3t}</h3>
            <p>{t.step3d}</p>
            <span className="v2-land-flow">
              {/* la fletxa va enganxada a l'estat següent perquè no quedi penjada al final de línia */}
              {STATUS_FLOW.map((k, i) => (
                <span className="v2-land-flow-step" key={k}>
                  {i > 0 && <ArrowRight {...ICON} />}
                  <span className="v2-land-status">{status[k]}</span>
                </span>
              ))}
            </span>
          </li>
        </ol>
      </section>

      {/* ── Tancament ── */}
      <section className="v2-land-end" aria-labelledby="v2-land-end-t">
        <div className="v2-wrap v2-land-end-grid">
          <div>
            <h2 className="v2-sec-title" id="v2-land-end-t">{t.endTitle}</h2>
            <p>{t.endText}</p>
          </div>
          <div className="v2-land-end-actions">
            <Link className="v2-btn v2-btn-onnavy icon-trail" to="/crear-compte">
              {s.navSignup}<ArrowRight {...ICON} />
            </Link>
            <Link className="v2-btn v2-btn-ghostnavy" to={DEMO_PATH}>{s.navDemo}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
