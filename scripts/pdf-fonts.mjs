#!/usr/bin/env node
// Genera src/v2/lib/pdfFonts.js (la tipografia dels PDF) a partir de Manrope, tal com ja està instal·lada
// amb @fontsource/manrope. Sense dependències noves: només zlib, que ve amb Node.
//
//   node scripts/pdf-fonts.mjs
//
// Per què cal: jsPDF només accepta TrueType (.ttf), i @fontsource dona WOFF (TrueType comprimit amb zlib)
// partit en subconjunts. L'script descomprimeix els subconjunts «latin» i «latin-ext» de cada pes i els uneix
// en una sola font, sense instruccions de hinting ni taules de maquetació (jsPDF no les fa servir).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = path.join(ROOT, 'node_modules', '@fontsource', 'manrope', 'files');
const OUT = path.join(ROOT, 'src', 'v2', 'lib', 'pdfFonts.js');
const WEIGHTS = { TEXT_400: 400, TEXT_700: 700, DISPLAY_800: 800 };

// ── Llegir un WOFF ─────────────────────────────────────────────────────
function readWoff(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'wOFF') throw new Error(`${file}: no és WOFF 1`);
  const numTables = b.readUInt16BE(12);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = b.toString('latin1', o, o + 4);
    const offset = b.readUInt32BE(o + 4), compLength = b.readUInt32BE(o + 8), origLength = b.readUInt32BE(o + 12);
    const raw = b.subarray(offset, offset + compLength);
    tables[tag] = compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw);
  }
  return parse(tables);
}

function parse(t) {
  if (!t.glyf) throw new Error('només TrueType (glyf)');
  const numGlyphs = t.maxp.readUInt16BE(4);
  const longLoca = t.head.readInt16BE(50) === 1;
  const loca = Array.from({ length: numGlyphs + 1 }, (_, i) => (longLoca ? t.loca.readUInt32BE(i * 4) : t.loca.readUInt16BE(i * 2) * 2));
  const glyphs = Array.from({ length: numGlyphs }, (_, i) => t.glyf.subarray(loca[i], loca[i + 1]));
  const nHM = t.hhea.readUInt16BE(34);
  const metrics = Array.from({ length: numGlyphs }, (_, i) => {
    if (i < nHM) return [t.hmtx.readUInt16BE(i * 4), t.hmtx.readInt16BE(i * 4 + 2)];
    return [t.hmtx.readUInt16BE((nHM - 1) * 4), t.hmtx.readInt16BE(nHM * 4 + (i - nHM) * 2)];
  });
  return { tables: t, glyphs, metrics, cmap: readCmap(t.cmap) };
}

/** codi Unicode → glif, de la subtaula de format 4 o 12 */
function readCmap(c) {
  const map = new Map();
  const n = c.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const off = c.readUInt32BE(4 + i * 8 + 4);
    const format = c.readUInt16BE(off);
    if (format === 12) {
      const groups = c.readUInt32BE(off + 12);
      for (let g = 0; g < groups; g++) {
        const s = c.readUInt32BE(off + 16 + g * 12), e = c.readUInt32BE(off + 20 + g * 12), gid = c.readUInt32BE(off + 24 + g * 12);
        for (let cp = s; cp <= e; cp++) map.set(cp, gid + cp - s);
      }
    } else if (format === 4) {
      const segX2 = c.readUInt16BE(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = c.readUInt16BE(ends + s * 2), start = c.readUInt16BE(starts + s * 2), delta = c.readInt16BE(deltas + s * 2), ro = c.readUInt16BE(ranges + s * 2);
        for (let cp = start; cp <= end && cp !== 0xFFFF; cp++) {
          let gid;
          if (ro === 0) gid = (cp + delta) & 0xFFFF;
          else { const at = ranges + s * 2 + ro + (cp - start) * 2; gid = c.readUInt16BE(at); if (gid) gid = (gid + delta) & 0xFFFF; }
          if (gid) map.set(cp, gid);
        }
      }
    }
  }
  return map;
}

// ── Glifs: components i instruccions ──────────────────────────────────
const ARG_WORDS = 0x1, HAVE_SCALE = 0x8, MORE = 0x20, XY_SCALE = 0x40, TWO_BY_TWO = 0x80, HAVE_INSTR = 0x100;
const componentSize = (flags) => 4 + (flags & ARG_WORDS ? 4 : 2) + (flags & HAVE_SCALE ? 2 : flags & XY_SCALE ? 4 : flags & TWO_BY_TWO ? 8 : 0);

/** glifs que fa servir un glif compost */
function components(g) {
  if (g.length < 10 || g.readInt16BE(0) >= 0) return [];
  const out = [];
  for (let o = 10; ;) { const flags = g.readUInt16BE(o); out.push(g.readUInt16BE(o + 2)); o += componentSize(flags); if (!(flags & MORE)) break; }
  return out;
}

/** El glif sense instruccions de hinting i amb els components renumerats */
function clean(g, remap = (x) => x) {
  if (g.length === 0) return Buffer.alloc(0);
  const contours = g.readInt16BE(0);
  if (contours >= 0) {
    const iLen = 10 + contours * 2;
    const instr = g.readUInt16BE(iLen);
    const out = Buffer.concat([g.subarray(0, iLen), Buffer.from([0, 0]), g.subarray(iLen + 2 + instr)]);
    return pad(out);
  }
  const out = Buffer.from(g);
  let o = 10, end;
  for (;;) {
    const flags = out.readUInt16BE(o);
    out.writeUInt16BE(flags & ~HAVE_INSTR, o);
    out.writeUInt16BE(remap(out.readUInt16BE(o + 2)), o + 2);
    o += componentSize(flags);
    if (!(flags & MORE)) { end = o; break; }
  }
  return pad(out.subarray(0, end));
}
const pad = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);

// ── Unir els subconjunts ───────────────────────────────────────────────
function merge(base, extra) {
  const glyphs = base.glyphs.map((g) => clean(g));
  const metrics = [...base.metrics];
  const cmap = new Map(base.cmap);
  const moved = new Map(); // glif de «extra» → glif nou
  const bring = (gid) => {
    if (moved.has(gid)) return moved.get(gid);
    const id = glyphs.length;
    moved.set(gid, id);
    glyphs.push(null);
    metrics.push(extra.metrics[gid]);
    for (const c of components(extra.glyphs[gid])) bring(c);
    glyphs[id] = clean(extra.glyphs[gid], (c) => moved.get(c));
    return id;
  };
  for (const [cp, gid] of extra.cmap) if (!cmap.has(cp)) cmap.set(cp, bring(gid));
  return build(base.tables, glyphs, metrics, cmap);
}

function cmapTable(map) {
  const cps = [...map.keys()].filter((cp) => cp < 0xFFFF).sort((a, b) => a - b);
  const segs = [];
  for (const cp of cps) {
    const last = segs[segs.length - 1];
    if (last && cp === last.end + 1 && map.get(cp) === map.get(last.end) + 1) last.end = cp;
    else segs.push({ start: cp, end: cp, delta: (map.get(cp) - cp) & 0xFFFF });
  }
  segs.push({ start: 0xFFFF, end: 0xFFFF, delta: 1 });
  const n = segs.length;
  const len = 16 + n * 8;
  const s = Buffer.alloc(len);
  const log = Math.floor(Math.log2(n));
  s.writeUInt16BE(4, 0); s.writeUInt16BE(len, 2); s.writeUInt16BE(0, 4);
  s.writeUInt16BE(n * 2, 6); s.writeUInt16BE(2 ** log * 2, 8); s.writeUInt16BE(log, 10); s.writeUInt16BE(n * 2 - 2 ** log * 2, 12);
  segs.forEach((g, i) => {
    s.writeUInt16BE(g.end, 14 + i * 2);
    s.writeUInt16BE(g.start, 16 + n * 2 + i * 2);
    s.writeUInt16BE(g.delta, 16 + n * 4 + i * 2);
    s.writeUInt16BE(0, 16 + n * 6 + i * 2);
  });
  const head = Buffer.alloc(12);
  head.writeUInt16BE(0, 0); head.writeUInt16BE(1, 2); head.writeUInt16BE(3, 4); head.writeUInt16BE(1, 6); head.writeUInt32BE(12, 8);
  return Buffer.concat([head, s]);
}

function build(src, glyphs, metrics, cmap) {
  const n = glyphs.length;
  const loca = Buffer.alloc((n + 1) * 4);
  let off = 0;
  glyphs.forEach((g, i) => { loca.writeUInt32BE(off, i * 4); off += g.length; });
  loca.writeUInt32BE(off, n * 4);
  const hmtx = Buffer.alloc(n * 4);
  metrics.forEach(([aw, lsb], i) => { hmtx.writeUInt16BE(aw, i * 4); hmtx.writeInt16BE(lsb, i * 4 + 2); });
  const head = Buffer.from(src.head); head.writeInt16BE(1, 50); head.writeUInt32BE(0, 8);
  const hhea = Buffer.from(src.hhea); hhea.writeUInt16BE(n, 34);
  hhea.writeUInt16BE(Math.max(...metrics.map((m) => m[0])), 10);
  const maxp = Buffer.from(src.maxp); maxp.writeUInt16BE(n, 4);
  if (maxp.length >= 32) { maxp.writeUInt16BE(0, 26); } // sense instruccions
  const post = Buffer.from(src.post.subarray(0, 32)); post.writeUInt32BE(0x00030000, 0); // sense noms de glif
  const tables = { 'OS/2': src['OS/2'], cmap: cmapTable(cmap), glyf: Buffer.concat(glyphs), head, hhea, hmtx, loca, maxp, name: src.name, post };
  const tags = Object.keys(tables).sort();
  const num = tags.length;
  const log = Math.floor(Math.log2(num));
  const header = Buffer.alloc(12 + num * 16);
  header.writeUInt32BE(0x00010000, 0); header.writeUInt16BE(num, 4);
  header.writeUInt16BE(2 ** log * 16, 6); header.writeUInt16BE(log, 8); header.writeUInt16BE(num * 16 - 2 ** log * 16, 10);
  const body = [];
  let pos = header.length;
  const sum = (b) => { const p = pad(b); let s = 0; for (let i = 0; i < p.length; i += 4) s = (s + p.readUInt32BE(i)) >>> 0; return s; };
  tags.forEach((tag, i) => {
    const data = tables[tag];
    header.write(tag, 12 + i * 16, 'latin1');
    header.writeUInt32BE(sum(data), 16 + i * 16);
    header.writeUInt32BE(pos, 20 + i * 16);
    header.writeUInt32BE(data.length, 24 + i * 16);
    body.push(pad(data));
    pos += pad(data).length;
  });
  const font = Buffer.concat([header, ...body]);
  const headAt = header.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
  font.writeUInt32BE((0xB1B0AFBA - sum(font)) >>> 0, headAt + 8);
  return font;
}

// ── Fer el fitxer ──────────────────────────────────────────────────────
const parts = Object.entries(WEIGHTS).map(([name, w]) => {
  const latin = readWoff(path.join(FILES, `manrope-latin-${w}-normal.woff`));
  const ext = readWoff(path.join(FILES, `manrope-latin-ext-${w}-normal.woff`));
  const ttf = merge(latin, ext);
  const check = parse(Object.fromEntries((() => { const n = ttf.readUInt16BE(4); return Array.from({ length: n }, (_, i) => { const o = 12 + i * 16; return [ttf.toString('latin1', o, o + 4), ttf.subarray(ttf.readUInt32BE(o + 8), ttf.readUInt32BE(o + 8) + ttf.readUInt32BE(o + 12))]; }); })()));
  console.log(`${name}: ${check.glyphs.length} glifs, ${check.cmap.size} caràcters, ${Math.round(ttf.length / 1024)} KB`);
  return `export const ${name} = '${ttf.toString('base64')}';`;
});
fs.writeFileSync(OUT, `// Tipografia dels PDF: Manrope 400, 700 i 800 (la mateixa del producte).
// Copyright 2018 The Manrope Project Authors (https://github.com/sharanda/manrope). SIL Open Font License 1.1.
// Subconjunts «latin» i «latin-ext» de @fontsource/manrope units en un sol TrueType, sense hinting ni maquetació.
// Només el carrega exportV2.js amb import() dinàmic en generar un PDF; no entra al bundle principal.
// Regenerar: node scripts/pdf-fonts.mjs
${parts.join('\n')}
`);
console.log(`Escrit ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
