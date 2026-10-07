import React from 'react';
import { Stable, fmt } from '../V2Layout.jsx';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Texto propio de las piezas comunes (apartado «ds» de los textos), sin que nada se mueva al cambiar de idioma. */
export function Txt({ lang, k, vars, ...rest }) {
  return <Stable lang={lang} pick={T => fmt(T.ds[k], vars)} {...rest} />;
}
