#!/usr/bin/env node
// Usage: npm run db:migrate
// Applies all pending SQL files from supabase/migrations/ in order.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(__dirname, '..', '.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const PAT     = env.SUPABASE_PAT;
const PROJECT = env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!PAT || !PROJECT) {
  console.error('❌  Missing SUPABASE_PAT or VITE_SUPABASE_URL in .env');
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function runSQL(sql, label) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (data.message) {
    // Ignore "already exists" errors
    if (data.message.includes('already exists')) {
      console.log(`  ⚠️  ${label} — ja existia, saltat`);
    } else {
      console.error(`  ❌  ${label}\n     ${data.message}`);
      return false;
    }
  } else {
    console.log(`  ✅  ${label}`);
  }
  return true;
}

// Ensure migrations tracking table exists
await runSQL(`
  create table if not exists _migrations (
    id         serial primary key,
    filename   text unique not null,
    applied_at timestamptz default now()
  )
`, 'taula _migrations');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('ℹ️  No hi ha migracions pendents.');
  process.exit(0);
}

// Fetch already applied migrations
const res = await fetch(API, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'select filename from _migrations' }),
});
const applied = new Set((await res.json()).map(r => r.filename));

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  ⏭️  ${file} — ja aplicada`);
    continue;
  }
  console.log(`\n▶  ${file}`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const ok = await runSQL(sql, file);
  if (ok) {
    await fetch(API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `insert into _migrations (filename) values ('${file}')` }),
    });
    ran++;
  }
}

console.log(`\n✔  ${ran} migració${ran !== 1 ? 'ns' : ''} aplicada${ran !== 1 ? 'es' : ''}.`);
