/*
 * Botón del canal de denuncias para la web de una empresa (fase 4 de docs/PLAN_FASES.md). Se pega donde tiene que
 * salir el botón; lo genera «Compartir el canal» en el panel:
 *
 *   <script src="https://…/boton-canal.js" data-canal="acme" data-idioma="es" data-color="#0F5E6B" async></script>
 *
 *   data-canal   la dirección del canal de la empresa (obligatorio)
 *   data-idioma  ca, es o en (por defecto, es)
 *   data-color   el color del botón, #RRGGBB (el de «Tu marca»; por defecto, el azul)
 *   data-estilo  «flotante»: fijo en la esquina de abajo de todas las páginas, en vez de donde está el script
 *
 * No carga nada más, no guarda nada en el navegador y no envía a nadie la página desde la que se pulsa
 * (rel="noreferrer"). El canal se abre en una pestaña aparte.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var slug = (script.getAttribute('data-canal') || '').replace(/[^a-z0-9-]/gi, '');
  if (!slug) return;
  var lang = script.getAttribute('data-idioma');
  if (lang !== 'ca' && lang !== 'en') lang = 'es';
  var color = script.getAttribute('data-color') || '';
  if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#2F54EB';
  var floating = script.getAttribute('data-estilo') === 'flotante';
  var origin = new URL(script.src, window.location.href).origin;

  var a = document.createElement('a');
  a.href = origin + '/canal/' + slug + '?lang=' + lang;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.lang = lang;
  // Las letras con acento, en código: así se leen bien aunque la web donde se pega no diga en qué codificación está
  a.textContent = { ca: 'Canal \u00e8tic', es: 'Canal \u00e9tico', en: 'Ethics channel' }[lang];
  // Estilos en el propio elemento: no dependen de las hojas de estilo de la web donde se pega
  var s = a.style;
  s.display = 'inline-flex';
  s.alignItems = 'center';
  s.padding = '12px 18px';
  s.borderRadius = '10px';
  s.background = color;
  s.color = '#ffffff';
  s.font = "600 15px/1.2 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  s.textDecoration = 'none';
  if (floating) {
    s.position = 'fixed';
    s.right = '20px';
    s.bottom = '20px';
    s.zIndex = '2147483000';
    s.boxShadow = '0 6px 18px rgba(13, 21, 48, .25)';
    (document.body || document.documentElement).appendChild(a);
  } else {
    script.parentNode.insertBefore(a, script);
  }
})();
