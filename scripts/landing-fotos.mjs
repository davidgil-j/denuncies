// Fotos del inicio de la portada (public/landing/inicio-*.webp). Son de Unsplash (licencia libre, sin
// atribución obligatoria), servidas por picsum.photos, y se pasan a un solo tono azul marino para que
// casen con la paleta. Ninguna enseña una cara: son siluetas o arquitectura.
//   1 · Charles Forerunner · unsplash.com/photos/3fPXt37X6UQ   (tres personas junto a un ventanal)
//   2 · Padurariu Alexandru · unsplash.com/photos/ZKBQmgMyf8s  (torres de oficinas)
//   3 · Thong Vo · unsplash.com/photos/g28MgVK85bQ             (una persona ante un ventanal)
// Uso: PLAYWRIGHT=/ruta/a/playwright/index.mjs node scripts/landing-fotos.mjs   (necesita cwebp)
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const OUT = new URL('../public/landing/', import.meta.url).pathname;
const FOTOS = [[1, 378], [2, 983], [3, 331]];
const SIZES = [['', 2400, 1500], ['-m', 1100, 1500]]; // apaisada para ordenador y vertical para móvil

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://picsum.photos/', { waitUntil: 'domcontentloaded' });
for (const [n, id] of FOTOS) {
  for (const [suffix, w, h] of SIZES) {
    const data = await page.evaluate(async ([src, W, H, focus]) => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
      await img.decode();
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      // recorte que llena el lienzo, con el punto de interés donde toca
      const s = Math.max(W / img.width, H / img.height); const dw = img.width * s, dh = img.height * s;
      x.filter = 'grayscale(1) contrast(1.08) brightness(.92)';
      x.drawImage(img, (W - dw) * focus, (H - dh) / 2, dw, dh);
      x.filter = 'none';
      // un solo tono: el azul marino de la web tiñe la foto y las sombras bajan hacia él
      x.globalCompositeOperation = 'color'; x.fillStyle = '#16305C'; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'multiply'; x.fillStyle = '#C9D4E8'; x.fillRect(0, 0, W, H);
      return c.toDataURL('image/png').split(',')[1];
    }, [`https://picsum.photos/id/${id}/${suffix ? 2200 : 2400}/${suffix ? 1467 : 1500}`, w, h, suffix ? (n === 2 ? 0.7 : n === 1 ? 0.82 : 0.44) : 0.5]);
    const png = `${OUT}inicio-${n}${suffix}.png`;
    writeFileSync(png, Buffer.from(data, 'base64'));
    execFileSync('cwebp', ['-quiet', '-q', '74', png, '-o', png.replace(/\.png$/, '.webp')]);
    rmSync(png);
    console.log(`inicio-${n}${suffix}.webp`);
  }
}
await browser.close();
