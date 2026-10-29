import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { translations } from '../../translations.js';
import './texts.js'; // los textos de la web (src/translations-site.js)
import { LANGS, ICON, detectLang, Stable, useLangAnchor } from '../V2Layout.jsx';
import { CONTACT_EMAIL } from './plans.js';
import './site.css';
import { EMPRESA, NOMBRE_PRODUCTO } from '../config/producto.js';

const DEMO_PATH = '/canal/demo';
// El idioma elegido en la web se recuerda y el panel lo usa (la misma clave)
const LANG_KEY = 'reportia-panel-lang';
// Por debajo de este ancho la navegación va al menú (por encima cabe en una línea, con secciones y botón)
const DESKTOP = 1080;
// Los apartados de la portada en la navegación, como en la portada (v2site.portada)
const SECTIONS = [['ley', 'navLaw'], ['funciona', 'navHow'], ['precio', 'navPrice']];
// «Reportia Canal»: el logotipo y, al lado, el nombre del producto
const PRODUCTO = NOMBRE_PRODUCTO.startsWith(EMPRESA) ? NOMBRE_PRODUCTO.slice(EMPRESA.length).trim() : NOMBRE_PRODUCTO;

/**
 * Marco común de las páginas de la web de Reportia que son de la aplicación (alta, privacidad y «no encontrada»):
 * la misma cabecera y el mismo pie que la portada (diseño «aviso»). La portada es una página aparte (src/v2/landing):
 * los enlaces a ella y a sus apartados cargan la página entera.
 * El idioma vive aquí y se pasa a las páginas con <Outlet context>. Respeta ?lang= (ca|es|en).
 */
export default function V2SiteLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryLang = searchParams.get('lang');
  // Idioma: el de la dirección; si no, el que se eligió (se recuerda también para el panel); si no, el del navegador
  const [lang, setLangState] = useState(() => {
    if (LANGS.includes(queryLang)) return queryLang;
    try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) return saved; } catch { /* res */ }
    return detectLang();
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const headerRef = useRef(null);
  const menuBtnRef = useRef(null);
  const t = translations[lang].v2site;
  const tv = translations[lang].v2;

  // Si la URL lleva ?lang=, manda
  useEffect(() => {
    if (LANGS.includes(queryLang)) setLangState(queryLang);
  }, [queryLang]);

  const holdScroll = useLangAnchor(lang);
  function setLang(l) {
    holdScroll();
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* sin almacenamiento */ }
    // Si la página se abrió con ?lang=, se mantiene al día para que recargar no cambie el idioma
    if (searchParams.has('lang')) setSearchParams({ lang: l }, { replace: true });
  }

  useEffect(() => {
    document.body.classList.add('v2-body');
    return () => document.body.classList.remove('v2-body');
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Cada página empieza arriba (salvo si el enlace apunta a una sección)
  useEffect(() => {
    setMenuOpen(false);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menú del móvil: se cierra con Escape, al tocar fuera o al pasar a escritorio
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') { setMenuOpen(false); menuBtnRef.current?.focus(); }
    }
    function onPointer(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) setMenuOpen(false);
    }
    const mq = window.matchMedia(`(min-width: ${DESKTOP}px)`);
    function onMq(e) { if (e.matches) setMenuOpen(false); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen]);

  // La portada y sus secciones (/?lang=es#precios): página aparte, con el idioma elegido
  const home = `/?lang=${lang}`;

  // Al cambiar de página, el foco va al contenido (los lectores de pantalla lo anuncian)
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    if (!hash) document.getElementById('v2-main')?.focus({ preventScroll: true });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Etiquetas con el ancho del idioma más largo (el botón y el pie): no se desplazan al cambiar de idioma. Los enlaces de la
  // cabecera van con su ancho, como en la portada
  const st = (key) => <Stable lang={lang} pick={T => T.v2site[key]} />;
  const sp = (key) => <Stable lang={lang} pick={T => T.v2site.portada[key]} />;
  // El selector de idioma sale dos veces: en la cabecera (ordenador) y dentro del menú (móvil)
  const langGroup = (cls) => (
    <div className={`v2-lang ${cls}`} role="group" aria-label={tv.langGroup}>
      {LANGS.map(l => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} aria-label={`${l.toUpperCase()} · ${translations[l].langName}`} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="v2 v2-site">
      <a className="v2-skip" href="#v2-main">{tv.skip}</a>
      <header
        className="v2-site-header" ref={headerRef}
        onBlur={e => { if (menuOpen && !headerRef.current?.contains(e.relatedTarget)) setMenuOpen(false); }}
      >
        <div className="v2-wrap">
          {/* El logotipo de Reportia en verde oscuro y el nombre del producto, como en la portada */}
          <a className="v2-site-brand" href={home} aria-label={t.homeLabel}>
            <img src="/marca/reportia-logo-oscuro.svg" width="116" height="24" alt={EMPRESA} />
            {PRODUCTO && <span>{PRODUCTO}</span>}
          </a>

          {/* A la izquierda, los apartados de la portada; a la derecha, el idioma, «Acceder» y «Crear el canal» */}
          <nav className="v2-site-nav" aria-label={t.navLabel}>
            {SECTIONS.map(([id, key]) => (
              <a className="v2-site-navlink is-section" key={id} href={`${home}#${id}`}>{t.portada[key]}</a>
            ))}
          </nav>
          <div className="v2-site-tools">
            {langGroup('v2-site-lang')}
            {/* En el alta, «Acceder» ya es el botón principal */}
            {pathname !== '/crear-compte' && <NavLink className="v2-btn v2-site-login" to="/admin/login" end>{t.navLogin}</NavLink>}
          </div>

          {/* La acción principal está siempre en la cabecera, también en el móvil */}
          {/* En el alta, el botón lleva al acceso: «Crear el canal» llevaría a la misma página (G-4) */}
          {pathname === '/crear-compte'
            ? <Link className="v2-btn v2-site-cta" to="/admin/login">{st('navLogin')}</Link>
            : <Link className="v2-btn v2-site-cta" to="/crear-compte"><span className="v2-site-cta-long">{sp('navCta')}</span><span className="v2-site-cta-short">{t.portada.navCtaShort}</span></Link>}

          <button
            ref={menuBtnRef}
            type="button"
            className="v2-site-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="v2-site-menu"
            aria-label={menuOpen ? t.menuClose : t.menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X {...ICON} /> : <Menu {...ICON} />}
          </button>
        </div>

        <div className="v2-site-menu" id="v2-site-menu" data-open={menuOpen}>
          {/* En el móvil el idioma se elige aquí dentro, arriba del todo */}
          {langGroup('v2-site-menu-lang')}
          <nav aria-label={t.navLabel}>
            {SECTIONS.map(([id, key]) => (
              <a className="v2-site-menu-row" key={id} href={`${home}#${id}`}>{t.portada[key]}<ArrowRight {...ICON} /></a>
            ))}
            <Link className="v2-site-menu-row" to={`${DEMO_PATH}?lang=${lang}`}>{t.navDemo}<ArrowRight {...ICON} /></Link>
            <Link className="v2-site-menu-row" to="/admin/login">{t.navLogin}<ArrowRight {...ICON} /></Link>
          </nav>
        </div>
      </header>

      <main id="v2-main" tabIndex={-1}>
        <Outlet context={{ lang, setLang }} />
      </main>

      {/* El pie de la portada: la marca, los enlaces y el idioma */}
      <footer className="v2-site-foot">
        <div className="v2-wrap">
          <a className="v2-site-foot-brand" href={home} aria-label={t.homeLabel}><img src="/marca/reportia-icono-64.png" width="24" height="24" alt="" /><span>{t.footerName}</span></a>
          <nav className="v2-site-foot-nav" aria-label={t.footerNav}>
            <Link to="/privacitat"><Stable lang={lang} pick={T => T.v2.privacy} /></Link>
            <Link to={`${DEMO_PATH}?lang=${lang}`}>{st('navDemoShort')}</Link>
            <Link to="/admin/login">{st('navLogin')}</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>{st('footerContact')}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
