import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Share2, SlidersHorizontal, Search, Plus, LogOut, CircleCheck, CircleAlert, ArrowUpRight } from 'lucide-react';
import { translations } from '../../translations.js';
import './texts.js'; // textos del panel (lado Gestionar)
import {
  getAdminSession, getProfile, getManagerPermissions, getMyOrganization, updateMyOrganization, updateProfile, listAssignees, signOutAdmin, getMfaState, listComplaints, IS_DEMO,
} from '../../lib/supabase.js';
import { LANGS, detectLang, fmt } from '../V2Layout.jsx';
import { planInfo } from '../admin/adminKit.jsx';
import { SplitShell, PillNav, Button, IconButton, Chip, Card, Avatar, BrandLogo, ReportiaMark, Skeleton, Segmented, Dialog, Field, Menu, MenuItem, Offline, cx } from '../ui/index.js';
import { useBrandTheme } from '../lib/brand.js';
import { caseTitle } from './kit.jsx';
import './panel.css';

// Minutos sin actividad hasta que se cierra la sesión
const IDLE_MS = 30 * 60 * 1000;

const LANG_KEY = 'reportia-panel-lang';
function initialLang() {
  try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) return saved; } catch { /* sin almacenamiento */ }
  return detectLang();
}
const SETTINGS = ['/admin/ajustes', '/admin/mfa'];

/**
 * El lado «Gestionar» ya dentro: guarda de sesión, perfil y permisos, y el marco del panel: una sola
 * cabecera (empresa, menú en texto, el plan en pequeño, «Ver el canal», buscar, «Registrar caso» y la
 * cuenta) y la pantalla debajo. Las pantallas reciben idioma, perfil y permisos por <Outlet context>.
 */
export default function Panel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lang, setLangState] = useState(initialLang);
  const [phase, setPhase] = useState('loading'); // loading | anon | code | noprofile | ready
  const [mfaSetup, setMfaSetup] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState(null); // cuántas personas tienen acceso (solo lo necesita quien administra)
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searching, setSearching] = useState(false);
  const toastTimer = useRef(null);

  const tr = translations[lang];
  const t = tr.v2admin;
  const p = tr.panel;
  const setLang = (l) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* nada */ } };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  // La paleta de la empresa («Tu marca») y la apariencia que ha elegido esta persona (claro, oscuro o como el sistema)
  useBrandTheme(org?.brand_palette, profile?.appearance ?? 'system');

  const loadProfile = useCallback(async () => {
    const s = await getAdminSession().catch(() => null);
    if (!s) { setPhase('anon'); return; }
    // La verificación en dos pasos es obligatoria: con ella sin pasar, vuelve al acceso; sin tenerla, solo puede configurarla
    const mfa = await getMfaState();
    if (mfa.needsCode) { setPhase('code'); return; }
    setMfaSetup(!!mfa.needsSetup);
    setSession(s);
    const { profile: pr } = await getProfile(s.user.id);
    if (!pr) { setPhase('noprofile'); return; }
    let perms = [];
    if (pr.role === 'manager') ({ permissions: perms } = await getManagerPermissions(s.user.id));
    const { organization } = await getMyOrganization();
    setProfile(pr);
    setPermissions(perms ?? []);
    setOrg(organization ?? null);
    setPhase('ready');
    if (pr.role === 'superadmin') listAssignees().then(({ people, error }) => setMembers(error ? 1 : people.length));
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Guarda datos de la empresa y deja el panel al día sin recargarlo entero
  const saveOrg = useCallback(async (changes) => {
    if (!org) return { error: new Error('no-org') };
    const { organization, error } = await updateMyOrganization(org.id, changes);
    if (!error && organization) setOrg(organization);
    return { error };
  }, [org]);

  // Cambia la apariencia de esta persona: se ve en el acto y se guarda en su perfil (si falla, vuelve a la de antes)
  const saveAppearance = useCallback(async (appearance) => {
    if (!profile) return { error: new Error('no-profile') };
    const before = profile.appearance;
    setProfile(pr => ({ ...pr, appearance }));
    const { error } = await updateProfile(profile.id, { appearance });
    if (error) setProfile(pr => ({ ...pr, appearance: before }));
    return { error };
  }, [profile]);

  // Al cambiar de pantalla: arriba y con el foco en el contenido
  const firstPath = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstPath.current) { firstPath.current = false; return; }
    requestAnimationFrame(() => document.getElementById('pn-main')?.focus({ preventScroll: true }));
  }, [location.pathname]);

  const notify = useCallback((text, tone = 'ok') => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Sin actividad durante 30 minutos, la sesión se cierra (un ordenador compartido no se queda con el panel abierto)
  useEffect(() => {
    if (phase !== 'ready') return undefined;
    let last = Date.now();
    let done = false;
    const touch = () => { last = Date.now(); };
    const check = () => {
      if (done || Date.now() - last < IDLE_MS) return;
      done = true;
      signOutAdmin().finally(() => navigate('/admin/login?idle=1', { replace: true }));
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, touch, { passive: true, capture: true }));
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(check, 30000);
    return () => {
      events.forEach(e => window.removeEventListener(e, touch, { capture: true }));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [phase, navigate]);

  async function logout() {
    setLeaving(true);
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const isSuperadmin = profile?.role === 'superadmin';
  const allowedCategories = useMemo(() => (isSuperadmin ? null : permissions.filter(x => x.can_view).map(x => x.category)), [isSuperadmin, permissions]);
  const can = useCallback((action, category) => {
    if (isSuperadmin) return true;
    const perm = permissions.find(x => x.category === category);
    return perm ? perm[`can_${action}`] === true : false;
  }, [isSuperadmin, permissions]);
  // Puede registrar casos quien puede editar alguna categoría
  const canRegister = isSuperadmin || permissions.some(x => x.can_edit);

  const channelPath = org?.slug ? `/canal/${org.slug}` : '';
  // La dirección completa del canal, la que se comparte: con dirección propia (canal.acme.es, migración 017), la suya
  const channelUrl = !channelPath ? '' : org?.custom_domain ? `https://${org.custom_domain}${channelPath}` : `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`;
  const ctx = {
    lang, setLang, t, tr, p, profile, email: session?.user?.email ?? '', permissions, isSuperadmin, can, canRegister,
    allowedCategories, org, saveOrg, members, setMembers, notify, channelPath, refreshProfile: loadProfile, mfaSetup,
    logout, leaving, saveAppearance, channelUrl,
  };

  const here = `${location.pathname}${location.search}`;
  if (phase === 'anon' || phase === 'code') return <Navigate to="/admin/login" replace state={{ from: here }} />;
  if (phase === 'ready' && mfaSetup && !location.pathname.startsWith('/admin/mfa')) return <Navigate to="/admin/mfa" replace />;

  if (phase === 'loading' || phase === 'noprofile') {
    return (
      <div className="ds ds-page pn-plain">
        {phase === 'loading' ? (
          // El esqueleto tiene la forma del panel: la cabecera, el título y las tres columnas
          <div className="pn-loading" role="status" aria-live="polite">
            <span className="ds-vh">{p.loading}</span>
            <div className="pn-loading-head" aria-hidden="true"><Skeleton width={140} height={18} /><Skeleton width={320} height={18} /></div>
            <div className="pn-loading-body" aria-hidden="true">
              <Skeleton width={180} height={30} />
              <div className="pn-loading-cols">{[0, 1, 2].map(i => <Skeleton key={i} height={220} />)}</div>
            </div>
          </div>
        ) : (
          <Card as="main" className="pn-lost">
            <h1 className="ds-h1 is-sm">{t.noProfileTitle}</h1>
            <p className="ds-lead">{t.noProfileText}</p>
            <Button variant="soft" size="md" onClick={logout} busy={leaving} icon={<LogOut size={16} strokeWidth={1.8} aria-hidden="true" />}>{p.logout}</Button>
          </Card>
        )}
      </div>
    );
  }

  const path = location.pathname.replace(/\/+$/, '');
  const inSettings = SETTINGS.some(x => path.startsWith(x));
  const nav = mfaSetup ? [
    { to: '/admin/mfa', label: p.nav.settings, short: p.nav.settingsShort, icon: SlidersHorizontal, active: true },
  ] : [
    { to: '/admin', label: p.nav.board, icon: LayoutDashboard, active: path === '/admin' || path.startsWith('/admin/complaints') || path.startsWith('/admin/nueva') },
    { to: '/admin/report', label: p.nav.report, icon: BarChart3, active: path.startsWith('/admin/report') },
    // «Compartir el canal» es cosa de quien administra
    ...(isSuperadmin ? [{ to: '/admin/integration', label: p.nav.share, short: p.nav.shareShort, icon: Share2, active: path.startsWith('/admin/integration') }] : []),
    { to: '/admin/ajustes', label: p.nav.settings, short: p.nav.settingsShort, icon: SlidersHorizontal, active: inSettings },
  ];

  // Aviso del plan junto al nombre: solo cuando hay algo que hacer
  const plan = isSuperadmin ? planInfo(org) : null;
  const planChip = !plan ? null
    : plan.state === 'trial' ? { warn: plan.days <= 7, text: plan.days === 0 ? t.chipTrialToday : fmt(plan.days === 1 ? t.chipTrialOne : t.chipTrial, { n: plan.days }) }
    : plan.state === 'trialEnded' ? { warn: true, text: t.chipTrialEnded }
    : plan.state === 'expired' ? { warn: true, text: t.chipExpired }
    : plan.renewSoon ? { warn: plan.days <= 7, text: plan.days === 0 ? t.chipRenewToday : plan.days === 1 ? t.chipRenewOne : fmt(t.chipRenew, { n: plan.days }) }
    : null;
  const orgName = org?.name ?? '';
  const name = profile.full_name || ctx.email;

  return (
    <>
      <SplitShell
        className="pn" active="manage" skip={t.skip} mainId="pn-main"
        manage={(
          <>
            <header className="pn-head">
              <div className="pn-head-in">
                <div className="pn-brand">
                  <Link className="pn-brand-link ds-brand" to="/admin"><BrandLogo org={org} /><b title={orgName}>{orgName}</b></Link>
                  {IS_DEMO && <Chip className="pn-chip" title={p.demoLong}>{p.demoChip}<span className="ds-vh">: {p.demoLong}</span></Chip>}
                </div>
                <PillNav items={nav} label={p.navLabel} />
                <div className="pn-tools">
                  {/* El plan, en texto pequeño: solo cuando hay algo que hacer */}
                  {planChip && <Link className={cx('pn-plan', planChip.warn && 'is-warn')} to="/admin/ajustes">{planChip.text}</Link>}
                  {channelPath && (
                    <a className="pn-view" href={channelPath} target="_blank" rel="noopener noreferrer" aria-label={p.viewChannelAria}>
                      <span>{p.viewChannel}</span><ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  )}
                  {!mfaSetup && (
                    <>
                      <IconButton variant="ghost" size="md" label={p.search} onClick={() => setSearching(true)}><Search size={18} strokeWidth={1.8} aria-hidden="true" /></IconButton>
                      {canRegister && (
                        <Button variant={path === '/admin' ? 'report' : 'soft'} size="md" className="pn-register" to="/admin/nueva" aria-label={p.register} icon={<Plus size={16} strokeWidth={1.8} aria-hidden="true" />}>
                          <span className="pn-register-t">{p.register}</span>
                        </Button>
                      )}
                    </>
                  )}
                  <Menu
                    label={p.account} className={cx('pn-me', mfaSetup && 'is-setup')}
                    trigger={props => <button type="button" className="pn-avatar" {...props}><span className="ds-vh">{`${p.account}: ${name}`}</span><span aria-hidden="true" style={{ display: 'contents' }}><Avatar name={name} /></span></button>}
                  >
                    <div className="ds-menu-head"><b>{name}</b><span>{isSuperadmin ? t.roleSuperadmin : t.roleManager}</span></div>
                    <div className="pn-me-lang">
                      <span className="ds-vh" id="pn-lang-l">{p.language}</span>
                      <Segmented
                        tone="plain" label={p.language} value={lang} onChange={setLang}
                        options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: `${l.toUpperCase()} · ${translations[l].langName}`, lang: l }))}
                      />
                    </div>
                    <div className="ds-menu-sep" />
                    {/* Donde la cabecera no tiene sitio para «Ver el canal» (pantallas estrechas), está aquí */}
                    {channelPath && <MenuItem className="pn-view-item" href={channelPath} target="_blank" rel="noopener noreferrer" icon={<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />}>{p.viewChannel}</MenuItem>}
                    <MenuItem icon={<LogOut size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={logout} disabled={leaving}>{leaving ? t.loggingOut : p.logout}</MenuItem>
                  </Menu>
                </div>
              </div>
            </header>

            <main id="pn-main" className="pn-main" tabIndex={-1}>
              <Outlet context={ctx} />
            </main>
            {/* Reportia firma en pequeño, al pie: en el panel manda la marca de la empresa (n.º 37) */}
            <footer className="pn-foot">
              <span className="pn-foot-by">{p.managedWith}<ReportiaMark size={18} /></span>
            </footer>
          </>
        )}
      />

      <div className="ds pn-toast-zone" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`pn-toast is-${toast.tone}`}>
            {toast.tone === 'ok' ? <CircleCheck size={18} strokeWidth={1.8} aria-hidden="true" /> : <CircleAlert size={18} strokeWidth={1.8} aria-hidden="true" />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>

      <Offline lang={lang} />
      <SearchDialog open={searching} onClose={() => setSearching(false)} ctx={ctx} />
    </>
  );
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Buscar un caso por referencia o por texto. Filtra en el navegador los casos que la persona puede ver. */
function SearchDialog({ open, onClose, ctx }) {
  const { p, tr, allowedCategories } = ctx;
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setQ('');
    setLoadErr(false);
    listComplaints({ categories: allowedCategories })
      .then(({ complaints, error }) => { if (!alive) return; setLoadErr(!!error && !complaints?.length); setRows(complaints ?? []); })
      .catch(() => { if (alive) { setLoadErr(true); setRows([]); } });
    return () => { alive = false; };
  }, [open, allowedCategories]);

  const needle = norm(q.trim());
  const found = useMemo(() => {
    if (!rows || needle.length < 2) return [];
    const ref = needle.replace(/[^a-z0-9]/g, '');
    return rows.filter(c => {
      const cat = tr.canal.cats[c.category]?.[0] ?? c.category;
      return (ref && norm(c.reference).replace(/[^a-z0-9]/g, '').includes(ref))
        || norm(`${c.title ?? ''} ${c.description ?? ''} ${cat} ${c.department ?? ''}`).includes(needle);
    }).slice(0, 12);
  }, [rows, needle, tr]);

  return (
    <Dialog open={open} onClose={onClose} title={p.searchTitle} closeLabel={p.close} className="pn-search">
      <Field
        type="search" label={p.searchPh} hideLabel placeholder={p.searchPh} value={q} autoFocus data-autofocus autoComplete="off" spellCheck={false}
        onChange={e => setQ(e.target.value)} help={needle.length < 2 ? p.searchHint : undefined}
      />
      {rows === null && <Skeleton height={48} />}
      {loadErr && <p className="ds-field-error" role="alert">{p.searchErr}</p>}
      {/* Quien usa lector de pantalla oye cuántos casos coinciden */}
      <p className="ds-vh" role="status">{needle.length >= 2 && rows !== null && !loadErr ? (found.length === 0 ? p.searchNone : found.length === 1 ? p.searchOne : fmt(p.searchMany, { n: found.length })) : ''}</p>
      {needle.length >= 2 && rows !== null && !loadErr && (
        found.length === 0 ? <p>{p.searchNone}</p> : (
          <ul className="pn-found">
            {found.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => { onClose(); navigate(`/admin/complaints/${c.id}`); }}>
                  <b>{caseTitle(c, tr)}</b>
                  {/* Con título propio, debajo van la referencia y el tema; sin él, ya son el título */}
                  {c.title && !c.anonymized_at && <span>{c.reference} · {tr.canal.cats[c.category]?.[0] ?? c.category}</span>}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </Dialog>
  );
}
