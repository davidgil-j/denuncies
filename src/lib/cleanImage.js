// Quita los datos ocultos de una foto (EXIF: ubicación GPS, modelo del dispositivo, fecha y hora) antes de enviarla
// en una denuncia anónima.
//
// 1. JPEG, PNG y WebP: se vuelve a dibujar en un lienzo (respeta la orientación). Si el navegador no puede
//    (una foto demasiado grande para el lienzo, un archivo extraño), se quitan los bloques de metadatos byte a byte.
// 2. Otras fotos (HEIC del iPhone, TIFF, GIF, BMP, AVIF): se convierten a JPEG si el navegador las sabe leer.
// 3. Si no hay manera de limpiarla, devuelve null: la foto no se envía y el formulario lo dice.
// Office (docx/xlsx/pptx) y PDF se limpian con cleanDocs.js (A5). El resto (vídeo, audio, texto) se deja igual:
// el formulario avisa de que el vídeo y el audio pueden llevar la ubicación y el modelo del móvil.
import { isCleanableDoc, cleanDocForAnonymous } from './cleanDocs.js';
const REDRAW = ['image/jpeg', 'image/png', 'image/webp'];

/** Archivo limpio para una denuncia anónima, o null si no se puede limpiar con garantías. */
export async function cleanForAnonymous(file) {
  if (isCleanableDoc(file)) return cleanDocForAnonymous(file);
  if (!isImage(file)) return file;
  const type = REDRAW.includes(file.type) ? file.type : 'image/jpeg';
  const drawn = await redraw(file, type);
  if (drawn) return new File([drawn], type === file.type ? file.name : renameTo(file.name, 'jpg'), { type, lastModified: 0 });
  if (REDRAW.includes(file.type)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const clean = file.type === 'image/jpeg' ? stripJpeg(bytes) : file.type === 'image/png' ? stripPng(bytes) : stripWebp(bytes);
    if (clean) return new File([clean], file.name, { type: file.type, lastModified: 0 });
  }
  return null;
}

const EXT_IMAGE = /\.(jpe?g|png|webp|heic|heif|tiff?|gif|bmp|avif)$/i;
function isImage(file) { return (file.type || '').startsWith('image/') || EXT_IMAGE.test(file.name || ''); }
function renameTo(name, ext) { return /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, `.${ext}`) : `${name}.${ext}`; }

async function redraw(file, type) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  try {
    // 'from-image' aplica la orientación del EXIF antes de descartarlo: la foto no sale girada
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return await new Promise(resolve => canvas.toBlob(resolve, type, 0.92));
  } catch {
    return null;
  }
}

// ── Limpieza byte a byte ─────────────────────────────────────────────
// Cada función devuelve los bytes sin metadatos, o null si el archivo no tiene la estructura esperada.

/** JPEG: fuera los segmentos APP1–APP15 (EXIF, XMP, IPTC, perfiles) y los comentarios. Se mantiene APP0 (JFIF). */
export function stripJpeg(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  const out = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; } // relleno
    if (marker === 0xda) { out.push(b.subarray(i)); return concat(out); } // a partir de aquí, la imagen
    if (marker === 0xd9) { out.push(b.subarray(i, i + 2)); return concat(out); }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) out.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

/** PNG: fuera los bloques de texto, EXIF y fecha (tEXt, iTXt, zTXt, eXIf, tIME) */
export function stripPng(b) {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!SIG.every((v, k) => b[k] === v)) return null;
  const DROP = ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'];
  const out = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (!DROP.includes(type)) out.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') return concat(out);
  }
  return null;
}

/** WebP: fuera los bloques EXIF y XMP, y sus marcas en la cabecera VP8X */
export function stripWebp(b) {
  const tag = (k) => String.fromCharCode(b[k], b[k + 1], b[k + 2], b[k + 3]);
  if (b.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return null;
  const out = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = tag(i);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + len + (len & 1);
    if (i + 8 + len > b.length) return null;
    if (type === 'VP8X') {
      const chunk = b.slice(i, Math.min(end, b.length));
      chunk[8] &= ~0x0c; // sin «tiene EXIF» (0x08) ni «tiene XMP» (0x04)
      out.push(chunk);
    } else if (type !== 'EXIF' && type !== 'XMP ') out.push(b.subarray(i, Math.min(end, b.length)));
    i = end;
  }
  const body = concat(out);
  const head = new Uint8Array(12);
  head.set(b.subarray(0, 12));
  const size = body.length + 4;
  head[4] = size & 0xff; head[5] = (size >> 8) & 0xff; head[6] = (size >> 16) & 0xff; head[7] = (size >>> 24) & 0xff;
  return concat([head, body]);
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
