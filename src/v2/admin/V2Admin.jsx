import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Inbox, Users, ShieldCheck, ArrowUpRight, LogOut, Menu, X, CircleCheck, CircleAlert, UserRoundX } from 'lucide-react';
import { translations } from '../../translations.js';
import {
  getAdminSession, getProfile, getManagerPermissions, getMyOrganization, signOutAdmin, IS_DEMO,
} from '../../lib/supabase.js';
import { EuSymbol, EuFlag, ICON, LANGS, detectLang, initials } from '../V2Layout.jsx';
import '../v2.css';
import './admin.css';

const LANG_KEY = 'reportia-panel-lang';
function initialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* sense emmagatzematge */ }
  return detectLang();
}

/**
 * Ruta pare del panell v2 (/v2/panel): guarda de sessió, perfil i permisos, i el marc
 * (barra lateral a escriptori, barra superior amb menú al mòbil). Les pàgines filles reben
 * idioma, perfil i permisos per <Outlet context>. La lògica de permisos replica can() d'AdminAuth.
 */
export default function V2Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lang, setLangState] = useState(initialLang);
  const [phase, setPhase] = useState('loading'); // loading | anon | noprofile | ready
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [org, setOrg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const menuBtn = useRef(null);

  const tr = translations[lang];
  const t = tr.v2admin;

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* res */ }
  };

  useEffect(() => {
    document.body.classList.add('v2-body');
    return () => document.body.classList.remove('v2-body');
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const loadProfile = useCallback(async () => {
    const s = await getAdminSession().catch(() => null);
    if (!s) { setPhase('anon'); return; }
    setSession(s);
    const { profile: p } = await getProfile(s.user.id);
    if (!p) { setPhase('noprofile'); return; }
    let perms = [];
    if (p.role === 'manager') ({ permissions: perms } = await getManagerPermissions(s.user.id));
    const { organization } = await getMyOrganization();
    setProfile(p);
    setPermissions(perms ?? []);
    setOrg(organization ?? null);
    setPhase('ready');
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // El menú del mòbil es tanca en canviar de pàgina i amb Esc; bloqueja el desplaçament del fons
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); menuBtn.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('v2-lock');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('v2-lock'); };
  }, [menuOpen]);

  const notify = useCallback((text, tone = 'ok') => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function logout() {
    setLeaving(true);
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const isSuperadmin = profile?.role === 'superadmin';
  const allowedCategories = useMemo(
    () => (isSuperadmin ? null : permissions.filter(p => p.can_view).map(p => p.category)),
    [isSuperadmin, permissions],
  );
  const can = useCallback((action, category) => {
    if (isSuperadmin) return true;
    const perm = permissions.find(p => p.category === category);
    return perm ? perm[`can_${action}`] === true : false;
  }, [isSuperadmin, permissions]);

  const channelPath = `/canal/${org?.slug ?? 'demo'}`;
  const ctx = {
    lang, t, tr, profile, email: session?.user?.email ?? '', permissions, isSuperadmin, can,
    allowedCategories, org, notify, channelPath, refreshProfile: loadProfile,
  };

  if (phase === 'anon') return <Navigate to="/admin/login" replace />;

  if (phase === 'loading') {
    return (
      <div className="v2 v2-admin is-loading">
        <div className="v2-center" role="status" aria-live="polite">
          <div className="v2-spinner" />
          <span className="v2-vh">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (phase === 'noprofile') {
    return (
      <div className="v2 v2-admin is-loading">
        <div className="v2-center">
          <div>
            <UserRoundX className="v2-center-icon" {...ICON} />
            <h1 className="v2-sec-title">{t.noProfileTitle}</h1>
            <p>{t.noProfileText}</p>
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={logout} aria-busy={leaving}>
              <LogOut {...ICON} />{t.logout}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const path = location.pathname.replace(/\/+$/, '');
  const nav = [
    { to: '/admin', label: t.navComplaints, icon: Inbox, active: path === '/admin' || path.startsWith('/admin/complaints') },
    ...(isSuperadmin ? [{ to: '/admin/users', label: t.navUsers, icon: Users, active: path.startsWith('/admin/users') }] : []),
    { to: '/admin/mfa', label: t.navSecurity, icon: ShieldCheck, active: path.startsWith('/admin/mfa') },
  ];
  const orgName = org?.name ?? '';
  const name = profile.full_name || ctx.email;

  return (
    <div className="v2 v2-admin">
      <EuSymbol />
      <a className="v2-skip" href="#v2-main">{t.skip}</a>

      {/* Barra superior (mòbil i tauleta) */}
      <header className="v2-topbar">
        <Link className="v2-top-brand" to="/admin">
          <span className="v2-side-mark" aria-hidden="true">{initials(orgName)}</span>
          <span className="v2-top-name">{orgName}</span>
        </Link>
        <button
          ref={menuBtn}
          type="button"
          className="v2-top-menu"
          aria-expanded={menuOpen}
          aria-controls="v2-side"
          aria-label={menuOpen ? t.menuClose : t.menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? <X {...ICON} /> : <Menu {...ICON} />}
        </button>
      </header>

      <aside className="v2-side" id="v2-side" data-open={menuOpen}>
        <div className="v2-side-brand">
          <span className="v2-side-mark" aria-hidden="true">{initials(orgName)}</span>
          <span className="v2-side-brand-txt">
            <span className="v2-side-org">{orgName}</span>
            <span className="v2-side-sub">{t.panelName}</span>
          </span>
        </div>
        {IS_DEMO && <span className="v2-side-demo">{t.demoTag}</span>}

        <nav className="v2-side-nav" aria-label={t.navLabel}>
          <ul>
            {nav.map(({ to, label, icon: Icon, active }) => (
              <li key={to}>
                <Link className="v2-nav-item" to={to} aria-current={active ? 'page' : undefined}>
                  <Icon {...ICON} />{label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="v2-side-foot">
          <a className="v2-nav-item is-quiet" href={channelPath} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight {...ICON} />{t.viewChannel}
          </a>

          <div className="v2-side-lang" role="group" aria-label={t.language}>
            {LANGS.map(l => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} aria-label={translations[l].langName} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="v2-me">
            <span className="v2-me-avatar" aria-hidden="true">{initials(name)}</span>
            <span className="v2-me-txt">
              <span className="v2-me-name">{name}</span>
              <span className="v2-me-role">{isSuperadmin ? t.roleSuperadmin : t.roleManager}</span>
            </span>
          </div>
          <button type="button" className="v2-nav-item is-quiet" onClick={logout} disabled={leaving}>
            <LogOut {...ICON} />{leaving ? t.loggingOut : t.logout}
          </button>

          <p className="v2-side-legal">
            <EuFlag className="v2-side-flag" width={21} height={14} label={t.euFlag} />
            <span>{t.legalFoot}</span>
          </p>
        </div>
      </aside>
      <div className="v2-scrim" data-open={menuOpen} onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <main id="v2-main" className="v2-amain" tabIndex={-1}>
        <Outlet context={ctx} />
      </main>

      <div className="v2-toast-zone" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`v2-toast is-${toast.tone}`}>
            {toast.tone === 'ok' ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
