import React, { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FilePlus2, Search, MonitorSmartphone, Scale, ArrowUpRight } from 'lucide-react';
import { translations } from '../translations.js';
import { EuFlag, BOE_URL, ICON, fmt, AIPI_URL, Stable, stableOf } from './V2Layout.jsx';

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pàgina no es mou
const S = stableOf(T => T.v2);
import Ficha from './Ficha.jsx';

export default function V2Home() {
  const { lang, org, base } = useOutletContext();
  const t = translations[lang].v2;
  const o = { org: org.name };
  // Textos que no canvien de mida en canviar d'idioma
  const st = (pick, props) => <Stable lang={lang} pick={T => pick(T.v2)} {...props} />;

  useEffect(() => { document.title = `${t.title} · ${org.name}`; }, [t, org]);

  return (
    <>
      <section className="v2-hero v2-wrap" aria-labelledby="v2-title">
        <div className="v2-hero-grid">
          <div className="v2-hero-text">
            {st(x => x.title, { as: 'h1', id: 'v2-title' })}
            {st(x => x.promise, { as: 'p', className: 'v2-promise' })}
            {st(x => fmt(x.lead, o), { as: 'p', className: 'v2-lead' })}
            <div className="v2-actions">
              <Link className="v2-btn v2-btn-primary icon-lead" to={`${base}/denuncia`} replace>
                <FilePlus2 {...ICON} />{st(x => x.ctaSubmit)}
              </Link>
              <Link className="v2-btn v2-btn-secondary icon-lead" to={`${base}/consulta`} replace>
                <Search {...ICON} />{st(x => x.ctaTrack)}
              </Link>
            </div>
            <p className="v2-tip">
              <MonitorSmartphone {...ICON} />
              {st(x => <><b>{x.tipTitle}</b> {x.tipText}</>)}
            </p>
          </div>

          {/* La fitxa: demostra què consta i què no en una denúncia anònima */}
          <Ficha lang={lang} titleId="v2-ficha-t" />
        </div>
      </section>

      <section className="v2-pasos v2-wrap" aria-labelledby="v2-pasos-t">
        {st(x => x.stepsTitle, { as: 'h2', className: 'v2-sec-title', id: 'v2-pasos-t' })}
        <ol className="v2-p-list">
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">1</span>{st(x => x.s1t, { as: 'h3' })}{st(x => x.s1d, { as: 'p' })}</li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">2</span>{st(x => x.s2t, { as: 'h3' })}{st(x => <><b>{x.s2b}</b> {x.s2d}</>, { as: 'p' })}</li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">3</span>{st(x => x.s3t, { as: 'h3' })}{st(x => fmt(x.s3d, o), { as: 'p' })}</li>
          <li className="v2-p-item"><span className="v2-p-num" aria-hidden="true">4</span>{st(x => x.s4t, { as: 'h3' })}{st(x => x.s4d, { as: 'p' })}</li>
        </ol>
        <p className="v2-plazo"><Scale {...ICON} />{st(x => x.deadline)}</p>
      </section>

      <section className="v2-legal" aria-labelledby="v2-legal-t">
        <div className="v2-wrap v2-legal-grid">
          <div className="v2-legal-main">
            <EuFlag className="v2-legal-flag" width={48} height={32} label={t.euFlag} />
            <S as="h2" className="v2-sec-title" id="v2-legal-t" k="legalTitle" />
            <S as="p" pick={x => fmt(x.legalText, o)} />
            <div className="v2-legal-links">
              <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer">
                <S k="footerLaw" /><ArrowUpRight {...ICON} />
              </a>
              <Link className="v2-link" to={`${base}/privacidad`} replace><S k="privacy" /></Link>
            </div>
          </div>
          <dl className="v2-refs">
            <div><S as="dt" k="ref1t" /><S as="dd" k="ref1d" /></div>
            <div><S as="dt" k="ref2t" /><S as="dd" k="ref2d" /></div>
            <div><S as="dt" k="ref3t" /><S as="dd" k="ref3d" /></div>
          </dl>
        </div>

        {/* Canals externs: la llei demana informar-ne de manera clara a qui fa servir el canal intern (art. 7.2) */}
        <div className="v2-wrap">
          <div className="v2-ext">
            <div className="v2-ext-main">
              <S as="h3" id="v2-ext-t" k="extTitle" />
              <S as="p" k="extText" />
            </div>
            <ul className="v2-ext-list" aria-labelledby="v2-ext-t">
              {[
                [AIPI_URL, x => x.ext1t, x => x.ext1d],
                ...(org.regional_authority_name && org.regional_authority_url ? [[org.regional_authority_url, () => org.regional_authority_name, x => x.ext2d]] : []),
              ].map(([href, name, note]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <span><b><S block pick={name} /></b><small><S block pick={note} /></small></span>
                    <ArrowUpRight {...ICON} /><span className="v2-vh"> {t.extOpens}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
