import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, FileSpreadsheet, FileText, Scale, ArrowUpRight, ArrowUp, ArrowDown, ChevronsUpDown, ChevronRight,
  ChevronLeft, EyeOff, UserRound, SlidersHorizontal, Inbox, SearchX, Link2, Copy, Check, CircleAlert, LockKeyhole, RotateCw,
  MessageSquareText, Eraser,
} from 'lucide-react';
import { listComplaints, getRetentionDue } from '../../lib/supabase.js';
import { ICON, fmt, BOE_URL } from '../V2Layout.jsx';
import {
  useAdmin, L, SwapL, deadlineInfo, Deadline, StatusPill, Priority, Select, Empty, copyText, catLabel, relDay, fNum,
  STATUS_ORDER, OPEN, ANSWERED, PRIORITIES, PRIO_RANK,
} from './adminKit.jsx';

const VIEWS = ['open', 'ack', 'soon', 'overdue', 'closed', 'all'];
const VIEW_LABEL = { open: 'vOpen', ack: 'vAck', soon: 'vSoon', overdue: 'vOverdue', closed: 'vClosed', all: 'vAll' };
const IN_VIEW = {
  open: (r) => OPEN.includes(r.c.status),
  ack: (r) => r.c.status === 'received',
  soon: (r) => r.dl.next.state === 'soon',
  overdue: (r) => r.dl.next.state === 'overdue',
  closed: (r) => ANSWERED.includes(r.c.status),
  all: () => true,
};
const PER_PAGE = 25;
const FILTER_KEYS = ['q', 'st', 'cat', 'pr', 'from', 'to'];
const STATE_KEYS = ['v', ...FILTER_KEYS, 'sort', 'dir', 'p'];
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Parametres de l'adreça que no són vàlids s'ignoren (abans deixaven la llista buida sense explicació)
const SORTS = ['deadline', 'created', 'status', 'priority', 'category'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function cleanState(raw, cats) {
  const x = { ...raw };
  if (!VIEWS.includes(x.v)) x.v = '';
  if (x.st && !STATUS_ORDER.includes(x.st)) x.st = '';
  if (x.cat && !cats.includes(x.cat)) x.cat = '';
  if (x.pr && !PRIORITIES.includes(x.pr)) x.pr = '';
  if (x.from && !ISO_DAY.test(x.from)) x.from = '';
  if (x.to && !ISO_DAY.test(x.to)) x.to = '';
  if (x.from && x.to && x.from > x.to) [x.from, x.to] = [x.to, x.from];
  if (x.sort && !SORTS.includes(x.sort)) x.sort = '';
  if (x.dir && !['asc', 'desc'].includes(x.dir)) x.dir = '';
  return x;
}

export default function V2Dashboard() {
  const { t, tr, lang, org, isSuperadmin, allowedCategories, notify, channelPath } = useAdmin();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);

  // L'estat de la vista viu aquí i es copia a la URL: en tornar del detall es conserven
  // filtres, ordre i pàgina. (setSearchParams no encua canvis; useState sí.)
  const allCats = tr.categories.map(c => c.value);
  const [s, setS] = useState(() => cleanState(Object.fromEntries(STATE_KEYS.map(k => [k, params.get(k) ?? ''])), allCats));
  const [due, setDue] = useState([]);

  // Si l'adreça canvia des de fora (enllaç «Denúncies» del menú, enrere), l'estat la segueix
  useEffect(() => {
    const fromUrl = cleanState(Object.fromEntries(STATE_KEYS.map(k => [k, params.get(k) ?? ''])), allCats);
    setS(prev => (STATE_KEYS.every(k => (prev[k] ?? '') === (fromUrl[k] ?? '')) ? prev : fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const query = useMemo(() => {
    const next = new URLSearchParams();
    STATE_KEYS.forEach(k => { if (s[k]) next.set(k, s[k]); });
    return next.toString();
  }, [s]);
  useEffect(() => {
    if (query !== params.toString()) setParams(new URLSearchParams(query), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const view = VIEWS.includes(s.v) ? s.v : 'open';
  const q = s.q;
  const f = { st: s.st, cat: s.cat, pr: s.pr, from: s.from, to: s.to };
  const sort = s.sort || 'deadline';
  const dir = s.dir || (sort === 'created' ? 'desc' : 'asc');
  const page = Math.max(1, Number(s.p) || 1);
  const activeFilters = FILTER_KEYS.filter(k => k !== 'q' && f[k]).length;
  const hasFilters = !!q || activeFilters > 0;

  function update(patch, keepPage = false) {
    setS(prev => ({ ...prev, ...patch, ...(keepPage ? {} : { p: '' }) }));
  }

  const noAccess = !isSuperadmin && allowedCategories.length === 0;
  const catsKey = allowedCategories ? allowedCategories.join(',') : '*';

  async function load() {
    setFailed(false);
    setRows(null);
    const { complaints, error } = await listComplaints({ categories: allowedCategories });
    if (error) { setFailed(true); setRows([]); return; }
    setRows(complaints);
  }
  useEffect(() => { if (!noAccess) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [catsKey]);
  // Denúncies que la llei obliga a suprimir (art. 32.4): només les veu l'administrador
  useEffect(() => {
    if (!isSuperadmin) return undefined;
    let alive = true;
    getRetentionDue().then(({ items }) => { if (alive) setDue(items ?? []); });
    return () => { alive = false; };
  }, [isSuperadmin]);
  useEffect(() => { document.title = `${t.dTitle} · ${t.panelName}`; }, [t]);

  const enriched = useMemo(() => {
    const now = new Date();
    return (rows ?? []).map(c => ({ c, dl: deadlineInfo(c, now) }));
  }, [rows]);

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map(v => [v, enriched.filter(IN_VIEW[v]).length])),
    [enriched],
  );

  const filtered = useMemo(() => {
    const needle = norm(q);
    const from = f.from ? new Date(`${f.from}T00:00:00`) : null;
    const to = f.to ? new Date(`${f.to}T23:59:59`) : null;
    // Una cerca per referència busca a totes les denúncies, no només a la vista activa
    const list = enriched.filter(r => (needle ? true : IN_VIEW[view](r))
      && (!f.st || r.c.status === f.st)
      && (!f.cat || r.c.category === f.cat)
      && (!f.pr || r.c.priority === f.pr)
      && (!from || new Date(r.c.created_at) >= from)
      && (!to || new Date(r.c.created_at) <= to)
      && (!needle || norm(r.c.reference ?? '').includes(needle) || norm((r.c.reference ?? '').replace(/^REF-/, '')).includes(needle)));
    const key = {
      deadline: r => r.dl.sortKey,
      created: r => new Date(r.c.created_at).getTime(),
      status: r => STATUS_ORDER.indexOf(r.c.status),
      priority: r => PRIO_RANK[r.c.priority] ?? 1,
      category: r => catLabel(tr, r.c.category),
    }[sort] ?? (r => r.dl.sortKey);
    const sign = dir === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => {
      const ka = key(a), kb = key(b);
      const cmp = typeof ka === 'string' ? ka.localeCompare(kb, lang) : ka - kb;
      return cmp !== 0 ? cmp * sign : new Date(b.c.created_at) - new Date(a.c.created_at);
    });
  }, [enriched, view, q, f.st, f.cat, f.pr, f.from, f.to, sort, dir, tr, lang]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  function setSort(col) {
    if (sort === col) update({ sort: col, dir: dir === 'asc' ? 'desc' : 'asc' });
    else update({ sort: col, dir: col === 'created' || col === 'priority' ? 'desc' : 'asc' });
  }

  async function doExport(kind) {
    setExporting(kind);
    // Les exportacions porten la referència interna, mai el codi de qui denuncia
    const list = filtered.map(r => ({ ...r.c, tracking_code: r.c.reference, organization: org?.name ?? '' }));
    try {
      // Excel i PDF es carreguen només en exportar (no pesen a la càrrega del panell)
      const { exportToExcel, exportSummaryToPDF } = await import('../lib/exportV2.js');
      const filters = { view: q ? '' : t[VIEW_LABEL[view]], status: f.st, category: f.cat, priority: f.pr, dateFrom: f.from, dateTo: f.to, q, organization: org?.name ?? '' };
      if (kind === 'xlsx') await exportToExcel(list, undefined, lang, filters);
      else await exportSummaryToPDF(list, filters, lang);
    } catch {
      notify(t.exportErr, 'err');
    }
    setExporting(null);
  }

  const channelUrl = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`;
  async function copyChannel() {
    if (await copyText(channelUrl)) { setCopied(true); setTimeout(() => setCopied(false), 2200); }
  }

  const from = query ? `?${query}` : '';
  const go = (id) => navigate(`/admin/complaints/${id}`, { state: { from } });
  const loading = rows === null && !noAccess;
  const categories = tr.categories.filter(c => !allowedCategories || allowedCategories.includes(c.value));
  const colName = { deadline: t.cDeadline, created: t.cReceived, status: t.cStatus, priority: t.cPriority, category: t.cCategory };

  const sortTh = (col, children, className) => {
    const on = sort === col;
    const Icon = !on ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th key={col} className={className} aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button type="button" className={`v2-th-btn${on ? ' is-on' : ''}`} onClick={() => setSort(col)}>
          {children}<Icon {...ICON} />
        </button>
      </th>
    );
  };

  return (
    <div className="v2-page">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <L as="h1" className="v2-ph-title" k="dTitle" />
          <L as="p" className="v2-ph-lead" k={isSuperadmin ? 'dLeadAll' : 'dLeadManager'} />
        </div>
        {!noAccess && (
          <div className="v2-ph-actions">
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => doExport('xlsx')} aria-busy={exporting === 'xlsx'} disabled={loading || !filtered.length}>
              <FileSpreadsheet {...ICON} /><L k="exportExcel" />
            </button>
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => doExport('pdf')} aria-busy={exporting === 'pdf'} disabled={loading || !filtered.length}>
              <FileText {...ICON} /><L k="exportPdf" />
            </button>
          </div>
        )}
      </header>

      {isSuperadmin && channelPath && (
        <p className="v2-chanlink">
          <Link2 {...ICON} />
          <span className="v2-vh">{t.channelLink}: </span>
          <a href={channelPath} target="_blank" rel="noopener noreferrer">{channelUrl.replace(/^https?:\/\//, '')}</a>
          <button type="button" className="v2-mini-btn" onClick={copyChannel}>
            {copied ? <Check {...ICON} /> : <Copy {...ICON} />}<SwapL on={copied} k="copyLink" kOn="linkCopied" />
          </button>
        </p>
      )}

      {noAccess ? (
        <Empty icon={LockKeyhole} title={t.noAccessTitle}>{t.noAccessText}</Empty>
      ) : (
        <>
          {due.length > 0 && (
            <section className="v2-retention" aria-labelledby="v2-ret-t">
              <Eraser {...ICON} />
              <div>
                <h2 id="v2-ret-t">{due.length === 1 ? t.retTitleOne : fmt(t.retTitle, { n: due.length })}</h2>
                <L as="p" k="retText" />
                <ul>
                  {due.map(d => <li key={d.id}><Link to={`/admin/complaints/${d.id}`} state={{ from }}>{d.reference}</Link></li>)}
                </ul>
              </div>
            </section>
          )}

          {/* Vistes amb recompte real: són filtres, no decoració */}
          <div className="v2-views" role="group" aria-label={t.viewsLabel}>
            {VIEWS.map(v => (
              <button
                key={v}
                type="button"
                className={`v2-view is-${v}${counts[v] > 0 ? ' has-items' : ''}`}
                aria-pressed={view === v}
                onClick={() => update({ v, st: '' })}
              >
                <L className="v2-view-label" k={VIEW_LABEL[v]} />
                <span className="v2-view-n">{loading ? <span className="v2-skel is-num" /> : counts[v]}</span>
              </button>
            ))}
          </div>

          <div className="v2-legal-note">
            <Scale {...ICON} />
            <div>
              <L as="p" k="legalLead" />
              <details>
                <summary><L k="legalHow" /></summary>
                <L as="p" k="legalHowText" />
                <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer"><L k="lawLink" /><ArrowUpRight {...ICON} /></a>
              </details>
            </div>
          </div>

          <div className="v2-toolbar">
            <div className="v2-search">
              <label htmlFor="v2-q" className="v2-vh"><L k="searchLabel" /></label>
              <Search {...ICON} />
              <input
                id="v2-q" type="search" value={q} placeholder={t.searchPh}
                autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onChange={e => update({ q: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="v2-btn v2-btn-secondary v2-btn-sm icon-lead v2-filters-toggle"
              aria-expanded={showFilters}
              aria-controls="v2-filters"
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal {...ICON} />{t.filters}{activeFilters > 0 && <span className="v2-count">{activeFilters}</span>}
            </button>
            <div className="v2-filters" id="v2-filters" data-open={showFilters}>
              <Select
                label={t.fStatus} hideLabel value={f.st} className={f.st ? 'is-set' : ''}
                onChange={v => update({ st: v, v: v ? 'all' : view })}
                options={[{ value: '', label: t.fStatus }, ...STATUS_ORDER.map(s => ({ value: s, label: t.status[s] }))]}
              />
              <Select
                label={t.fCategory} hideLabel value={f.cat} className={f.cat ? 'is-set' : ''}
                onChange={v => update({ cat: v })}
                options={[{ value: '', label: t.fCategory }, ...categories]}
              />
              <Select
                label={t.fPriority} hideLabel value={f.pr} className={f.pr ? 'is-set' : ''}
                onChange={v => update({ pr: v })}
                options={[{ value: '', label: t.fPriority }, ...PRIORITIES.map(p => ({ value: p, label: t.priority[p] }))]}
              />
              <label className={`v2-date${f.from ? ' is-set' : ''}`}>
                <L k="fFrom" />
                <input type="date" value={f.from} max={f.to || undefined} onChange={e => update({ from: e.target.value })} />
              </label>
              <label className={`v2-date${f.to ? ' is-set' : ''}`}>
                <L k="fTo" />
                <input type="date" value={f.to} min={f.from || undefined} onChange={e => update({ to: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="v2-results">
            <p className="v2-results-n" aria-live="polite">
              {!loading && <><b>{filtered.length === 1 ? t.resultsOne : fmt(t.resultsMany, { n: filtered.length })}</b> {fmt(filtered.length === 1 ? t.sortedByOne : t.sortedBy, { col: colName[sort]?.toLowerCase() ?? '' })}</>}
            </p>
            {hasFilters && (
              <button type="button" className="v2-btn v2-btn-quiet v2-btn-sm" onClick={() => update(Object.fromEntries(FILTER_KEYS.map(k => [k, ''])))}>
                {t.clearFilters}
              </button>
            )}
          </div>

          {failed ? (
            <Empty
              icon={CircleAlert}
              title={t.loadErr}
              actions={<button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={load}><RotateCw {...ICON} /><L k="retry" /></button>}
            />
          ) : loading ? (
            <SkeletonTable />
          ) : rows.length === 0 ? (
            <Empty
              icon={Inbox}
              title={t.emptyNoneTitle}
              actions={isSuperadmin && channelPath && (
                <>
                  <a className="v2-btn v2-btn-primary v2-btn-sm icon-trail" href={channelPath} target="_blank" rel="noopener noreferrer"><L k="emptyNoneAction" /><ArrowUpRight {...ICON} /></a>
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={copyChannel}>{copied ? <Check {...ICON} /> : <Copy {...ICON} />}<SwapL on={copied} k="copyLink" kOn="linkCopied" /></button>
                </>
              )}
            >
              {fmt(t.emptyNoneText, { org: org?.name ?? '' })}
            </Empty>
          ) : filtered.length === 0 ? (
            hasFilters ? (
              <Empty
                icon={SearchX}
                title={t.emptyFilterTitle}
                actions={<button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => update(Object.fromEntries(FILTER_KEYS.map(k => [k, ''])))}><L k="clearFilters" /></button>}
              >
                {t.emptyFilterText}
              </Empty>
            ) : (
              <Empty icon={Inbox} title={t.emptyView[view]} />
            )
          ) : (
            <>
              {/* Escriptori: taula densa */}
              <div className="v2-tablewrap">
                <table className="v2-table">
                  <thead>
                    <tr>
                      <th className="c-code"><L k="cCode" /></th>
                      {sortTh('category', t.cCategory, 'c-cat')}
                      {sortTh('status', t.cStatus, 'c-st')}
                      {sortTh('priority', t.cPriority, 'c-pr')}
                      {sortTh('created', t.cReceived, 'c-rec')}
                      {sortTh('deadline', t.cDeadline, 'c-dl')}
                      <th className="c-go"><span className="v2-vh">{t.open.replace('{code}', '').trim()}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ c, dl }) => (
                      <tr key={c.id} className={`v2-tr is-${dl.next.state}`} onClick={() => go(c.id)}>
                        <td className="c-code">
                          <Link
                            className="v2-rowlink" to={`/admin/complaints/${c.id}`}
                            state={{ from }}
                            onClick={e => e.stopPropagation()}
                            aria-label={fmt(t.open, { code: c.reference })}
                          >
                            {c.reference}
                          </Link>
                          {c.unread > 0 && <span className="v2-unread"><MessageSquareText {...ICON} />{c.unread === 1 ? t.unreadOne : fmt(t.unreadMany, { n: c.unread })}</span>}
                          <span className="v2-sub v2-idn">{c.is_anonymous ? <EyeOff {...ICON} /> : <UserRound {...ICON} />}{c.is_anonymous ? t.anon : t.ident}</span>
                          {PRIO_RANK[c.priority] >= 2 && <span className="v2-sub v2-prio-inline"><Priority priority={c.priority} t={t} /></span>}
                        </td>
                        <td className="c-cat">
                          <span className="v2-cell-main">{catLabel(tr, c.category)}</span>
                          {c.department && <span className="v2-sub v2-ellipsis" title={c.department}>{c.department}</span>}
                        </td>
                        <td className="c-st"><StatusPill status={c.status} t={t} /></td>
                        <td className="c-pr"><Priority priority={c.priority} t={t} /></td>
                        <td className="c-rec">
                          <span className="v2-cell-main v2-num">{fNum(c.created_at, lang)}</span>
                          <span className="v2-sub">{relDay(c.created_at, t)}</span>
                        </td>
                        <td className="c-dl"><Deadline info={dl} t={t} lang={lang} /></td>
                        <td className="c-go"><ChevronRight {...ICON} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mòbil: llista de fitxes */}
              <ul className="v2-cards">
                {shown.map(({ c, dl }) => (
                  <li key={c.id}>
                    <Link className={`v2-card is-${dl.next.state}`} to={`/admin/complaints/${c.id}`} state={{ from }}>
                      <span className="v2-card-top">
                        <span className="v2-card-code">{c.reference}</span>
                        <StatusPill status={c.status} t={t} />
                      </span>
                      {c.unread > 0 && <span className="v2-unread"><MessageSquareText {...ICON} />{c.unread === 1 ? t.unreadOne : fmt(t.unreadMany, { n: c.unread })}</span>}
                      <span className="v2-card-cat">{catLabel(tr, c.category)}</span>
                      <span className="v2-card-meta">
                        <span className="v2-idn">{c.is_anonymous ? <EyeOff {...ICON} /> : <UserRound {...ICON} />}{c.is_anonymous ? t.anon : t.ident}</span>
                        <span>{relDay(c.created_at, t)}</span>
                        <Priority priority={c.priority} t={t} />
                      </span>
                      <span className="v2-card-dl"><Deadline info={dl} t={t} lang={lang} /></span>
                    </Link>
                  </li>
                ))}
              </ul>

              {pages > 1 && (
                <nav className="v2-pager" aria-label={fmt(t.pageOf, { n: current, total: pages })}>
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" disabled={current <= 1} onClick={() => update({ p: String(current - 1) }, true)}>
                    <ChevronLeft {...ICON} /><L k="pagePrev" />
                  </button>
                  <L className="v2-num" pick={x => fmt(x.pageOf, { n: current, total: pages })} />
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-trail" disabled={current >= pages} onClick={() => update({ p: String(current + 1) }, true)}>
                    <L k="pageNext" /><ChevronRight {...ICON} />
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="v2-skeleton" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div className="v2-skel-row" key={i}>
          <span className="v2-skel" style={{ width: 92 }} />
          <span className="v2-skel" style={{ width: `${48 + (i * 13) % 30}%` }} />
          <span className="v2-skel is-pill" />
          <span className="v2-skel" style={{ width: 64 }} />
          <span className="v2-skel" style={{ width: 88 }} />
          <span className="v2-skel" style={{ width: 120 }} />
        </div>
      ))}
    </div>
  );
}
