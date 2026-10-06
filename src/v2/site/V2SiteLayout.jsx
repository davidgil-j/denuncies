import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, Menu, X, ArrowRight } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS, BOE_URL, ICON, detectLang, Stable, useLangAnchor } from '../V2Layout.jsx';
import { CONTACT_EMAIL } from './plans.js';
import './site.css';

// Bandera de la UE. Còpia del símbol del canal amb un id propi perquè el web no depengui del canal.
const EU_STARS = 'M15.000 2.222L15.249 2.990L16.057 2.990L15.404 3.464L15.653 4.232L15.000 3.758L14.347 4.232L14.596 3.464L13.943 2.990L14.751 2.990ZM18.333 3.115L18.583 3.883L19.390 3.883L18.737 4.358L18.986 5.125L18.333 4.651L17.680 5.125L17.930 4.358L17.277 3.883L18.084 3.883ZM20.774 5.556L21.023 6.323L21.830 6.323L21.177 6.798L21.427 7.566L20.774 7.091L20.120 7.566L20.370 6.798L19.717 6.323L20.524 6.323ZM21.667 8.889L21.916 9.657L22.723 9.657L22.070 10.131L22.320 10.899L21.667 10.424L21.014 10.899L21.263 10.131L20.610 9.657L21.417 9.657ZM20.774 12.222L21.023 12.990L21.830 12.990L21.177 13.464L21.427 14.232L20.774 13.758L20.120 14.232L20.370 13.464L19.717 12.990L20.524 12.990ZM18.333 14.662L18.583 15.430L19.390 15.430L18.737 15.905L18.986 16.672L18.333 16.198L17.680 16.672L17.930 15.905L17.277 15.430L18.084 15.430ZM15.000 15.556L15.249 16.323L16.057 16.323L15.404 16.798L15.653 17.566L15.000 17.091L14.347 17.566L14.596 16.798L13.943 16.323L14.751 16.323ZM11.667 14.662L11.916 15.430L12.723 15.430L12.070 15.905L12.320 16.672L11.667 16.198L11.014 16.672L11.263 15.905L10.610 15.430L11.417 15.430ZM9.226 12.222L9.476 12.990L10.283 12.990L9.630 13.464L9.880 14.232L9.226 13.758L8.573 14.232L8.823 13.464L8.170 12.990L8.977 12.990ZM8.333 8.889L8.583 9.657L9.390 9.657L8.737 10.131L8.986 10.899L8.333 10.424L7.680 10.899L7.930 10.131L7.277 9.657L8.084 9.657ZM9.226 5.556L9.476 6.323L10.283 6.323L9.630 6.798L9.880 7.566L9.226 7.091L8.573 7.566L8.823 6.798L8.170 6.323L8.977 6.323ZM11.667 3.115L11.916 3.883L12.723 3.883L12.070 4.358L12.320 5.125L11.667 4.651L11.014 5.125L11.263 4.358L10.610 3.883L11.417 3.883Z';

function SiteEuFlag({ label }) {
  return (
    <svg className="v2-flag" width={24} height={16} viewBox="0 0 30 20" role="img" aria-label={label}>
      <rect width="30" height="20" fill="#0B3D91" />
      <path fill="#FFD23F" d={EU_STARS} />
    </svg>
  );
}

const DEMO_PATH = '/canal/demo';
// L'idioma triat a la web es recorda i el panell el fa servir (mateixa clau)
const LANG_KEY = 'reportia-panel-lang';
// Per sota d'aquesta amplada la navegació va al menú (a sobre cap en una línia, amb seccions i botó)
const DESKTOP = 1160;
// Seccions de la portada accessibles des de la navegació
const SECTIONS = [['funciona', 'navHow'], ['ley', 'navLaw'], ['precios', 'navPricing'], ['preguntas', 'navFaq']];

/**
 * Marc comú del web públic de Reportia (/v2): franja legal, capçalera amb navegació, peu.
 * L'idioma viu aquí i es passa a les pàgines amb <Outlet context>. Respecta ?lang= (ca|es|en).
 */
export default function V2SiteLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryLang = searchParams.get('lang');
  // Idioma: el de l'adreça, si no el que es va triar (es recorda també per al panell), si no el del navegador
  const [lang, setLangState] = useState(() => {
    if (LANGS.includes(queryLang)) return queryLang;
    try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) return saved; } catch { /* res */ }
    return detectLang();
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const menuBtnRef = useRef(null);
  const { pathname, hash } = useLocation();
  const t = translations[lang].v2site;
  const tv = translations[lang].v2;

  // Si l'URL porta ?lang=, mana
  useEffect(() => {
    if (LANGS.includes(queryLang)) setLangState(queryLang);
  }, [queryLang]);

  const holdScroll = useLangAnchor(lang);
  function setLang(l) {
    holdScroll();
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* sense emmagatzematge */ }
    // Si la pàgina es va obrir amb ?lang=, el mantenim al dia perquè recarregar no canviï l'idioma
    if (searchParams.has('lang')) setSearchParams({ lang: l }, { replace: true });
  }

  useEffect(() => {
    document.body.classList.add('v2-body');
    return () => document.body.classList.remove('v2-body');
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Cada pàgina comença a dalt (excepte si l'enllaç apunta a una secció)
  useEffect(() => {
    setMenuOpen(false);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menú mòbil: es tanca amb Escape, en tocar fora o en passar a escriptori
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

  // Enllaços a una secció (/#precios): s'hi desplaça quan la pàgina ja és a lloc
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
  // Tornar a prémer la secció on ja s'és (l'adreça no canvia) també hi baixa
  const sectionClick = (id) => () => {
    setMenuOpen(false);
    if (pathname === '/' && hash === `#${id}`) scrollToHash(`#${id}`);
  };

  // En canviar de pàgina, el focus va al contingut (els lectors de pantalla ho anuncien)
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    if (!hash) document.getElementById('v2-main')?.focus({ preventScroll: true });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const isHome = pathname === '/';
  // Etiquetes de la capçalera amb l'amplada de l'idioma més llarg: el menú no es desplaça
  const st = (key) => <Stable lang={lang} pick={T => T.v2site[key]} />;
  const navClass = ({ isActive }) => `v2-site-navlink${isActive ? ' is-current' : ''}`;

  return (
    <div className="v2 v2-site">
      <a className="v2-skip" href="#v2-main">{tv.skip}</a>
      <aside className="v2-strip v2-site-strip" aria-label={t.stripLabel}>
        <div className="v2-wrap">
          <SiteEuFlag label={tv.euFlag} />
          <span className="v2-strip-text">
            <span className="v2-only-wide"><b>{t.stripLead}</b> {t.stripConform} </span>
            <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{tv.lawShort}</a>
          </span>
        </div>
      </aside>

      <header
        className="v2-site-header" ref={headerRef}
        onBlur={e => { if (menuOpen && !headerRef.current?.contains(e.relatedTarget)) setMenuOpen(false); }}
      >
        <div className="v2-wrap">
          <Link className="v2-site-brand" to="/" aria-label={t.homeLabel}>Reportia</Link>

          <nav className="v2-site-nav" aria-label={t.navLabel}>
            {SECTIONS.map(([id, key]) => (
              <Link className="v2-site-navlink is-section" key={id} to={{ pathname: '/', hash: `#${id}` }} onClick={sectionClick(id)}>{st(key)}</Link>
            ))}
            <NavLink className={navClass} to={`${DEMO_PATH}?lang=${lang}`}>{st('navDemoShort')}</NavLink>
            <NavLink className={navClass} to="/admin/login" end>{st('navLogin')}</NavLink>
            {/* A la portada el botó ja és al titular: aquí no es repeteix */}
            {!isHome && <Link className="v2-btn v2-btn-primary v2-site-cta" to="/crear-compte">{st('navSignup')}</Link>}
          </nav>

          <div className="v2-lang" role="group" aria-label={tv.langGroup}>
            {LANGS.map(l => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                aria-label={translations[l].langName}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

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
          <nav aria-label={t.navLabel}>
            {SECTIONS.map(([id, key]) => (
              <Link className="v2-site-menu-row" key={id} to={{ pathname: '/', hash: `#${id}` }} onClick={sectionClick(id)}>{t[key]}<ArrowRight {...ICON} /></Link>
            ))}
            <Link className="v2-site-menu-row" to={`${DEMO_PATH}?lang=${lang}`}>{t.navDemo}<ArrowRight {...ICON} /></Link>
            <Link className="v2-site-menu-row" to="/admin/login">{t.navLogin}<ArrowRight {...ICON} /></Link>
            <Link className="v2-btn v2-btn-primary" to="/crear-compte">{t.navSignup}</Link>
          </nav>
        </div>
      </header>

      <main id="v2-main" tabIndex={-1}>
        <Outlet context={{ lang, setLang }} />
      </main>

      <footer className="v2-footer">
        <div className="v2-wrap">
          <span className="grow">{t.footerName}</span>
          <span className="secure"><Lock {...ICON} />{tv.footerSecure}</span>
          <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{tv.footerLaw}</a>
          <Link to="/privacitat">{tv.privacy}</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{t.footerContact}</a>
        </div>
      </footer>
    </div>
  );
}
