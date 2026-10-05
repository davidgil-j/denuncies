import React from 'react';
import { FileLock2, X, Check } from 'lucide-react';
import { ICON, Stable } from './V2Layout.jsx';

/**
 * La fitxa "Així consta una denúncia anònima": què es desa i què no. És la mateixa peça al canal
 * de cada empresa i a la portada de Reportia. Tots els textos reserven l'espai de l'idioma més
 * llarg, perquè la fitxa no canviï d'alçada en canviar d'idioma.
 */
export default function Ficha({ lang, className = '', as: Tag = 'aside', titleId }) {
  const st = (pick, props) => <Stable lang={lang} pick={T => pick(T.v2)} {...props} />;
  return (
    <Tag className={`v2-ficha${className ? ` ${className}` : ''}`} aria-labelledby={titleId}>
      <div className="v2-ficha-head">
        <FileLock2 {...ICON} />
        <div>
          {st(t => t.fichaTitle, { as: 'p', className: 'v2-ficha-title', id: titleId, role: titleId ? 'heading' : undefined, 'aria-level': titleId ? 2 : undefined })}
          {st(t => t.fichaSub, { as: 'p', className: 'v2-ficha-sub' })}
        </div>
      </div>
      <dl className="v2-ficha-block is-no">
        {['fName', 'fEmail', 'fPhone'].map((key, i) => (
          <div className="v2-f-row" key={key} style={{ '--i': i }}>
            {st(t => t[key], { as: 'dt' })}
            <dd><X {...ICON} />{st(t => t.notStored)}</dd>
          </div>
        ))}
      </dl>
      <dl className="v2-ficha-block">
        <div className="v2-f-row">{st(t => t.fFacts, { as: 'dt' })}<dd><Check {...ICON} />{st(t => t.stored)}</dd></div>
        <div className="v2-f-row">{st(t => t.fOptional, { as: 'dt' })}<dd className="opc">{st(t => t.ifProvided)}</dd></div>
        <div className="v2-f-row">{st(t => t.fLang, { as: 'dt' })}<dd><Check {...ICON} />{st(t => t.stored)}</dd></div>
      </dl>
      <div className="v2-ficha-foot">
        <div className="v2-ficha-code-txt">
          {st(t => t.fCode, { as: 'p' })}
          {st(t => t.fCodeNote, { as: 'p', className: 'v2-ficha-code-note' })}
        </div>
        <span className="v2-code" aria-hidden="true">A3B7-C9X2</span>
      </div>
    </Tag>
  );
}
