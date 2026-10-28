import React, { useRef, useState } from 'react';
import { Upload, X, CircleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import { fmt } from '../V2Layout.jsx';
import { Button, IconButton, Dialog, cx } from '../ui/index.js';
import { Tc, ic } from './shared.jsx';
import { formatBytes } from '../../lib/format.js';

export const MAX_FILES = 5;
// Límite por archivo, en MB. 25 por defecto (A3: también lo exige el bucket, migración 026). Se cambia con VITE_MAX_FILE_MB
export const MAX_FILE_MB = Number(import.meta.env.VITE_MAX_FILE_MB) > 0 ? Number(import.meta.env.VITE_MAX_FILE_MB) : 25;
// Tipos admitidos: PDF, imágenes, vídeo, audio y documentos de oficina
const EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp',
  'mp4', 'mov', 'm4v', 'avi', 'webm', '3gp', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'opus', 'amr',
  'zip', 'eml', 'msg',
];
const ACCEPT = EXTENSIONS.map(e => `.${e}`).join(',');
const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
// A5: vídeo y audio pueden llevar la ubicación y el modelo del móvil; no se pueden limpiar, solo se avisa
const AV_EXT = ['mp4', 'mov', 'm4v', 'avi', 'webm', '3gp', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'opus', 'amr'];

export { formatBytes };

/**
 * Zona de pruebas: acepta arrastrar archivos, con los mismos límites y avisos de siempre. Lo que pasa con los
 * datos ocultos de los archivos se explica en un panel («Qué datos se quitan…») y, con algo ya adjunto, en una frase.
 */
export default function Pruebas({ lang, files, onChange }) {
  const t = translations[lang].canal;
  const v = translations[lang].v2;
  const [over, setOver] = useState(false);
  const [skipped, setSkipped] = useState([]); // [{ name, reason }]
  const [info, setInfo] = useState(false);
  const inputRef = useRef(null);
  const pickRef = useRef(null);
  const listRef = useRef(null);

  function add(incoming) {
    const all = [...files];
    const rejected = [];
    for (const f of incoming) {
      const reason = !EXTENSIONS.includes(extOf(f.name)) ? 'rejType'
        : f.size === 0 ? 'rejEmpty'
        : f.size > MAX_FILE_MB * 1024 * 1024 ? 'rejSize'
        : all.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified) ? 'rejDup'
        : all.length >= MAX_FILES ? 'rejMax'
        : null;
      if (reason) rejected.push({ name: f.name, reason });
      else all.push(f);
    }
    setSkipped(rejected);
    onChange(all);
  }

  // Al quitar un archivo, el foco pasa al siguiente (o al botón de elegir) y no se pierde
  function remove(i) {
    setSkipped([]);
    onChange(files.filter((_, j) => j !== i));
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll('button') ?? [];
      (buttons[Math.min(i, buttons.length - 1)] ?? pickRef.current)?.focus();
    });
  }

  return (
    <div className="proof">
      <div
        className={cx('proof-box', over && 'is-over')}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)); }}
      >
        <input
          ref={inputRef} type="file" multiple accept={ACCEPT} className="ds-vh" tabIndex={-1} aria-hidden="true"
          onChange={e => { add(Array.from(e.target.files)); e.target.value = ''; }}
        />
        <div className="proof-pick">
          <Button ref={pickRef} variant="soft" size="md" disabled={files.length >= MAX_FILES} onClick={() => inputRef.current?.click()} icon={ic(Upload, 16)}><Tc lang={lang} k="proofPick" /></Button>
          <Tc lang={lang} k="proofDrop" className="proof-drop" />
        </div>
        <button type="button" className="linkbtn" onClick={() => setInfo(true)}>{t.proofMetaLink}</button>
      </div>

      {files.length > 0 && (
        <ul className="proof-files" ref={listRef}>
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`} className="proof-file">
              <span className="proof-name" title={f.name}>{f.name}</span>
              <span className="proof-size">{formatBytes(f.size)}</span>
              <IconButton variant="bg" size="xs" label={fmt(v.remove, { name: f.name })} onClick={() => remove(i)}>{ic(X, 16)}</IconButton>
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <div className="proof-rejected" role="alert">
          {ic(CircleAlert, 18)}
          <div>
            <p>{v.skipped}</p>
            <ul>{skipped.map((r, i) => <li key={`${r.name}-${i}`}><b>{r.name}</b>: {fmt(v[r.reason], { mb: MAX_FILE_MB })}</li>)}</ul>
          </div>
        </div>
      )}
      {files.length > 0 && <p className="proof-meta">{t.proofMeta}</p>}
      {files.some(f => AV_EXT.includes(extOf(f.name))) && <p className="proof-meta proof-av">{ic(CircleAlert, 16)}{t.proofAvWarn}</p>}

      <Dialog open={info} onClose={() => setInfo(false)} title={t.proofMetaLink} closeLabel={t.close}>
        <p>{t.proofMetaFull}</p>
      </Dialog>
    </div>
  );
}
