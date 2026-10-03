import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, FileSpreadsheet, FileText, Scale, ArrowUpRight, ArrowUp, ArrowDown, ChevronsUpDown, ChevronRight,
  ChevronLeft, EyeOff, UserRound, SlidersHorizontal, Inbox, SearchX, Link2, Copy, Check, CircleAlert, LockKeyhole, RotateCw,
} from 'lucide-react';
import { listComplaints } from '../../lib/supabase.js';
import { exportToExcel, exportSummaryToPDF } from '../lib/exportV2.js';
import { ICON, fmt, BOE_URL } from '../V2Layout.jsx';
import {
  useAdmin, deadlineInfo, Deadline, StatusPill, Priority, Select, Empty, copyText, catLabel, relDay, fNum,
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
  const [s, setS] = useState(() => Object.fromEntries(STATE_KEYS.map(k => [k, params.get(k) ?? ''])));
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
    const list = enriched.filter(r => IN_VIEW[view](r)
      && (!f.st || r.c.status === f.st)
      && (!f.cat || r.c.category === f.cat)
      && (!f.pr || r.c.priority === f.pr)
      && (!from || new Date(r.c.created_at) >= from)
      && (!to || new Date(r.c.created_at) <= to)
      && (!needle || norm(r.c.tracking_code).includes(needle)));
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
    const list = filtered.map(r => r.c);
    try {
      if (kind === 'xlsx') await exportToExcel(list, undefined, lang);
      else await exportSummaryToPDF(list, { status: f.st, category: f.cat, priority: f.pr, dateFrom: f.from, dateTo: f.to, organization: org?.name ?? '' }, lang);
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
          <h1 className="v2-ph-title">{t.dTitle}</h1>
          <p className="v2-ph-lead">{isSuperadmin ? t.dLeadAll : t.dLeadManager}</p>
        </div>
        {!noAccess && (
          <div className="v2-ph-actions">
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => doExport('xlsx')} aria-busy={exporting === 'xlsx'} disabled={loading || !filtered.length}>
              <FileSpreadsheet {...ICON} />{t.exportExcel}
            </button>
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => doExport('pdf')} aria-busy={exporting === 'pdf'} disabled={loading || !filtered.length}>
              <FileText {...ICON} />{t.exportPdf}
            </button>
          </div>
        )}
      </header>

      {isSuperadmin && (
        <p className="v2-chanlink">
          <Link2 {...ICON} />
          <span className="v2-vh">{t.channelLink}: </span>
          <a href={channelPath} target="_blank" rel="noopener noreferrer">{channelUrl.replace(/^https?:\/\//, '')}</a>
          <button type="button" className="v2-mini-btn" onClick={copyChannel}>
            {copied ? <Check {...ICON} /> : <Copy {...ICON} />}{copied ? t.linkCopied : t.copyLink}
          </button>
        </p>
      )}

      {noAccess ? (
        <Empty icon={LockKeyhole} title={t.noAccessTitle}>{t.noAccessText}</Empty>
      ) : (
        <>
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
                <span className="v2-view-label">{t[VIEW_LABEL[v]]}</span>
                <span className="v2-view-n">{loading ? <span className="v2-skel is-num" /> : counts[v]}</span>
              </button>
            ))}
          </div>

          <div className="v2-legal-note">
            <Scale {...ICON} />
            <div>
              <p>{t.legalLead}</p>
              <details>
                <summary>{t.legalHow}</summary>
                <p>{t.legalHowText}</p>
                <a className="v2-link" href={BOE_URL} target="_blank" rel="noopener noreferrer">{t.lawLink}<ArrowUpRight {...ICON} /></a>
              </details>
            </div>
          </div>

          <div className="v2-toolbar">
            <div className="v2-search">
              <label htmlFor="v2-q" className="v2-vh">{t.searchLabel}</label>
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
                <span>{t.fFrom}</span>
                <input type="date" value={f.from} max={f.to || undefined} onChange={e => update({ from: e.target.value })} />
              </label>
              <label className={`v2-date${f.to ? ' is-set' : ''}`}>
                <span>{t.fTo}</span>
                <input type="date" value={f.to} min={f.from || undefined} onChange={e => update({ to: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="v2-results">
            <p className="v2-results-n" aria-live="polite">
              {!loading && <><b>{filtered.length === 1 ? t.resultsOne : fmt(t.resultsMany, { n: filtered.length })}</b> {fmt(t.sortedBy, { col: colName[sort]?.toLowerCase() ?? '' })}</>}
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
              actions={<button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={load}><RotateCw {...ICON} />{t.retry}</button>}
            />
          ) : loading ? (
            <SkeletonTable />
          ) : rows.length === 0 ? (
            <Empty
              icon={Inbox}
              title={t.emptyNoneTitle}
              actions={isSuperadmin && (
                <>
                  <a className="v2-btn v2-btn-primary v2-btn-sm icon-trail" href={channelPath} target="_blank" rel="noopener noreferrer">{t.emptyNoneAction}<ArrowUpRight {...ICON} /></a>
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={copyChannel}>{copied ? <Check {...ICON} /> : <Copy {...ICON} />}{copied ? t.linkCopied : t.copyLink}</button>
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
                actions={<button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => update(Object.fromEntries(FILTER_KEYS.map(k => [k, ''])))}>{t.clearFilters}</button>}
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
                      <th className="c-code">{t.cCode}</th>
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
                            aria-label={fmt(t.open, { code: c.tracking_code })}
                          >
                            {c.tracking_code}
                          </Link>
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
                        <span className="v2-card-code">{c.tracking_code}</span>
                        <StatusPill status={c.status} t={t} />
                      </span>
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
                    <ChevronLeft {...ICON} />{t.pagePrev}
                  </button>
                  <span className="v2-num">{fmt(t.pageOf, { n: current, total: pages })}</span>
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-trail" disabled={current >= pages} onClick={() => update({ p: String(current + 1) }, true)}>
                    {t.pageNext}<ChevronRight {...ICON} />
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
