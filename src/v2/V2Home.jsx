import React, { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FilePlus2, Search, MonitorSmartphone, FileLock2, X, Check, Scale, ArrowUpRight } from 'lucide-react';
import { translations } from '../translations.js';
import { EuFlag, BOE_URL, ICON, fmt } from './V2Layout.jsx';

export default function V2Home() {
  const { lang, org, base } = useOutletContext();
  const t = translations[lang].v2;
  const o = { org: org.name };

  useEffect(() => { document.title = `${t.title} · ${org.name}`; }, [t, org]);

  return (
    <>
      <section className="v2-hero v2-wrap" aria-labelledby="v2-title">
        <div className="v2-hero-grid">
          <div className="v2-hero-text">
            <h1 id="v2-title">{t.title}</h1>
            <p className="v2-promise">{t.promise}</p>
            <p className="v2-lead">{fmt(t.lead, o)}</p>
            <div className="v2-actions">
              <Link className="v2-btn v2-btn-primary icon-lead" to={`${base}/denuncia`}>
                <FilePlus2 {...ICON} />{t.ctaSubmit}
              </Link>
              <Link className="v2-btn v2-btn-secondary icon-lead" to={`${base}/consulta`}>
                <Search {...ICON} />{t.ctaTrack}
              </Link>
            </div>
            <p className="v2-tip">
              <MonitorSmartphone {...ICON} />
              <span><b>{t.tipTitle}</b> {t.tipText}</span>
            </p>
          </div>

          {/* La fitxa: demostra què consta i què no en una denúncia anònima */}
          <aside className="v2-ficha" aria-labelledby="v2-ficha-t">
            <div className="v2-ficha-head">
              <FileLock2 {...ICON} />
              <div>
                <h2 className="v2-ficha-title" id="v2-ficha-t">{t.fichaTitle}</h2>
                <p className="v2-ficha-sub">{t.fichaSub}</p>
              </div>
            </div>
            <dl className="v2-ficha-block is-no">
              {[t.fName, t.fEmail, t.fPhone].map(label => (
                <div className="v2-f-row" key={label}>
                  <dt>{label}</dt>
                  <dd><X {...ICON} />{t.notStored}</dd>
                </div>
              ))}
            </dl>
            <dl className="v2-ficha-block">
              <div className="v2-f-row"><dt>{t.fFacts}</dt><dd><Check {...ICON} />{t.stored}</dd></div>
              <div className="v2-f-row"><dt>{t.fOptional}</dt><dd className="opc">{t.ifProvided}</dd></div>
              <div className="v2-f-row"><dt>{t.fLang}</dt><dd><Check {...ICON} />{t.stored}</dd></div>
            </dl>
            <div className="v2-ficha-foot">
              <p>{t.fCode}<small>{t.fCodeNote}</small></p>
              <span className="v2-code" aria-hidden="true">A3B7-C9X2</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="v2-pasos v2-wrap" aria-labelledby="v2-pasos-t">
        <h2 className="v2-sec-title" id="v2-pasos-t">{t.stepsTitle}</h2>
        <ol className="v2-p-list">
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">1</span><h3>{t.s1t}</h3><p>{t.s1d}</p></li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">2</span><h3>{t.s2t}</h3><p><b>{t.s2b}</b> {t.s2d}</p></li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">3</span><h3>{t.s3t}</h3><p>{fmt(t.s3d, o)}</p></li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">4</span><h3>{t.s4t}</h3><p>{t.s4d}</p></li>
        </ol>
        <p className="v2-plazo"><Scale {...ICON} />{t.deadline}</p>
      </section>

      <section className="v2-legal" aria-labelledby="v2-legal-t">
        <div className="v2-wrap v2-legal-grid">
          <div className="v2-legal-main">
            <EuFlag className="v2-legal-flag" width={48} height={32} label={t.euFlag} />
            <h2 className="v2-sec-title" id="v2-legal-t">{t.legalTitle}</h2>
            <p>{fmt(t.legalText, o)}</p>
            <div className="v2-legal-links">
              <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer">
                {t.footerLaw}<ArrowUpRight {...ICON} />
              </a>
              <a className="v2-link" href={`/privacitat?lang=${lang}`}>{t.privacy}</a>
            </div>
          </div>
          <dl className="v2-refs">
            <div><dt>{t.ref1t}</dt><dd>{t.ref1d}</dd></div>
            <div><dt>{t.ref2t}</dt><dd>{t.ref2d}</dd></div>
            <div><dt>{t.ref3t}</dt><dd>{t.ref3d}</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}
