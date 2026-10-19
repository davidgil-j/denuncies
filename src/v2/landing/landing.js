// Lo único que hace JavaScript en la portada (todo lo demás funciona sin él):
//  · en el móvil, el póster vertical del vídeo (el del ordenador es el que va en el HTML);
//  · el vídeo que está a la vista se reproduce solo, sin sonido y en bucle; al salir de la vista o al cambiar de
//    pestaña, se para. Si la persona ha pedido menos movimiento, no se reproduce nada solo (tiene sus controles);
//  · el menú del móvil se cierra al elegir una opción.
(function () {
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-video]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('input[name="lp-video"]'));
  var visible = false;
  if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
    videos.forEach(function (v) { var light = v.getAttribute('data-poster-light'); if (light) v.poster = light; });
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
})();
