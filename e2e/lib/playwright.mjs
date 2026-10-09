// Playwright vive FUERA del repositorio (no es una dependencia del proyecto). Se busca así:
//   1. si está instalado donde Node lo encuentre (por ejemplo en la integración continua, con `npm i --no-save`);
//   2. si no, en la carpeta de PLAYWRIGHT_DIR (por defecto ~/.reportia-e2e), donde se instala una vez:
//        npm i --prefix ~/.reportia-e2e playwright && npx --prefix ~/.reportia-e2e playwright install chromium
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let pw;
try {
  pw = await import('playwright');
} catch {
  const dir = process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), '.reportia-e2e');
  try {
    pw = await import(pathToFileURL(path.join(dir, 'node_modules', 'playwright', 'index.mjs')).href);
  } catch {
    console.error(`No encuentro Playwright. Instálalo fuera del repositorio (ver e2e/README.md) o pon PLAYWRIGHT_DIR.\nBuscado en: ${dir}`);
    process.exit(2);
  }
}
export const { chromium } = pw.default ?? pw;
