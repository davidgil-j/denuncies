import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Ellipsis, FileSpreadsheet, FileText, Eraser, CircleAlert, Inbox, LockKeyhole } from 'lucide-react';
import { listComplaints, getRetentionDue, hasRedesign } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { STATUS_ORDER, PRIORITIES, fLong } from '../admin/adminKit.jsx';
import { Button, IconButton, Card, Chip, CaseCard, Kanban, Dialog, Field, Menu, MenuItem, Skeleton } from '../ui/index.js';
import { usePanel, Tp, caseState, caseTitle, relDay, rangeLabel } from './kit.jsx';
import { STEPS, StepsRing, onboardingState, aipiInfo } from './primeros.jsx';

const FILTERS = ['cat', 'pr', 'st', 'dl', 'mine', 'from', 'to'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOSED_SHOWN = 2;
const CLOSED_STEP = 10;

export default function Tablero() {
  const { lang, t, tr, p, org, members, profile, email, isSuperadmin, allowedCategories, can, notify } = usePanel();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [due, setDue] = useState([]);
  const [filtering, setFiltering] = useState(false);
  const [closedShown, setClosedShown] = useState(CLOSED_SHOWN);
  const [exporting, setExporting] = useState(false);

  const noAccess = !isSuperadmin && allowedCategories.length === 0;
  const catsKey = allowedCategories ? allowedCategories.join(',') : '*';
  const cats = tr.canal.cats;
  const catName = (v) => cats[v]?.[0] ?? v;

  async function load() {
    setFailed(false);
    setRows(null);
    const { complaints, error } = await listComplaints({ categories: allowedCategories });
    if (error) { setFailed(true); setRows([]); return; }
    setRows(complaints);
  }
  useEffect(() => { if (!noAccess) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [catsKey]);
  // Casos que la ley obliga a suprimir (art. 32): solo los ve quien administra
  useEffect(() => {
    if (!isSuperadmin) return undefined;
    let alive = true;
    getRetentionDue().then(({ items }) => { if (alive) setDue(items ?? []); });
    return () => { alive = false; };
  }, [isSuperadmin]);
  useEffect(() => { document.title = `${p.nav.board} · ${org?.name ?? ''}`; }, [p, org]);

  // Los filtros viven en la dirección: al volver de un caso siguen puestos
  const f = Object.fromEntries(FILTERS.map(k => [k, params.get(k) ?? '']));
  if (f.from && !ISO_DAY.test(f.from)) f.from = '';
  if (f.to && !ISO_DAY.test(f.to)) f.to = '';
  const active = FILTERS.filter(k => f[k]).length;
  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setParams(next, { replace: true });
  };
  const clear = () => setFilter(Object.fromEntries(FILTERS.map(k => [k, ''])));
  const canMine = hasRedesign();

  const all = useMemo(() => {
    const now = new Date();
    return (rows ?? []).map(c => ({ c, s: caseState(c, now) }));
  }, [rows]);

  const shown = useMemo(() => {
    const from = f.from ? new Date(`${f.from}T00:00:00`) : null;
    const to = f.to ? new Date(`${f.to}T23:59:59`) : null;
    return all.filter(({ c, s }) => (!f.cat || c.category === f.cat)
      && (!f.pr || c.priority === f.pr)
      && (!f.st || c.status === f.st)
      && (!f.dl || (f.dl === 'overdue' ? s.overdue : !s.closed && s.dl.next.state === 'soon'))
      && (!f.mine || !canMine || c.assigned_to === profile.id)
      && (!from || new Date(c.created_at) >= from)
      && (!to || new Date(c.created_at) <= to));
  }, [all, f.cat, f.pr, f.st, f.dl, f.mine, f.from, f.to, canMine, profile.id]);

  const columns = useMemo(() => {
    const by = { new: [], open: [], closed: [] };
    shown.forEach(x => by[x.s.column].push(x));
    // Dentro de cada columna, el plazo más urgente primero; en Cerradas, la más reciente
    by.new.sort((a, b) => a.s.dl.sortKey - b.s.dl.sortKey);
    by.open.sort((a, b) => a.s.dl.sortKey - b.s.dl.sortKey);
    by.closed.sort((a, b) => new Date(b.c.answered_at ?? b.c.updated_at) - new Date(a.c.answered_at ?? a.c.updated_at));
    return by;
  }, [shown]);

  // Cuántos casos necesitan algo hoy (de todos los que puede ver, no solo de los filtrados)
  const need = all.filter(x => x.s.today).length;
  const from = params.toString() ? `?${params}` : '';
  const loading = rows === null && !noAccess;
  const firstName = (profile.full_name || email).trim().split(/[\s@]/)[0];
  // Lo que le queda por hacer a la empresa para tener el canal en regla: solo lo ve quien administra
  const steps = isSuperadmin ? onboardingState(org, members) : null;
  const aipi = isSuperadmin ? aipiInfo(org) : null;

  // Pasar de columna es dar el paso en la ficha: se abre con el acuse o el cierre preparados, nunca en silencio
  const canMove = ({ c }, fromCol, toCol) => can('edit', c.category) && can('reply', c.category) && !c.anonymized_at
    && ((fromCol === 'new' && toCol === 'open') || (fromCol === 'open' && toCol === 'closed'));
  const onMove = ({ c }, fromCol) => navigate(`/admin/complaints/${c.id}`, { state: { from, step: fromCol === 'new' ? 'ack' : 'close' } });

  async function doExport(kind) {
    setExporting(true);
    // Las exportaciones llevan la referencia interna, nunca el código de quien informa
    const list = shown.map(({ c }) => ({ ...c, tracking_code: c.reference, organization: org?.name ?? '' }));
    try {
      const { exportToExcel, exportSummaryToPDF } = await import('../lib/exportV2.js');
      const filters = { view: '', status: f.st, category: f.cat, priority: f.pr, dateFrom: f.from, dateTo: f.to, q: '', organization: org?.name ?? '' };
      if (kind === 'xlsx') await exportToExcel(list, undefined, lang, filters);
      else await exportSummaryToPDF(list, filters, lang);
    } catch { notify(p.exportErr, 'err'); }
    setExporting(false);
  }

  if (noAccess) {
    return (
      <div className="pn-page">
        <Card tone="bg" className="pn-empty"><LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" /><h1 className="pn-empty-t">{t.noAccessTitle}</h1><p>{t.noAccessText}</p></Card>
      </div>
    );
  }

  const cols = ['new', 'open', 'closed'].map(id => {
    const items = columns[id];
    // Las cerradas: las 2 últimas y, a partir de ahí, de 10 en 10
    const cut = id === 'closed' ? items.slice(0, closedShown) : items;
    const left = items.length - cut.length;
    return {
      id, name: p.cols[id], items: cut, total: items.length, empty: active ? p.emptyFiltered : p.colEmpty[id],
      footer: id === 'closed' && items.length > CLOSED_SHOWN
        ? (left > 0
          ? <button type="button" className="pn-link" onClick={() => setClosedShown(n => n + CLOSED_STEP)}>{fmt(p.seeMore, { n: Math.min(CLOSED_STEP, left), total: items.length })}</button>
          : <button type="button" className="pn-link" onClick={() => setClosedShown(CLOSED_SHOWN)}>{p.seeLess}</button>)
        : null,
    };
  });

  return (
    <div className="pn-page">
      <div className="pn-top">
        <div className="pn-hello">
          <span>{fmt(p.hello, { name: firstName })}</span>
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => (loading ? x.nav.board : need === 0 ? x.need0 : need === 1 ? x.need1 : fmt(x.needN, { n: need }))} />
        </div>
        <div className="pn-actions">
          {steps && steps.count < STEPS.length && <StepsRing state={steps} p={p} />}
          <Button variant="bg" size="sm" onClick={() => setFiltering(true)} icon={<SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />}>
            {p.filter}{active > 0 && <span className="pn-count">{active}</span>}
          </Button>
          <Menu label={p.more} trigger={props => <IconButton variant="bg" label={p.more} busy={exporting} {...props}><Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" /></IconButton>}>
            <MenuItem icon={<FileSpreadsheet size={16} aria-hidden="true" />} onClick={() => doExport('xlsx')} disabled={loading || !shown.length}>{p.exportXls}</MenuItem>
            <MenuItem icon={<FileText size={16} aria-hidden="true" />} onClick={() => doExport('pdf')} disabled={loading || !shown.length}>{p.exportPdf}</MenuItem>
          </Menu>
        </div>
      </div>

      {active > 0 && (
        <p className="pn-filtered">
          {f.cat && <Chip size="md" tone="report">{catName(f.cat)}</Chip>}
          {f.pr && <Chip size="md" tone="report">{p.priority}: {p.prios[f.pr]}</Chip>}
          {f.st && <Chip size="md" tone="report">{t.status[f.st]}</Chip>}
          {f.dl && <Chip size="md" tone="report">{f.dl === 'overdue' ? p.dlOverdue : p.dlSoon}</Chip>}
          {f.mine && canMine && <Chip size="md" tone="report">{p.fMine}</Chip>}
          {(f.from || f.to) && <Chip size="md" tone="report">{rangeLabel(f.from, f.to, lang, p)}</Chip>}
          <button type="button" className="pn-link" onClick={clear}>{p.clearFilters}</button>
        </p>
      )}

      {aipi?.state === 'overdue' && (
        <section className="pn-banner is-danger" aria-labelledby="pn-aipi-t">
          <CircleAlert size={20} strokeWidth={2} aria-hidden="true" />
          <div>
            <h2 id="pn-aipi-t">{p.aipiLateT}</h2>
            <p>{fmt(p.aipiLateText, { date: fLong(aipi.due, lang) })}</p>
          </div>
          <Button variant="white" size="xs" to="/admin/ajustes">{p.onb.goSettings}</Button>
        </section>
      )}

      {due.length > 0 && (
        <section className="pn-banner" aria-labelledby="pn-ret-t">
          <Eraser size={20} strokeWidth={2} aria-hidden="true" />
          <div>
            <h2 id="pn-ret-t">{due.length === 1 ? p.ret1 : fmt(p.retN, { n: due.length })}</h2>
            <p>{p.retText}</p>
            <ul>{due.map(d => <li key={d.id}><Link to={`/admin/complaints/${d.id}`} state={{ from }}>{d.reference}</Link></li>)}</ul>
          </div>
        </section>
      )}

      {failed ? (
        <div className="pn-error" role="alert"><CircleAlert size={20} strokeWidth={2.2} aria-hidden="true" /><span>{p.loadErr}</span><Button variant="white" size="xs" onClick={load}>{p.retry}</Button></div>
      ) : loading ? (
        <div className="ds-kanban" aria-hidden="true">
          {[2, 3, 2].map((n, i) => (
            <div className="ds-kcol" key={i}>
              <Skeleton width={90} height={18} />
              {Array.from({ length: n }, (_, j) => <Card radius="md" key={j}><Skeleton width="85%" height={18} /><Skeleton width="55%" /><Skeleton width={120} height={24} /></Card>)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {rows.length === 0 && (
            <Card tone="bg" className="pn-empty">
              <Inbox size={28} strokeWidth={1.7} aria-hidden="true" />
              <h2 className="pn-empty-t">{p.emptyTitle}</h2>
              <p>{fmt(p.emptyText, { org: org?.name ?? '' })}</p>
              {isSuperadmin && <Button variant="ink" size="sm" to="/admin/integration">{p.shareCta}</Button>}
            </Card>
          )}
          <Kanban
            lang={lang} columns={cols} getId={x => x.c.id} onMove={onMove} canMove={canMove}
            renderCard={({ c, s }, { move, dragging }) => (
              <CaseCard
                lang={lang} title={caseTitle(c, p)} to={`/admin/complaints/${c.id}`} linkState={{ from }}
                meta={[catName(c.category), c.is_anonymous ? p.anon : p.ident, s.column === 'new' ? relDay(c.created_at, p) : null].filter(Boolean).join(' · ')}
                today={s.today} deadline={s.deadline} overdue={s.overdue} done={s.done}
                meeting={!!s.meeting?.pending} wrote={(c.unread ?? 0) > 0} priority={s.closed ? undefined : c.priority}
                move={move} dragging={dragging}
              />
            )}
          />
        </>
      )}

      <Dialog
        side open={filtering} onClose={() => setFiltering(false)} title={p.filters} closeLabel={p.close}
        actions={<>
          {active > 0 && <Button variant="soft" size="md" onClick={clear}>{p.clearFilters}</Button>}
          <Button variant="ink" size="md" onClick={() => setFiltering(false)}>{p.done}</Button>
        </>}
      >
        <Field as="select" size="sm" label={p.fCategory} value={f.cat} onChange={e => setFilter({ cat: e.target.value })}>
          <option value="">{p.any}</option>
          {Object.keys(cats).filter(v => !allowedCategories || allowedCategories.includes(v)).map(v => <option key={v} value={v}>{catName(v)}</option>)}
        </Field>
        <Field as="select" size="sm" label={p.fPriority} value={f.pr} onChange={e => setFilter({ pr: e.target.value })}>
          <option value="">{p.anyF}</option>
          {PRIORITIES.map(v => <option key={v} value={v}>{p.prios[v]}</option>)}
        </Field>
        <Field as="select" size="sm" label={p.fStatus} value={f.st} onChange={e => setFilter({ st: e.target.value })}>
          <option value="">{p.any}</option>
          {STATUS_ORDER.map(v => <option key={v} value={v}>{t.status[v]}</option>)}
        </Field>
        <Field as="select" size="sm" label={p.fDeadline} value={f.dl} onChange={e => setFilter({ dl: e.target.value })}>
          <option value="">{p.any}</option>
          <option value="soon">{p.dlSoon}</option>
          <option value="overdue">{p.dlOverdue}</option>
        </Field>
        {canMine && (
          <label className="pn-check"><input type="checkbox" checked={!!f.mine} onChange={e => setFilter({ mine: e.target.checked ? '1' : '' })} /><span>{p.fMine}</span></label>
        )}
        <div className="pn-two">
          <Field size="sm" type="date" label={p.fFrom} value={f.from} max={f.to || undefined} onChange={e => setFilter({ from: e.target.value })} />
          <Field size="sm" type="date" label={p.fTo} value={f.to} min={f.from || undefined} onChange={e => setFilter({ to: e.target.value })} />
        </div>
      </Dialog>
    </div>
  );
}
