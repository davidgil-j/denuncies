import { chromium } from './lib/playwright.mjs';
const browser = await chromium.launch();
const problems = [];
const ROUTES = [['/admin', '.pn-steps'], ['/admin/report', '.rp-figs dd'], ['/admin/integration', '.sh-list'], ['/admin/ajustes', '.tm-list li'], ['/admin/mfa', '.sg-state'], ['/canal/demo?lang=es', '.entry-main']];
for (const [w, h, touch] of [[320, 640, true], [375, 812, true], [414, 896, true], [768, 1024, true], [1024, 768, false], [1280, 800, false], [1366, 768, false], [1440, 900, false], [1920, 1080, false]]) {
  for (const lang of ['es', 'ca', 'en']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700 });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push(`${w} ${lang}: ${e.message.slice(0, 160)}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`${w} ${lang} consola: ${m.text().slice(0, 160)}`); });
    await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
    await page.addInitScript((l) => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); localStorage.setItem('reportia-panel-lang', l); }, lang);
    for (const [path, sel] of ROUTES) {
      await page.goto(`http://localhost:3111${path.replace('lang=es', `lang=${lang}`)}`, { waitUntil: 'networkidle' });
      await page.waitForSelector(sel, { timeout: 15000 });
      await page.waitForTimeout(200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) problems.push(`${w}px ${lang} ${path}: desborda ${over}px`);
      // Texto que se sale de su caja (recortado sin puntos suspensivos)
      const clipped = await page.evaluate(() => [...document.querySelectorAll('.ds-btn, .ds-seg-item, .ds-nav-item, .st-tile b, .rp-fig dd, .pn-steps-txt')].filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis'; }).map(el => (el.innerText || '').trim().slice(0, 30)));
      if (clipped.length) problems.push(`${w}px ${lang} ${path}: texto que no cabe: ${[...new Set(clipped)].join(' · ')}`);
      if (lang === 'es' && [1440, 375].includes(w) && path.startsWith('/admin')) {
        const r = await page.evaluate(() => {
          const visible = el => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
          const name = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').trim();
          const unnamed = [...document.querySelectorAll('button, a, input:not([type=hidden]), textarea, select')].filter(visible).filter(el => {
            if (el.matches('input, textarea, select')) return !(el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label'));
            return !name(el);
          }).map(el => el.outerHTML.slice(0, 90));
          const small = [...document.querySelectorAll('button, a.ds-btn, .ds-nav-item, .ds-seg-item, .ds-menu-item, .st-link, .st-ext, summary')].filter(visible).map(el => [el, el.getBoundingClientRect()]).filter(([el, b]) => b.height < (el.matches('.pn-link, .pn-back, summary') ? 24 : 40)).map(([el, b]) => `${name(el).slice(0, 28)} (${Math.round(b.height)}px)`);
          const noAlt = [...document.querySelectorAll('img')].filter(visible).filter(i => !i.hasAttribute('alt')).length;
          const headings = [...document.querySelectorAll('h1, h2, h3')].filter(visible).map(x => Number(x.tagName[1]));
          const skips = headings.some((lv, i) => i > 0 && lv - headings[i - 1] > 1);
          return { unnamed, small, noAlt, skips, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('[role=main], main').length };
        });
        const bad = [];
        if (r.unnamed.length) bad.push(`sin nombre accesible: ${r.unnamed.join(' · ')}`);
        if (r.small.length) bad.push(`zona táctil pequeña: ${[...new Set(r.small)].join(' · ')}`);
        if (r.noAlt) bad.push(`${r.noAlt} imágenes sin texto alternativo`);
        if (r.skips) bad.push('salto de nivel en los títulos');
        if (r.h1 !== 1) bad.push(`${r.h1} títulos principales`);
        if (r.main !== 1) bad.push(`${r.main} zonas principales`);
        if (bad.length) problems.push(`${w}px ${path}\n   - ${bad.join('\n   - ')}`);
      }
    }
    await ctx.close();
  }
}
console.log(problems.length ? `PROBLEMAS:\n- ${problems.join('\n- ')}` : 'Sin desbordes, sin textos cortados y sin problemas de accesibilidad en 9 anchos × 3 idiomas');
await browser.close();
