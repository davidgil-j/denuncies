// El canal se puede poner dentro de la web de una empresa (un iframe: fase 4 de docs/PLAN_FASES.md); el panel y la web
// de Reportia, nunca. vercel.json solo deja incrustar /canal/*; esto cubre lo que pasa ya dentro del recuadro.

/** true si la página está dentro de un recuadro (iframe) de otra web */
export function inFrame() {
  try { return window.self !== window.top; } catch { return true; }
}

/**
 * Lleva toda la ventana a otra dirección, no solo el recuadro: «Salir rápido» dentro de la web de una empresa tiene que
 * salir de esa web también. Solo funciona tras un clic de la persona (el navegador lo exige); si la web no lo permite,
 * se cambia al menos el recuadro.
 */
export function replaceTop(url) {
  if (inFrame()) {
    try { window.top.location.replace(url); return; } catch { /* la web de fuera no deja: se cambia el recuadro */ }
  }
  window.location.replace(url);
}
