import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, Menu, X, ArrowRight } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS, BOE_URL, ICON, detectLang, Stable, useLangAnchor } from '../V2Layout.jsx';
import { CONTACT_EMAIL } from './plans.js';
import './site.css';

const DEMO_PATH = '/canal/demo';
// El idioma elegido en la web se recuerda y el panel lo usa (la misma clave)
const LANG_KEY = 'reportia-panel-lang';
// Por debajo de este ancho la navegación va al menú (por encima cabe en una línea, con secciones y botón)
const DESKTOP = 1200;
// Secciones de la portada accesibles desde la navegación
const SECTIONS = [['funciona', 'navHow'], ['ley', 'navLaw'], ['precios', 'navPricing'], ['preguntas', 'navFaq']];

/**
 * Marco común de la web pública de Reportia: cabecera fina con navegación y pie. En la portada, mientras
 * se ve la foto del inicio, la cabecera es transparente y va encima de la foto.
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
  // En la portada la cabecera va encima de la foto del inicio hasta que la foto queda atrás
  const isHome = pathname === '/';
  const [over, setOver] = useState(isHome);
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

  useEffect(() => {
    if (!isHome) { setOver(false); return undefined; }
    const check = () => {
      const hero = document.querySelector('.v2-lp-hero');
      const h = headerRef.current?.offsetHeight ?? 64;
      setOver(hero ? hero.getBoundingClientRect().bottom > h : window.scrollY < 8);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [isHome]);

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

  // Enlaces a una sección (/#precios): se desplaza hasta ella cuando la página ya está en su sitio
  const scrollToHash = (h) => {
    const el = document.getElementById(decodeURIComponent(h.slice(1)));
    if (!el) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  };
  useEffect(() => {
    if (!hash) return undefined;
    const id = requestAnimationFrame(() => scrollToHash(hash));
    return () => cancelAnimationFrame(id);
  }, [pathname, hash]);
  // Volver a pulsar la sección en la que ya se está (la dirección no cambia) también baja hasta ella
  const sectionClick = (id) => () => {
    setMenuOpen(false);
    if (pathname === '/' && hash === `#${id}`) scrollToHash(`#${id}`);
  };

  // Al cambiar de página, el foco va al contenido (los lectores de pantalla lo anuncian)
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    if (!hash) document.getElementById('v2-main')?.focus({ preventScroll: true });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Etiquetas de la cabecera con el ancho del idioma más largo: el menú no se desplaza
  const st = (key) => <Stable lang={lang} pick={T => T.v2site[key]} />;
  const navClass = ({ isActive }) => `v2-site-navlink${isActive ? ' is-current' : ''}`;
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
        className={`v2-site-header${over && !menuOpen ? ' is-over' : ''}`} ref={headerRef}
        onBlur={e => { if (menuOpen && !headerRef.current?.contains(e.relatedTarget)) setMenuOpen(false); }}
      >
        <div className="v2-wrap">
          <Link className="v2-site-brand" to="/" aria-label={t.homeLabel}>Reportia</Link>

          <nav className="v2-site-nav" aria-label={t.navLabel}>
            {SECTIONS.map(([id, key]) => (
              <Link className="v2-site-navlink is-section" key={id} to={{ pathname: '/', hash: `#${id}` }} onClick={sectionClick(id)}>{st(key)}</Link>
            ))}
            <NavLink className={navClass} to={`${DEMO_PATH}?lang=${lang}`}>{st('navDemoShort')}</NavLink>
            {/* En el alta, «Acceder» ya es el botón principal */}
            {pathname !== '/crear-compte' && <><span className="v2-site-sep" aria-hidden="true" />
            <NavLink className={navClass} to="/admin/login" end>{st('navLogin')}</NavLink></>}
          </nav>

          {/* La acción principal está siempre en la cabecera, también en la portada y en el móvil */}
          {/* En el alta, el botón lleva al acceso: «Crear cuenta» llevaría a la misma página (G-4) */}
          {pathname === '/crear-compte'
            ? <Link className="v2-btn v2-btn-primary v2-site-cta" to="/admin/login">{st('navLogin')}</Link>
            : <Link className="v2-btn v2-btn-primary v2-site-cta" to="/crear-compte">{st('navSignup')}</Link>}
          {langGroup('v2-site-lang')}

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
              <Link className="v2-site-menu-row" key={id} to={{ pathname: '/', hash: `#${id}` }} onClick={sectionClick(id)}>{t[key]}<ArrowRight {...ICON} /></Link>
            ))}
            <Link className="v2-site-menu-row" to={`${DEMO_PATH}?lang=${lang}`}>{t.navDemo}<ArrowRight {...ICON} /></Link>
            <Link className="v2-site-menu-row" to="/admin/login">{t.navLogin}<ArrowRight {...ICON} /></Link>
          </nav>
        </div>
      </header>

      <main id="v2-main" tabIndex={-1}>
        <Outlet context={{ lang, setLang }} />
      </main>

      <footer className="v2-site-foot">
        <div className="v2-wrap">
          <Link className="v2-site-foot-brand" to="/" aria-label={t.homeLabel}>Reportia</Link>
          <nav className="v2-site-foot-nav" aria-label={t.footerNav}>
            {SECTIONS.map(([id, key]) => (
              <Link key={id} to={{ pathname: '/', hash: `#${id}` }} onClick={sectionClick(id)}>{st(key)}</Link>
            ))}
            <a href={BOE_URL} target="_blank" rel="noopener noreferrer"><Stable lang={lang} pick={T => T.v2.footerLaw} /></a>
            <Link to="/privacitat"><Stable lang={lang} pick={T => T.v2.privacy} /></Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>{st('footerContact')}</a>
          </nav>
          <p className="v2-site-foot-note">
            <span>{t.footerName}</span>
            <span className="secure"><Lock {...ICON} />{tv.footerSecure}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
