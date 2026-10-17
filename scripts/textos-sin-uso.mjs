#!/usr/bin/env node
// Textos de src/translations.js que ya no usa ninguna pantalla (la portada incluida).
//
//   node scripts/textos-sin-uso.mjs           → solo los lista
//   node scripts/textos-sin-uso.mjs --write   → los quita
//
// Criterio, prudente: una clave (del primer nivel de cada apartado, o de la raíz de cada idioma) se da por
// muerta solo si su nombre no aparece como palabra en ningún archivo de código (src, scripts, index.html), ni
// encaja con ninguna clave construida al vuelo (`ref${n}t`, `${p}Today`, 'ack' + 'One'…). Un nombre común como «title»
// se queda siempre, aunque quizá ya no se use: vale más un texto de sobra que una pantalla rota.
// Antes de escribir se comprueba que el resultado es exactamente el original menos las claves quitadas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src', 'translations.js');
// Los textos del panel viven aparte (solo se descargan al entrar en el panel)
const PANEL_FILE = path.join(ROOT, 'src', 'translations-panel.js');
const SELF = fileURLToPath(import.meta.url);
const WRITE = process.argv.includes('--write');

// ── 1. Todas las palabras del código ───────────────────────────────────
const code = [];
const read = (p) => { if (p !== FILE && p !== PANEL_FILE && p !== SELF) code.push(fs.readFileSync(p, 'utf8')); };
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
// Claves hechas con una plantilla que tiene texto fijo: `ref${n}t` → /^ref.+t$/, `${p}Today` → /^.+Today$/
const PLACE = /\$\{[^}]*\}/g;
const dynamic = [...all.matchAll(/`([^`\n]*)`/g)]
  .map((m) => m[1])
  // Con al menos 3 letras fijas: `a${++n}` (una sola letra) no dice qué clave es y daba por usadas todas las que empiezan por «a»
  .filter((t) => /^[A-Za-z_]*(\$\{[^}]*\}[A-Za-z_]*)+$/.test(t) && t.replace(PLACE, '').length >= 3)
  .map((t) => new RegExp(`^${t.split(PLACE).map(escape).join('.+')}$`));
// Claves pegadas solo de trozos (`${p}${many}` con p = 'ack' y many = 'One'): se mantiene la clave si se puede
// partir en dos o más trozos que aparecen todos como cadenas en el código ('ack' + 'One' → «ackOne»)
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

// ── 2. Qué se quita ────────────────────────────────────────────────────
const { translations: base } = await import(`${pathToFileURL(FILE).href}?t=${Date.now()}`);
const { panelTexts } = await import(`${pathToFileURL(PANEL_FILE).href}?t=${Date.now()}`);
// Todos los textos juntos, como los ve la aplicación cuando el panel está cargado
const translations = Object.fromEntries(Object.keys(base).map(l => [l, { ...base[l], ...panelTexts[l] }]));
const LANGS = Object.keys(translations);
const dead = new Map(); // apartado → [claves]
for (const [key, value] of Object.entries(translations.es)) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (!used(key)) { dead.set('(apartado entero)', [...(dead.get('(apartado entero)') ?? []), key]); continue; }
    const gone = Object.keys(value).filter((k) => !used(k));
    if (gone.length) dead.set(key, gone);
  } else if (!used(key)) dead.set('(raíz)', [...(dead.get('(raíz)') ?? []), key]);
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

// ── 3. Quitarlas del texto, respetando comillas, comentarios y corchetes ──
/** Rango [inicio de la línea, fin de la propiedad con la coma y el salto de línea] de cada propiedad, por su ruta */
function locate(text, anchor) {
  const spans = new Map();
  const props = []; // propiedades abiertas: { key, start }
  const stack = []; // '{', '[', '(' o 'v' (dentro del valor de una propiedad)
  let i = text.indexOf('{', text.indexOf(anchor)) + 1;
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

/** Quita de file las claves de paths que están en él; comprueba que el resultado es el original menos esas claves */
async function cut(file, anchor, exportName, object) {
  const src = fs.readFileSync(file, 'utf8');
  const spans = locate(src, anchor);
  const mine = paths.filter(p => spans.has([LANGS[0], ...p].join('.')));
  if (!mine.length) return 0;
  const cuts = [];
  for (const lang of LANGS) for (const p of mine) {
    const span = spans.get([lang, ...p].join('.'));
    if (!span) throw new Error(`No encuentro ${lang}.${p.join('.')} en ${path.basename(file)}`);
    cuts.push(span);
  }
  // Se unen los cortes seguidos; si un grupo entero desaparece, también el comentario que lo titulaba
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
  // ── 4. Comprobar: el resultado tiene que ser el original menos lo que se ha quitado ──
  const tmp = path.join(os.tmpdir(), `textos-check-${process.pid}-${path.basename(file)}.mjs`);
  fs.writeFileSync(tmp, out);
  const after = (await import(pathToFileURL(tmp).href))[exportName];
  const expected = structuredClone(object);
  for (const lang of LANGS) for (const p of mine) { let o = expected[lang]; for (const k of p.slice(0, -1)) o = o[k]; delete o[p[p.length - 1]]; }
  if (!isDeepStrictEqual(after, expected)) throw new Error(`${path.basename(file)}: el resultado no coincide con el original menos las claves quitadas: no se ha escrito nada`);
  fs.writeFileSync(file, out);
  console.log(`Escrito ${path.relative(ROOT, file)}: ${src.split('\n').length} → ${out.split('\n').length} líneas. Comprobado: el resto de textos son idénticos.`);
  return mine.length;
}
await cut(FILE, 'translations', 'translations', base);
await cut(PANEL_FILE, 'panelTexts', 'panelTexts', panelTexts);
