// Sirve una carpeta compilada (dist) como lo haría Vercel con vercel.json: primero los archivos que existen, después las
// reescrituras en orden (con sus condiciones has/missing de host, query y cabecera) y las cabeceras de cada regla.
// Lo usan las pruebas que necesitan la web tal cual queda publicada (csp, portada, Lighthouse). No sale nada del ordenador.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml',
};

/** El patrón de una regla de vercel.json («/canal/:path*», «/((?!canal/).*)»…) como expresión regular */
export function sourceRegex(src) {
  let r = '';
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === ':') {
      const m = /^:([A-Za-z0-9_]+)([*+?])?/.exec(src.slice(i));
      i += m[0].length;
      r += m[2] === '*' ? '(.*)' : m[2] === '+' ? '(.+)' : m[2] === '?' ? '([^/]*)' : '([^/]+)';
      continue;
    }
    if (c === '(') {
      let depth = 0, j = i;
      for (; j < src.length; j++) { if (src[j] === '(') depth++; else if (src[j] === ')' && --depth === 0) break; }
      r += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    r += /[.+?^${}|[\]\\]/.test(c) ? `\\${c}` : c;
    i++;
  }
  return new RegExp(`^${r}$`);
}

// Una condición (has o missing): el valor puede faltar (basta con que exista), ser una expresión o un objeto (eq, pre, suf…)
function valueOf(cond, req, url) {
  if (cond.type === 'host') return String(req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
  if (cond.type === 'query') return url.searchParams.get(cond.key);
  if (cond.type === 'header') return req.headers[cond.key.toLowerCase()] ?? null;
  if (cond.type === 'cookie') return (String(req.headers.cookie ?? '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === cond.key) ?? [])[1] ?? null;
  return null;
}
function matches(cond, req, url) {
  const v = valueOf(cond, req, url);
  if (v == null) return false;
  const want = cond.value;
  if (want === undefined) return true;
  if (typeof want === 'string') return new RegExp(`^${want}$`).test(v);
  if ('eq' in want && v !== String(want.eq)) return false;
  if ('neq' in want && v === String(want.neq)) return false;
  if ('inc' in want && !want.inc.includes(v)) return false;
  if ('ninc' in want && want.ninc.includes(v)) return false;
  if ('pre' in want && !v.startsWith(want.pre)) return false;
  if ('suf' in want && !v.endsWith(want.suf)) return false;
  if ('re' in want && !new RegExp(want.re).test(v)) return false;
  return true;
}
const applies = (rule, req, url) => sourceRegex(rule.source).test(url.pathname)
  && (rule.has ?? []).every(c => matches(c, req, url))
  && (rule.missing ?? []).every(c => !matches(c, req, url));

/** El archivo que Vercel serviría para esta petición (ruta dentro de dist) y la regla de reescritura usada */
export function resolveFile(dist, req, url) {
  const asFile = path.join(dist, decodeURIComponent(url.pathname));
  if (asFile.startsWith(dist) && fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return { file: asFile, rewrite: null };
  for (const rule of VERCEL.rewrites ?? []) {
    if (applies(rule, req, url)) return { file: path.join(dist, rule.destination), rewrite: rule };
  }
  return { file: null, rewrite: null };
}

/** Las cabeceras que Vercel pondría a esta petición (se aplican todas las reglas que encajan, en orden) */
export function headersFor(req, url) {
  const out = new Map();
  for (const rule of VERCEL.headers ?? []) if (applies(rule, req, url)) for (const { key, value } of rule.headers) out.set(key, value);
  return out;
}

// Como Vercel: los textos (HTML, JS, CSS, SVG…) van comprimidos con brotli o gzip si el navegador lo acepta
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt', '.xml']);
const packed = new Map();
function compressed(file, enc) {
  const key = `${file}:${enc}`;
  if (!packed.has(key)) {
    const raw = fs.readFileSync(file);
    packed.set(key, enc === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }) : zlib.gzipSync(raw, { level: 9 }));
  }
  return packed.get(key);
}

/**
 * Arranca el servidor. Opciones:
 *   dist: la carpeta compilada · port
 *   header(key, value, url): para retocar una cabecera en local (sin https: se quita upgrade-insecure-requests y HSTS)
 *   log: un array donde se apunta cada petición { path, file, status }
 */
export async function serveLikeVercel({ dist, port, header = (k, v) => v, log = null }) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const { file } = resolveFile(dist, req, url);
    for (const [key, value] of headersFor(req, url)) {
      if (key === 'Strict-Transport-Security') continue;
      const v = header(key, value.replace('; upgrade-insecure-requests', ''), url);
      if (v != null) res.setHeader(key, v);
    }
    if (!file || !fs.existsSync(file)) { res.statusCode = 404; log?.push({ path: url.pathname, file: null, status: 404 }); return res.end('404'); }
    log?.push({ path: url.pathname + url.search, file: path.relative(dist, file), status: 200 });
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    const accepts = String(req.headers['accept-encoding'] ?? '');
    const enc = COMPRESSIBLE.has(path.extname(file)) ? (/\bbr\b/.test(accepts) ? 'br' : /\bgzip\b/.test(accepts) ? 'gzip' : null) : null;
    if (enc) {
      const body = compressed(file, enc);
      res.setHeader('Content-Encoding', enc);
      res.setHeader('Vary', [res.getHeader('Vary'), 'Accept-Encoding'].filter(Boolean).join(', '));
      res.setHeader('Content-Length', body.length);
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    const size = fs.statSync(file).size;
    res.setHeader('Accept-Ranges', 'bytes');
    // Los vídeos se piden por trozos (Range): como en Vercel, se responde con el trozo pedido
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', size);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(port, r));
  return server;
}
