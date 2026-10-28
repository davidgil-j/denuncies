// A5: quita los datos ocultos de los documentos antes de enviarlos en una denuncia anónima.
//
// - Office (docx, xlsx, pptx): son contenedores ZIP. Se vacían docProps/core.xml, app.xml y custom.xml (autor,
//   empresa, «modificado por», fechas) y se quitan los autores de comentarios y de control de cambios (w:author,
//   author=…, <dc:creator>, <cp:lastModifiedBy>, <author>). Las entradas que no se tocan se copian tal cual;
//   las que se cambian se guardan sin comprimir (método «stored»), así no hace falta recomprimir. Para leer el XML
//   comprimido se usa DecompressionStream (nativo del navegador, sin terceros).
// - PDF: se borran, sin cambiar la longitud (mismos bytes, no se mueven las referencias internas), los campos del
//   diccionario Info (/Author, /Creator, /Producer, /Title, /Subject, /Keywords) y el texto del paquete XMP.
//
// Si algo no se puede limpiar con garantías, la función devuelve null: la denuncia no lo sube en silencio; el
// formulario lo dice y quien denuncia decide (quitarlo o hacer una captura). La limpieza en el servidor no hace
// falta: quien se salta el navegador solo se perjudica a sí mismo.

const OFFICE_EXT = /\.(docx|xlsx|pptx|docm|xlsm|pptm)$/i;
const PDF_EXT = /\.pdf$/i;
export const isOffice = (file) => OFFICE_EXT.test(file?.name || '') || /officedocument/.test(file?.type || '');
export const isPdf = (file) => PDF_EXT.test(file?.name || '') || file?.type === 'application/pdf';
export const isCleanableDoc = (file) => isOffice(file) || isPdf(file);

/** Documento limpio para una denuncia anónima, o null si no se puede limpiar con garantías. */
export async function cleanDocForAnonymous(file) {
  try {
    if (isOffice(file)) return await cleanOffice(file);
    if (isPdf(file)) return await cleanPdf(file);
  } catch { /* cualquier fallo → null (no se sube en silencio) */ }
  return null;
}

// ── CRC-32 (estándar de ZIP) ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── ZIP: leer por el directorio central ───────────────────────────────────
function parseZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Fin del directorio central (EOCD): firma 0x06054b50, buscando desde el final
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65536; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('no-eocd');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true); // offset del directorio central
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad-central');
    const method = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true);
    const compSize = dv.getUint32(p + 20, true);
    const uncompSize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    // Cabecera local para localizar los datos
    if (dv.getUint32(localOffset, true) !== 0x04034b50) throw new Error('bad-local');
    const lNameLen = dv.getUint16(localOffset + 26, true);
    const lExtraLen = dv.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + compSize);
    entries.push({ name, method, crc, uncompSize, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

function rebuildZip(entries) {
  const enc = new TextEncoder();
  const locals = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const lh = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);                 // versión necesaria
    ldv.setUint16(6, 0, true);                  // sin flags (sin data descriptor)
    ldv.setUint16(8, e.method, true);
    ldv.setUint16(10, 0, true); ldv.setUint16(12, 0x21, true); // hora/fecha fijas (no delata nada)
    ldv.setUint32(14, e.crc, true);
    ldv.setUint32(18, e.data.length, true);     // tamaño comprimido
    ldv.setUint32(22, e.uncompSize, true);      // tamaño sin comprimir
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);                 // sin extra
    lh.set(nameBytes, 30);
    locals.push(lh, e.data);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(ch.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true); cdv.setUint16(10, e.method, true);
    cdv.setUint16(12, 0, true); cdv.setUint16(14, 0x21, true);
    cdv.setUint32(16, e.crc, true);
    cdv.setUint32(20, e.data.length, true);
    cdv.setUint32(24, e.uncompSize, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true);            // offset de la cabecera local
    ch.set(nameBytes, 46);
    central.push({ ch, size: 46 + nameBytes.length });
    offset += lh.length + e.data.length;
  }
  const centralStart = offset;
  const centralSize = central.reduce((n, c) => n + c.size, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralStart, true);
  const parts = [...locals, ...central.map(c => c.ch), eocd];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// ── Office ────────────────────────────────────────────────────────────────
const BLANK_CORE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>';
const BLANK_APP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"></Properties>';
const BLANK_CUSTOM = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"></Properties>';
const BLANKS = { 'docProps/core.xml': BLANK_CORE, 'docProps/app.xml': BLANK_APP, 'docProps/custom.xml': BLANK_CUSTOM };
// Entradas con autores de comentarios o de control de cambios
const AUTHOR_FILE = /(^|\/)(comments\w*|people|document|slide\d+|sheet\d+|threadedComments\w*)\.xml$/i;

/** Quita los autores de un XML (comentarios y control de cambios). */
export function stripAuthors(xml) {
  return xml
    .replace(/\sw:author="[^"]*"/g, ' w:author=""')
    .replace(/\sauthor="[^"]*"/g, ' author=""')
    .replace(/\suserId="[^"]*"/g, ' userId=""')
    .replace(/\sw:userId="[^"]*"/g, ' w:userId=""')
    .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/g, '<dc:creator></dc:creator>')
    .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/g, '<cp:lastModifiedBy></cp:lastModifiedBy>')
    .replace(/<author>[\s\S]*?<\/author>/g, '<author></author>');
}

async function cleanOffice(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return null; // no es un ZIP ('PK')
  const entries = parseZip(bytes);
  const enc = new TextEncoder();
  let touched = false;
  for (const e of entries) {
    const isBlank = Object.prototype.hasOwnProperty.call(BLANKS, e.name);
    const isAuthor = AUTHOR_FILE.test(e.name);
    if (!isBlank && !isAuthor) continue;
    let text;
    if (isBlank) {
      text = BLANKS[e.name];
    } else {
      const raw = e.method === 8 ? await inflateRaw(e.data) : e.data;
      const before = new TextDecoder().decode(raw);
      text = stripAuthors(before);
      if (text === before) continue; // no tenía autores: se deja como está (comprimido)
    }
    const data = enc.encode(text);
    e.method = 0;              // sin comprimir
    e.data = data;
    e.uncompSize = data.length;
    e.crc = crc32(data);
    touched = true;
  }
  const out = rebuildZip(entries);
  // Comprobación: el ZIP se vuelve a leer y ninguna entrada cambiada conserva autor
  const check = parseZip(out);
  for (const e of check) {
    if (Object.prototype.hasOwnProperty.call(BLANKS, e.name) || AUTHOR_FILE.test(e.name)) {
      const raw = e.method === 8 ? await inflateRaw(e.data) : e.data;
      const text = new TextDecoder().decode(raw);
      if (/w:author="[^"]+"|(?<!x)\bauthor="[^"]+"|<dc:creator>[^<]+|<cp:lastModifiedBy>[^<]+|<author>[^<]+/.test(text)) return null;
    }
  }
  if (!touched) return file; // no había nada que quitar
  return new File([out], file.name, { type: file.type || 'application/octet-stream', lastModified: 0 });
}

// ── PDF ─────────────────────────────────────────────────────────────────
// Borra, sin mover bytes, los campos de Info y el texto del XMP. Si el PDF esconde metadatos en flujos
// comprimidos (object streams o un flujo /Metadata comprimido) que no se pueden alcanzar, devuelve null.
async function cleanPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) return null; // '%PDF'
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); // 1 byte = 1 carácter (no se cambia la longitud)

  const blank = (len) => ' '.repeat(len);
  for (const f of ['Author', 'Creator', 'Producer', 'Title', 'Subject', 'Keywords']) {
    s = s.replace(new RegExp(`/${f}\\s*\\(((?:\\\\.|[^\\\\()])*)\\)`, 'g'), (_m, inner) => `/${f} (${blank(inner.length)})`);
    s = s.replace(new RegExp(`/${f}\\s*<([0-9A-Fa-f ]*)>`, 'g'), (_m, inner) => `/${f} <${'0'.repeat(inner.length)}>`);
  }
  // XMP: dentro del paquete, el texto de los campos típicos (mismo largo en blanco)
  s = s.replace(/<\?xpacket begin[\s\S]*?<\?xpacket end[^>]*>/g, (pkt) => pkt
    .replace(/(<(?:dc:creator|xmp:CreatorTool|pdf:Producer|xmp:MetadataDate|xmp:ModifyDate|xmp:CreateDate|dc:title|dc:description|xmpMM:[A-Za-z]+)\b[^>]*>)([\s\S]*?)(<\/\s*(?:dc:creator|xmp:CreatorTool|pdf:Producer|xmp:MetadataDate|xmp:ModifyDate|xmp:CreateDate|dc:title|dc:description|xmpMM:[A-Za-z]+)\s*>)/g,
      (_m, open, inner, close) => open + blank(inner.length) + close));

  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  // Si hay object streams o un /Metadata comprimido, puede quedar metadato escondido: no se sube en silencio
  if (/\/Type\s*\/ObjStm/.test(s)) return null;
  return new File([out], file.name, { type: 'application/pdf', lastModified: 0 });
}
