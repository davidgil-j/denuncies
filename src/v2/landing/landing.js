// Lo único que hace JavaScript en la portada (todo lo demás funciona sin él):
//  · el póster de cada vídeo, al acercarse a ellos (el vertical en el móvil): al cargar la página no se pide ninguno y no
//    compiten con la foto del inicio;
//  · el vídeo que está a la vista se reproduce solo, sin sonido y en bucle; al salir de la vista o al cambiar de
//    pestaña, se para. Si la persona ha pedido menos movimiento, no se reproduce nada solo (tiene sus controles);
//  · el menú del móvil se cierra al elegir una opción;
//  · al bajar, cada apartado entra con un fundido suave (salvo con menos movimiento).
(function () {
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-video]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('input[name="lp-video"]'));
  var visible = false;
  // El vertical hasta 760 px: el mismo corte que la versión del móvil en el HTML
  var small = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  function posters() {
    videos.forEach(function (v) { var src = v.getAttribute(small ? 'data-poster-light' : 'data-poster'); if (src) v.poster = src; });
  }
  // Se ponen cuando faltan menos de una pantalla para llegar a los vídeos (ya están al verlos), y nunca antes de que la
  // página termine de cargar: los vídeos quedan justo debajo del inicio y, si no, se pedirían a la vez que su foto
  function watchPosters() {
    if (!('IntersectionObserver' in window)) { posters(); return; }
    var near = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { posters(); near.disconnect(); }
    }, { rootMargin: '100% 0px' });
    near.observe(document.querySelector('.lp-video-stage'));
  }
  if (videos.length) {
    if (document.readyState === 'complete') watchPosters();
    else window.addEventListener('load', watchPosters);
  }

  function current() {
    var on = tabs.filter(function (t) { return t.checked; })[0];
    var id = on ? on.id.replace('lp-v-', '') : 'report';
    return videos.filter(function (v) { return v.getAttribute('data-video') === id; })[0];
  }
  function update() {
    var playing = !calm && visible ? current() : null;
    videos.forEach(function (v) {
      if (v === playing) {
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* el navegador no deja: se queda con sus controles */ });
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  if (videos.length && 'IntersectionObserver' in window) {
    var stage = document.querySelector('.lp-video-stage');
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.4 }).observe(stage);
  }
  tabs.forEach(function (t) { t.addEventListener('change', update); });

  var menu = document.querySelector('.lp-menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) menu.removeAttribute('open');
    });
  }

  // La entrada al bajar: títulos, textos, tarjetas y pasos aparecen con un fundido y una subida corta (landing.css, .lp-rv),
  // escalonados dentro de cada apartado y solo la primera vez. El inicio no se toca (es lo primero que se pinta). Lo que ya
  // está a la vista al llegar aquí se queda como está: nada desaparece para volver a aparecer
  if (calm || !('IntersectionObserver' in window)) return;
  var REVEAL = [
    '.lp-sec .lp-head > *', '.lp-videos', '.lp-steps > li', '.lp-cats > li', '.lp-more', '.lp-law-text > *', '.lp-facts > div',
    '.lp-reqs-wrap .lp-h3', '.lp-reqs > details', '.lp-own', '.lp-secu > li', '.lp-plans > li', '.lp-price-more > div',
    '.lp-price-cta', '.lp-end-in > *',
  ].join(', ');
  var STEP = 80;
  var MAX_STEPS = 5;
  // El primer aviso del observador dice dónde está cada pieza sin obligar al navegador a medir la página mientras carga:
  // lo que ya se ve (o queda por encima) se deja como está; lo de más abajo se esconde hasta que llegue
  var io = new IntersectionObserver(function (entries) {
    var count = {};
    var vh = window.innerHeight;
    entries.forEach(function (e) {
      var el = e.target;
      if (!el.classList.contains('lp-rv')) {
        if (e.boundingClientRect.top < vh) io.unobserve(el);
        else el.classList.add('lp-rv');
        return;
      }
      if (!e.isIntersecting) return;
      var sec = el.closest('section');
      var key = sec ? sec.id : '';
      var n = count[key] = (count[key] || 0) + 1;
      el.style.setProperty('--lp-d', Math.min(n - 1, MAX_STEPS) * STEP + 'ms');
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  Array.prototype.forEach.call(document.querySelectorAll(REVEAL), function (el) { io.observe(el); });
})();
