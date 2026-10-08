#!/usr/bin/env node
// Textos de src/translations.js que ja no fa servir cap pantalla (la portada inclosa).
//
//   node scripts/textos-sin-uso.mjs           → només ho llista
//   node scripts/textos-sin-uso.mjs --write   → els treu
//
// Criteri, prudent: una clau (del primer nivell de cada apartat, o de l'arrel de cada idioma) es dona per
// morta només si el seu nom no apareix com a paraula en cap fitxer de codi (src, scripts, index.html), ni
// encaixa amb cap clau construïda al vol (`ref${n}t`, `${p}Today`, 'ack' + 'One'…). Un nom comú com «title»
// es queda sempre, encara que potser ja no es faci servir: val més un text de sobres que una pantalla trencada.
// Abans d'escriure es comprova que el resultat és exactament l'original menys les claus tretes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src', 'translations.js');
const SELF = fileURLToPath(import.meta.url);
const WRITE = process.argv.includes('--write');

// ── 1. Totes les paraules del codi ─────────────────────────────────────
const code = [];
const read = (p) => { if (p !== FILE && p !== SELF) code.push(fs.readFileSync(p, 'utf8')); };
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!['node_modules', 'dist'].includes(f)) walk(p); }
    else if (/\.(jsx?|mjs|ts|css)$/.test(f)) read(p);
  }
})(path.join(ROOT, 'src'));
for (const f of fs.readdirSync(path.join(ROOT, 'scripts'))) if (/\.m?js$/.test(f)) read(path.join(ROOT, 'scripts', f));
read(path.join(ROOT, 'index.html'));
const all = code.join('\n');
const words = new Set(all.match(/[A-Za-z_$][A-Za-z0-9_$]*/g));
const escape = (x) => x.replace(/[.*+?^()|[\]\\{}$]/g, (m) => `\\${m}`);
// Claus fetes amb una plantilla que té text fix: `ref${n}t` → /^ref.+t$/, `${p}Today` → /^.+Today$/
const PLACE = /\$\{[^}]*\}/g;
const dynamic = [...all.matchAll(/`([^`\n]*)`/g)]
  .map((m) => m[1])
  .filter((t) => /^[A-Za-z_]*(\$\{[^}]*\}[A-Za-z_]*)+$/.test(t) && t.replace(PLACE, '').length > 0)
  .map((t) => new RegExp(`^${t.split(PLACE).map(escape).join('.+')}$`));
// Claus enganxades només de trossos (`${p}${many}` amb p = 'ack' i many = 'One'): es manté la clau si es pot
// partir en dos o més trossos que apareixen tots com a cadenes al codi ('ack' + 'One' → «ackOne»)
const literals = new Set([...all.matchAll(/'([A-Za-z_]{2,40})'|"([A-Za-z_]{2,40})"/g)].map((m) => m[1] ?? m[2]));
function pieces(key) {
  const ok = [true];
  for (let i = 1; i <= key.length; i++) {
    ok[i] = false;
    for (let j = 0; j < i; j++) if (ok[j] && !(j === 0 && i === key.length) && literals.has(key.slice(j, i))) { ok[i] = true; break; }
  }
  return ok[key.length];
}
const used = (key) => words.has(key) || dynamic.some((re) => re.test(key)) || pieces(key);

// ── 2. Què es treu ─────────────────────────────────────────────────────
const { translations } = await import(`${pathToFileURL(FILE).href}?t=${Date.now()}`);
const LANGS = Object.keys(translations);
const dead = new Map(); // apartat → [claus]
for (const [key, value] of Object.entries(translations.es)) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (!used(key)) { dead.set('(apartat sencer)', [...(dead.get('(apartat sencer)') ?? []), key]); continue; }
    const gone = Object.keys(value).filter((k) => !used(k));
    if (gone.length) dead.set(key, gone);
  } else if (!used(key)) dead.set('(arrel)', [...(dead.get('(arrel)') ?? []), key]);
}
const paths = [];
for (const [section, keys] of dead) for (const k of keys) paths.push(section.startsWith('(') ? [k] : [section, k]);
let total = 0;
for (const [section, keys] of dead) {
  const of = section.startsWith('(') ? Object.keys(translations.es).length : Object.keys(translations.es[section]).length;
  console.log(`${section.padEnd(18)} ${String(keys.length).padStart(4)} de ${String(of).padEnd(4)} ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ', …' : ''}`);
  total += keys.length;
}
console.log(`\n${total} claves sin uso (en cada uno de los ${LANGS.length} idiomas)`);
if (!WRITE || !total) process.exit(0);

// ── 3. Treure-les del text, respectant cometes, comentaris i claudàtors ──
const src = fs.readFileSync(FILE, 'utf8');
/** Rang [inici de la línia, fi de la propietat amb la coma i el salt de línia] de cada propietat, pel seu camí */
function locate(text) {
  const spans = new Map();
  const props = []; // propietats obertes: { key, start }
  const stack = []; // '{', '[', '(' o 'v' (dins del valor d'una propietat)
  let i = text.indexOf('{', text.indexOf('translations')) + 1;
  stack.push('{');
  const close = (end) => {
    const top = props.pop();
    stack.pop();
    let e = end;
    if (text[e] === '\n') e++;
    else if (text[e - 1] !== ',') { const nl = text.lastIndexOf('\n', e - 1); if (/^\s*$/.test(text.slice(nl + 1, e))) e = nl + 1; }
    spans.set([...props.map((p) => p.key), top.key].join('.'), [top.start, e]);
  };
  while (i < text.length && stack.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i) + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { i++; while (i < text.length && text[i] !== c) { if (text[i] === '\\') i++; i++; } i++; continue; }
    const top = stack[stack.length - 1];
    if (top === '{' && /[A-Za-z_$]/.test(c)) {
      const m = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(text.slice(i, i + 200));
      if (m) { props.push({ key: m[1], start: text.lastIndexOf('\n', i) + 1 }); stack.push('v'); i += m[0].length; continue; }
    }
    if (c === '{' || c === '[' || c === '(') { stack.push(c); i++; continue; }
    if (c === '}' || c === ']' || c === ')') { if (top === 'v') close(i); stack.pop(); i++; continue; }
    if (c === ',' && top === 'v') { close(i + 1); i++; continue; }
    i++;
  }
  return spans;
}
const spans = locate(src);
const cuts = [];
for (const lang of LANGS) for (const p of paths) {
  const span = spans.get([lang, ...p].join('.'));
  if (!span) throw new Error(`No trobo ${lang}.${p.join('.')}`);
  cuts.push(span);
}
// S'uneixen els talls seguits; si un grup sencer desapareix, també el comentari que el titulava
cuts.sort((a, b) => a[0] - b[0]);
const runs = [];
for (const c of cuts) { const last = runs[runs.length - 1]; if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]); else runs.push([...c]); }
for (const r of runs) {
  const next = src.slice(r[1], src.indexOf('\n', r[1])).trim();
  if (!(next.startsWith('//') || next.startsWith('}'))) continue;
  for (;;) { const prev = src.lastIndexOf('\n', r[0] - 2) + 1; if (r[0] > 0 && src.slice(prev, r[0]).trim().startsWith('//')) r[0] = prev; else break; }
}
let out = src;
for (const [a, b] of [...runs].reverse()) out = out.slice(0, a) + out.slice(b);

// ── 4. Comprovar: el resultat ha de ser l'original menys el que s'ha tret ──
const tmp = path.join(os.tmpdir(), `translations-check-${process.pid}.mjs`);
fs.writeFileSync(tmp, out);
const { translations: after } = await import(pathToFileURL(tmp).href);
const expected = structuredClone(translations);
for (const lang of LANGS) for (const p of paths) { let o = expected[lang]; for (const k of p.slice(0, -1)) o = o[k]; delete o[p[p.length - 1]]; }
if (!isDeepStrictEqual(after, expected)) throw new Error('El resultat no coincideix amb l’original menys les claus tretes: no s’ha escrit res');
fs.writeFileSync(FILE, out);
console.log(`Escrit ${path.relative(ROOT, FILE)}: ${src.split('\n').length} → ${out.split('\n').length} línies. Comprovat: la resta de textos són idèntics.`);
