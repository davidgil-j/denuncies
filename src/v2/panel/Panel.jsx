import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Share2, SlidersHorizontal, Search, Plus, LogOut, CircleCheck, CircleAlert, UserRoundX } from 'lucide-react';
import { translations } from '../../translations.js';
import {
  getAdminSession, getProfile, getManagerPermissions, getMyOrganization, updateMyOrganization, listAssignees, signOutAdmin, getMfaState, listComplaints, IS_DEMO,
} from '../../lib/supabase.js';
import { LANGS, detectLang, fmt } from '../V2Layout.jsx';
import { planInfo } from '../admin/adminKit.jsx';
import { SplitShell, SideTab, PillNav, Button, IconButton, Chip, Card, OrgMark, Avatar, Skeleton, Segmented, Dialog, Field, Menu, MenuItem } from '../ui/index.js';
import { caseTitle } from './kit.jsx';
import './panel.css';

const LANG_KEY = 'reportia-panel-lang';
function initialLang() {
  try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) return saved; } catch { /* sin almacenamiento */ }
  return detectLang();
}
const SETTINGS = ['/admin/ajustes', '/admin/mfa'];

/**
 * El lado «Gestionar» ya dentro: guarda de sesión, perfil y permisos, y el marco de las dos mitades
 * (la franja azul «Ver el canal» y la tarjeta blanca con el menú). Las pantallas reciben idioma,
 * perfil y permisos por <Outlet context>, igual que antes.
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
  const ctx = {
    lang, setLang, t, tr, p, profile, email: session?.user?.email ?? '', permissions, isSuperadmin, can, canRegister,
    allowedCategories, org, saveOrg, members, setMembers, notify, channelPath, refreshProfile: loadProfile, mfaSetup,
  };

  const here = `${location.pathname}${location.search}`;
  if (phase === 'anon' || phase === 'code') return <Navigate to="/admin/login" replace state={{ from: here }} />;
  if (phase === 'ready' && mfaSetup && !location.pathname.startsWith('/admin/mfa')) return <Navigate to="/admin/mfa" replace />;

  if (phase === 'loading' || phase === 'noprofile') {
    return (
      <div className="ds ds-page pn-plain">
        {phase === 'loading' ? (
          <Card radius="xl" className="pn-loading" role="status" aria-live="polite">
            <span className="ds-vh">{p.loading}</span>
            <Skeleton width={220} height={40} /><Skeleton width="60%" height={48} />
            <div className="pn-loading-cols" aria-hidden="true">{[0, 1, 2].map(i => <Skeleton key={i} height={260} />)}</div>
          </Card>
        ) : (
          <Card as="main" radius="xl" className="pn-lost">
            <UserRoundX size={32} strokeWidth={1.7} aria-hidden="true" />
            <h1 className="ds-h1 is-sm">{t.noProfileTitle}</h1>
            <p className="ds-lead">{t.noProfileText}</p>
            <Button variant="ink" size="md" onClick={logout} busy={leaving} icon={<LogOut size={16} aria-hidden="true" />}>{p.logout}</Button>
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
        className="pn" active="manage" skip={t.skip}
        reportTab={channelPath ? <SideTab side="report" label={p.viewChannel} icon="external" href={channelPath} target="_blank" rel="noopener noreferrer" ariaLabel={p.viewChannelAria} /> : <span />}
        manage={(
          <>
            <header className="pn-head">
              <div className="pn-brand">
                <Link className="pn-brand-link" to="/admin"><OrgMark name={orgName} /><b>{orgName}</b></Link>
                {IS_DEMO && <Chip size="md" className="pn-chip" title={p.demoLong}>{p.demoChip}<span className="ds-vh">: {p.demoLong}</span></Chip>}
                {planChip && <Link className="pn-chiplink" to="/admin/ajustes"><Chip size="md" tone={planChip.warn ? 'warn' : 'neutral'}>{planChip.text}</Chip></Link>}
              </div>
              <PillNav items={nav} label={p.navLabel} />
              <div className="pn-tools">
                {!mfaSetup && (
                  <>
                    <IconButton variant="bg" label={p.search} onClick={() => setSearching(true)}><Search size={18} strokeWidth={2} aria-hidden="true" /></IconButton>
                    {canRegister && (
                      <Button variant="report" size="sm" className="pn-register" to="/admin/nueva" aria-label={p.register} icon={<Plus size={18} strokeWidth={2.6} aria-hidden="true" />}>
                        <span className="pn-register-t">{p.register}</span>
                      </Button>
                    )}
                  </>
                )}
                <Menu
                  label={p.account} className="pn-me"
                  trigger={props => <button type="button" className="pn-avatar" aria-label={`${p.account}: ${name}`} {...props}><Avatar name={name} /></button>}
                >
                  <div className="ds-menu-head"><b>{name}</b><span>{isSuperadmin ? t.roleSuperadmin : t.roleManager}</span></div>
                  <div className="pn-me-lang">
                    <span className="ds-vh" id="pn-lang-l">{p.language}</span>
                    <Segmented
                      tone="bg" label={p.language} value={lang} onChange={setLang}
                      options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))}
                    />
                  </div>
                  <div className="ds-menu-sep" />
                  <MenuItem icon={<LogOut size={16} strokeWidth={2} aria-hidden="true" />} onClick={logout} disabled={leaving}>{leaving ? t.loggingOut : p.logout}</MenuItem>
                </Menu>
              </div>
            </header>

            <div id="pn-main" className="pn-main" tabIndex={-1}>
              <Outlet context={ctx} />
            </div>
          </>
        )}
      />

      <div className="ds pn-toast-zone" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`pn-toast is-${toast.tone}`}>
            {toast.tone === 'ok' ? <CircleCheck size={18} strokeWidth={2.2} aria-hidden="true" /> : <CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>

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
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setQ('');
    listComplaints({ categories: allowedCategories }).then(({ complaints }) => { if (alive) setRows(complaints ?? []); });
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
        type="search" label={p.searchPh} hideLabel placeholder={p.searchPh} value={q} autoFocus autoComplete="off" spellCheck={false}
        onChange={e => setQ(e.target.value)} help={needle.length < 2 ? p.searchHint : undefined}
      />
      {rows === null && <Skeleton height={48} />}
      {needle.length >= 2 && rows !== null && (
        found.length === 0 ? <p>{p.searchNone}</p> : (
          <ul className="pn-found">
            {found.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => { onClose(); navigate(`/admin/complaints/${c.id}`); }}>
                  <b>{caseTitle(c, p)}</b>
                  <span>{c.reference} · {tr.canal.cats[c.category]?.[0] ?? c.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </Dialog>
  );
}
