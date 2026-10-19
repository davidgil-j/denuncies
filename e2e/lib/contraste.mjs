// Contraste medido (WCAG) de lo que se ve en la página: cada texto contra el fondo real que tiene detrás (componiendo
// las transparencias), y los bordes de los campos e iconos contra su fondo. Mínimos: 4,5:1 en texto (3:1 si es
// grande), 3:1 en bordes de campos e iconos. Se ejecuta dentro de la página: page.evaluate(audit).
export const audit = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  // El fondo: el de sus contenedores, componiendo transparencias. Si no hay ninguno con color hasta la página (<body>), puede
  // estar encima de otra pieza que no lo contiene (una cabecera colocada sobre la foto del inicio): entonces cuenta lo que
  // hay debajo de verdad en ese punto (si está a la vista)
  const under = (el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
    const stack = [];
    for (const e of document.elementsFromPoint(x, y)) {
      if (e === document.body || e === document.documentElement) break;
      if (e === el || e.contains(el)) continue;
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) { stack.push(c); if (c[3] === 1) break; }
    }
    return stack.length && stack.at(-1)[3] === 1 ? stack : null;
  };
  const bgOf = (el) => {
    const stack = []; // de arriba abajo
    let pageBg = null;
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c[3] === 0) continue;
      if (e === document.body || e === document.documentElement) { pageBg = c; break; }
      stack.push(c);
      if (c[3] === 1) break;
    }
    if (!(stack.length && stack.at(-1)[3] === 1)) {
      const u = under(el);
      if (u) stack.push(...u); else if (pageBg) stack.push(pageBg);
    }
    let out = [255, 255, 255, 1]; for (const c of stack.reverse()) out = over(c, out); return out;
  };
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const hex = (c) => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bad = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; const text = n.textContent.trim();
    if (!text || !el || !vis(el) || el.closest('[data-off], .ds-vh, .v2-vh, [aria-hidden="true"], svg, option')) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.05 || (s.clip === 'rect(0px, 0px, 0px, 0px)')) { hidden = true; break; } }
    if (hidden) continue;
    const cs = getComputedStyle(el);
    const disabled = el.closest(':disabled, [aria-disabled="true"]');
    if (disabled) continue; // los controles apagados quedan fuera de la norma
    const bg = bgOf(el); const fg = over(parse(cs.color), bg);
    const size = parseFloat(cs.fontSize); const big = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5) - 0.01) { const k = `texto ${hex(fg)} sobre ${hex(bg)} · ${r.toFixed(2)}:1 · ${Math.round(size)}px`; if (!bad.has(k)) bad.set(k, text.slice(0, 38)); }
  }
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')) {
    if (!vis(el) || el.disabled || el.closest('.ds-vh')) continue;
    const cs = getComputedStyle(el); const inner = over(parse(cs.backgroundColor), bgOf(el.parentElement)); const outer = bgOf(el.parentElement);
    const border = parseFloat(cs.borderTopWidth) > 0 ? over(parse(cs.borderTopColor), outer) : null;
    const edge = Math.max(border ? ratio(border, outer) : 0, ratio(inner, outer));
    if (edge < 3 - 0.01) { const k = `campo: borde ${border ? hex(border) : 'sin borde'} y fondo ${hex(inner)} sobre ${hex(outer)} · ${edge.toFixed(2)}:1`; if (!bad.has(k)) bad.set(k, el.getAttribute('aria-label') || el.id || el.placeholder || el.tagName); }
  }
  for (const svg of document.querySelectorAll('button svg, a svg, .ds-chip svg')) {
    if (!vis(svg) || svg.closest(':disabled, [aria-disabled="true"], .ds-vh')) continue;
    const cs = getComputedStyle(svg); const bg = bgOf(svg.parentElement); const fg = over(parse(cs.stroke !== 'none' && cs.stroke ? cs.stroke : cs.color), bg);
    const r = ratio(fg, bg);
    if (r < 3 - 0.01) { const k = `icono ${hex(fg)} sobre ${hex(bg)} · ${r.toFixed(2)}:1`; if (!bad.has(k)) bad.set(k, (svg.closest('button, a')?.getAttribute('aria-label') || svg.closest('button, a, .ds-chip')?.innerText || '').trim().slice(0, 30)); }
  }
  return [...bad].map(([k, v]) => `${k} — «${v}»`);
};
