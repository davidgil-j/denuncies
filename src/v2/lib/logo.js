// Prepara el logo de «Tu marca» en el navegador antes de guardarlo. Lo deja en una imagen pequeña, sin márgenes
// transparentes y de 480 × 160 px como mucho (el canal lo pinta a 40 px de alto: sobra para pantallas de alta densidad).
// Un SVG se dibuja y se guarda como PNG: así nunca se guarda código (un SVG puede llevarlo). Se guarda como «data:»,
// que es lo único que acepta la base de datos (migración 016), y el canal lo pinta sin pedir nada a otro sitio.

export const LOGO_MAX_FILE = 5 * 1024 * 1024;
// La base de datos acepta hasta 120 000 caracteres; se deja margen
export const LOGO_MAX_CHARS = 110000;
const MAX_W = 480;
const MAX_H = 160;
// Antes de recortar, una imagen enorme se reduce a esto (no hace falta más y así no se cuelga el navegador)
const WORK = 1600;
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg';

const fail = (code) => Object.assign(new Error(code), { code });

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(fail('logo-unreadable'));
    img.src = src;
  });
}

const num = (v) => (/^\s*[\d.]+(px)?\s*$/.test(v ?? '') ? parseFloat(v) : NaN);

/** Un SVG con su tamaño puesto (sin él, algunos navegadores lo dibujan a 0 × 0), listo para dibujarlo grande */
async function svgUrl(file) {
  const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) throw fail('logo-unreadable');
  const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  let w = num(svg.getAttribute('width'));
  let h = num(svg.getAttribute('height'));
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3]; } else if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (!(w > 0 && h > 0)) { w = 300; h = 150; }
  // Se dibuja a la medida de trabajo para que el recorte y la reducción partan de una imagen nítida
  const k = Math.min(WORK / w, WORK / h);
  svg.setAttribute('width', String(Math.round(w * k)));
  svg.setAttribute('height', String(Math.round(h * k)));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Quita los bordes transparentes (y los casi transparentes) para que el logo cuadre con el nombre */
function trimmed(src) {
  const { width: w, height: h } = src;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) throw fail('logo-empty');
  const out = canvasOf(right - left + 1, bottom - top + 1);
  out.getContext('2d').drawImage(src, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function encode(src, scale, jpeg) {
  const c = canvasOf(src.width * scale, src.height * scale);
  const ctx = c.getContext('2d');
  // Sin transparencia (JPEG), el fondo es blanco: el logo se ve siempre sobre blanco o sobre su placa blanca
  if (jpeg) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL(jpeg ? 'image/jpeg' : 'image/png', 0.9), width: c.width, height: c.height };
}

/**
 * Del archivo elegido a { dataUrl, width, height }. Errores (en error.code): logo-big (más de 5 MB),
 * logo-unreadable (no es una imagen que se pueda leer) y logo-empty (la imagen es toda transparente).
 */
export async function prepareLogo(file) {
  if (!file) throw fail('logo-unreadable');
  if (file.size > LOGO_MAX_FILE) throw fail('logo-big');
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name ?? '');
  if (!isSvg && !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw fail('logo-unreadable');
  const url = isSvg ? await svgUrl(file) : URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) throw fail('logo-unreadable');
    const k = Math.min(1, WORK / nw, WORK / nh);
    const work = canvasOf(nw * k, nh * k);
    work.getContext('2d').drawImage(img, 0, 0, work.width, work.height);
    const logo = trimmed(work);
    // A la medida final; si aún pesa demasiado, en JPEG y después más pequeño
    const fit = Math.min(1, MAX_W / logo.width, MAX_H / logo.height);
    for (const [scale, jpeg] of [[fit, false], [fit, true], [fit * 0.75, true], [fit * 0.5, true]]) {
      const out = encode(logo, scale, jpeg);
      if (out.dataUrl.length <= LOGO_MAX_CHARS) return out;
    }
    throw fail('logo-big');
  } finally {
    URL.revokeObjectURL(url);
  }
}
