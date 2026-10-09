#!/usr/bin/env node
// Lanza las pruebas de navegador. Ver e2e/README.md.
//
//   npm run e2e                     → todas
//   npm run e2e -- --only=red       → solo las que contienen «red» en el nombre
//   npm run e2e -- --list           → lista las pruebas
//
// Arranca él mismo los servidores que hacen falta (o reutiliza los que ya estén en marcha en esos puertos):
//   3111 demo · 3112 modo real contra una red simulada · 3113 demo con IA · 3114 red simulada con IA.
// Nada sale del ordenador: la «red simulada» es una dirección local que no existe (59999) y cada prueba
// responde las peticiones como lo haría la base de datos. No se toca ningún Supabase.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HERE = path.join(ROOT, 'e2e');
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const OUT = process.env.E2E_OUT || path.join(os.tmpdir(), 'reportia-e2e');
const FIX = path.join(OUT, 'archivos');
fs.mkdirSync(FIX, { recursive: true });
// Archivos de ejemplo para adjuntar: un PDF válido y un ejecutable que el canal debe rechazar
fs.writeFileSync(path.join(FIX, 'capturas-grupo.pdf'), '%PDF-1.4\n% prueba\n');
fs.writeFileSync(path.join(FIX, 'virus.exe'), 'MZ prueba');

const SERVERS = {
  3111: {},
  3112: { VITE_SUPABASE_URL: 'http://localhost:59999', VITE_SUPABASE_ANON_KEY: 'clave-falsa-de-prueba' },
  3113: { VITE_AI_ENABLED: '1' },
  3114: { VITE_SUPABASE_URL: 'http://localhost:59999', VITE_SUPABASE_ANON_KEY: 'clave-falsa-de-prueba', VITE_AI_ENABLED: '1' },
};

const out = (name) => { const d = path.join(OUT, name); fs.mkdirSync(d, { recursive: true }); return d; };
// [nombre, archivo, argumentos]. Los anchos son los de las capturas de siempre (1440 escritorio, 375 móvil).
const SUITES = [
  ['recorrido-1440', 'recorrido', (n) => [out(n), out(n), '1440']],
  ['recorrido-1366', 'recorrido', (n) => [out(n), out(n), '1366']],
  ['recorrido-375', 'recorrido', (n) => [out(n), out(n), '375']],
  ['idiomas-ca-en', 'idiomas', (n) => [out(n)]],
  ['teclado', 'teclado', () => []],
  ['rutas', 'rutas', () => []],
  ['red-sin-012', 'red-panel', (n) => [out(n), 'sin012']],
  ['red-gestor', 'red-panel', (n) => [out(n), 'gestor']],
  ['red-empresa-nueva', 'red-panel', (n) => [out(n), 'nueva']],
  ['red-sin-013', 'red-ia', (n) => [out(n), 'sin013', '3114']],
  ['red-ia-apagada', 'red-ia', (n) => [out(n), 'admin', '3112']],
  ['red-ia-encendida', 'red-ia', (n) => [out(n), 'admin', '3114']],
  ['red-ia-gestor', 'red-ia', (n) => [out(n), 'gestor', '3114']],
  ['red-contrasena', 'red-contrasena', (n) => [out(n)]],
  ['endurecimiento', 'endurecimiento', (n) => [out(n)]],
  ['ia-demo-1440', 'ia-demo', (n) => [out(n), '1440']],
  ['ia-demo-375', 'ia-demo', (n) => [out(n), '375']],
  ['canal-1440', 'canal', (n) => [out(n), FIX, '1440', 'T8GH-5RWD']],
  ['canal-375', 'canal', (n) => [out(n), FIX, '375', 'T8GH-5RWD']],
  ['panel-1440', 'panel', (n) => [out(n), FIX, '1440']],
  ['panel-375', 'panel', (n) => [out(n), FIX, '375']],
  ['ajustes-1440', 'ajustes-compartir-informe', (n) => [out(n), '1440']],
  ['ajustes-375', 'ajustes-compartir-informe', (n) => [out(n), '375']],
  ['pulido-1440', 'pulido-fallos-claridad', (n) => [out(n), '1440']],
  ['pulido-375', 'pulido-fallos-claridad', (n) => [out(n), '375']],
  ['movil-con-teclado', 'movil-teclado', (n) => [out(n)]],
  ['portatil', 'portatil', (n) => [out(n)]],
  ['contraste', 'contraste', () => []],
  ['propuestas', 'propuestas', (n) => [out(n)]],
  ['anchos-e-idiomas', 'anchos-idiomas', () => []],
  ['textos', 'textos', () => []],
  ['pdf', 'pdf', (n) => [out(n)]],
];

if (args.includes('--list')) { for (const [n] of SUITES) console.log(n); process.exit(0); }
const chosen = SUITES.filter(([n]) => !only || n.includes(only));
if (!chosen.length) { console.error(`Ninguna prueba con «${only}»`); process.exit(2); }

// ── Servidores ───────────────────────────────────────────────────────
const up = async (port) => { try { const r = await fetch(`http://localhost:${port}/`); return r.ok; } catch { return false; } };
const started = [];
for (const [port, extra] of Object.entries(SERVERS)) {
  if (await up(port)) continue;
  const env = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', ...extra };
  const child = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', port, '--strictPort', '--open', 'false'], { cwd: ROOT, env, stdio: 'ignore' });
  started.push(child);
}
const stop = () => { for (const c of started) c.kill(); };
process.on('SIGINT', () => { stop(); process.exit(130); });
for (const port of Object.keys(SERVERS)) {
  for (let i = 0; !(await up(port)); i++) {
    if (i > 120) { console.error(`El servidor del puerto ${port} no arranca`); stop(); process.exit(2); }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ── Pruebas ──────────────────────────────────────────────────────────
const run = (file, argv) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(HERE, `${file}.mjs`), ...argv], { cwd: HERE, env: process.env });
  let text = '';
  child.stdout.on('data', (d) => { text += d; });
  child.stderr.on('data', (d) => { text += d; });
  child.on('close', (code) => resolve({ code, text }));
});
const results = [];
const t0 = Date.now();
for (const [name, file, argv] of chosen) {
  const t = Date.now();
  const { code, text } = await run(file, argv(name));
  // Una prueba falla si sale con error o si su informe dice FALLA, MAL o PROBLEMAS
  const failed = code !== 0 || /^(FALLA|MAL )|PROBLEMAS|Error:/m.test(text);
  const last = text.trim().split('\n').filter((l) => !/^\s*at /.test(l)).slice(-1)[0] ?? '';
  results.push({ name, failed });
  console.log(`${failed ? '✗' : '✓'} ${name.padEnd(20)} ${((Date.now() - t) / 1000).toFixed(0).padStart(4)} s  ${failed ? '' : last}`);
  if (failed) console.log(text.split('\n').filter((l) => /^(FALLA|MAL )|PROBLEMAS|Error|^\s{3}·/.test(l)).slice(0, 25).map((l) => `      ${l}`).join('\n'));
}
stop();
const bad = results.filter((r) => r.failed);
console.log(`\n${results.length - bad.length} de ${results.length} pruebas en verde en ${Math.round((Date.now() - t0) / 60000)} min. Capturas y descargas en ${OUT}`);
process.exit(bad.length ? 1 : 0);
