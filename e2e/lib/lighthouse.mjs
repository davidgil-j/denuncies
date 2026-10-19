// Lighthouse vive FUERA del repositorio, como Playwright (no es una dependencia del proyecto). Se busca así:
//   1. si está instalado donde Node lo encuentre;
//   2. si no, en la carpeta de PLAYWRIGHT_DIR (por defecto ~/.reportia-e2e), donde se instala una vez:
//        npm i --prefix ~/.reportia-e2e lighthouse@12
// Si no está, devuelve null y la prueba que lo usa lo dice (no falla por eso).
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadLighthouse() {
  const dir = process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), '.reportia-e2e');
  const from = (pkg, file) => import(pathToFileURL(path.join(dir, 'node_modules', pkg, file)).href);
  try {
    return { lighthouse: (await import('lighthouse')).default, launcher: await import('chrome-launcher') };
  } catch {
    try {
      return { lighthouse: (await from('lighthouse', 'core/index.js')).default, launcher: await from('chrome-launcher', 'dist/index.js') };
    } catch {
      return null;
    }
  }
}
