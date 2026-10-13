import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, FileSpreadsheet, FileText, CircleAlert, MessageSquare, Clock, CircleCheck } from 'lucide-react';
import { listComplaints, getRetentionDue, hasRedesign } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { STATUS_ORDER, PRIORITIES, fLong, fShort } from '../admin/adminKit.jsx';
import { Button, Card, Chip, CaseCard, Kanban, Dialog, Field, Menu, MenuItem, Skeleton, cx } from '../ui/index.js';
import { usePanel, Tp, caseState, caseTitle, relDay, rangeLabel } from './kit.jsx';
import { STEPS, onboardingState, aipiInfo, joinList } from './primeros.jsx';

const FILTERS = ['cat', 'pr', 'st', 'dl', 'mine', 'from', 'to'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOSED_SHOWN = 2;
const CLOSED_STEP = 10;
const COL_ICON = { new: MessageSquare, open: Clock, closed: CircleCheck };
const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Un aviso en una línea: un punto de color, la frase y «Ver», que despliega el detalle. tone: warn (ámbar: hay
 * algo con plazo) | danger (rojo: un plazo vencido) | accent (informativo).
 */
function Notice({ id, tone = 'accent', text, see, hide, className, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={cx('pn-notice', `is-${tone}`, className)} aria-label={text}>
      <button type="button" className="pn-notice-line" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => setOpen(o => !o)}>
        <span className="pn-notice-dot" aria-hidden="true" />
        <span className="pn-notice-txt">{text}</span>
        <span className="pn-notice-see">{open ? hide : see}<ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" /></span>
      </button>
      {open && <div className="pn-notice-body" id={`${id}-b`}>{children}</div>}
    </section>
  );
}

export default function Tablero() {
  const { lang, t, tr, p, org, members, profile, isSuperadmin, allowedCategories, can, notify } = usePanel();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [due, setDue] = useState(null); // null: aún no se sabe (el tablero espera, para no saltar al llegar el aviso)
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
    getRetentionDue().then(({ items }) => { if (alive) setDue(items ?? []); }).catch(() => { if (alive) setDue([]); });
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
  const loading = (rows === null || (isSuperadmin && due === null)) && !noAccess;
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
        <Card className="pn-empty"><h1 className="pn-empty-t">{t.noAccessTitle}</h1><p>{t.noAccessText}</p></Card>
      </div>
    );
  }

  const cols = ['new', 'open', 'closed'].map(id => {
    const items = columns[id];
    const Icon = COL_ICON[id];
    // Las cerradas: las 2 últimas y, a partir de ahí, de 10 en 10
    const cut = id === 'closed' ? items.slice(0, closedShown) : items;
    const left = items.length - cut.length;
    return {
      id, name: p.cols[id], icon: <Icon size={16} strokeWidth={2} aria-hidden="true" />, items: cut, total: items.length, empty: active ? p.emptyFiltered : p.colEmpty[id],
      footer: id === 'closed' && items.length > CLOSED_SHOWN
        ? (left > 0
          ? <button type="button" className="pn-link" onClick={() => setClosedShown(n => n + CLOSED_STEP)}>{fmt(p.seeMore, { n: Math.min(CLOSED_STEP, left), total: items.length })}</button>
          : <button type="button" className="pn-link" onClick={() => setClosedShown(CLOSED_SHOWN)}>{p.seeLess}</button>)
        : null,
    };
  });
  const missing = steps ? STEPS.filter(x => !steps.done[x]).map(x => p.onb.short[x]) : [];
  const notices = [
    aipi?.state === 'overdue' && (
      <Notice key="aipi" id="pn-aipi" tone="danger" text={p.aipiLateT} see={p.see} hide={p.hide}>
        <p>{fmt(p.aipiLateText, { date: fLong(aipi.due, lang) })}</p>
        <Button variant="soft" size="xs" to="/admin/ajustes">{p.onb.goSettings}</Button>
      </Notice>
    ),
    !!due?.length && (
      <Notice key="ret" id="pn-ret" tone="warn" text={due.length === 1 ? p.ret1 : fmt(p.retN, { n: due.length })} see={p.see} hide={p.hide}>
        <p>{p.retText}</p>
        <ul className="pn-notice-refs">{due.map(d => <li key={d.id}><Link to={`/admin/complaints/${d.id}`} state={{ from }}>{d.reference}</Link></li>)}</ul>
      </Notice>
    ),
    steps && steps.count < STEPS.length && (
      <Notice key="steps" id="pn-onb" className="is-steps" text={fmt(p.onb.line, { n: steps.count })} see={p.see} hide={p.hide}>
        <p>{fmt(p.onb.missing, { list: joinList(missing, p.onb.and) })}</p>
        <Button variant="soft" size="xs" to="/admin/integration">{p.onb.seeSteps}</Button>
      </Notice>
    ),
  ].filter(Boolean);

  return (
    <div className="pn-page">
      <div className="pn-top">
        <div className="pn-hello">
          <Tp as="h1" className="ds-h1" lang={lang} pick={x => x.nav.board} />
          {/* Cuántos casos piden algo hoy. Mientras carga, la línea guarda su sitio */}
          <Tp as="p" className="pn-lead" lang={lang} pick={x => (loading ? '\u00a0' : need === 0 ? x.need0 : need === 1 ? x.need1 : fmt(x.needN, { n: need }))} />
        </div>
        <div className="pn-actions">
          <Button variant="soft" size="md" onClick={() => setFiltering(true)} icon={<SlidersHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />}>
            {p.filter}{active > 0 && <span className="pn-count">{active}</span>}
          </Button>
          <Menu label={p.export} trigger={props => <Button variant="soft" size="md" busy={exporting} iconEnd={<ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />} {...props}>{p.export}</Button>}>
            <MenuItem icon={<FileSpreadsheet size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => doExport('xlsx')} disabled={loading || !shown.length}>{p.exportXls}</MenuItem>
            <MenuItem icon={<FileText size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => doExport('pdf')} disabled={loading || !shown.length}>{p.exportPdf}</MenuItem>
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

      {notices.length > 0 && <div className="pn-notices">{notices}</div>}

      {failed ? (
        <p className="pn-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" /><span>{p.loadErr}</span><button type="button" className="pn-link" onClick={load}>{p.retry}</button></p>
      ) : loading ? (
        <div className="ds-kanban is-skel" aria-hidden="true">
          {/* En el móvil, con la forma final: pestañas y una columna */}
          <Skeleton className="ds-kanban-tabs" height={44} />
          {[2, 3, 2].map((n, i) => (
            <div className="ds-kcol" key={i}>
              <Skeleton width={90} height={18} />
              {Array.from({ length: n }, (_, j) => <div className="ds-case-skel" key={j}><Skeleton width="70%" height={16} /><Skeleton width="45%" /><Skeleton width={140} /></div>)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {rows.length === 0 && (
            <p className="pn-emptyline">
              <b>{p.emptyTitle}.</b> {fmt(p.emptyText, { org: org?.name ?? '' })}
              {isSuperadmin && <> <Link to="/admin/integration">{p.shareCta}</Link></>}
            </p>
          )}
          <Kanban
            lang={lang} columns={cols} getId={x => x.c.id} onMove={onMove} canMove={canMove}
            moveLabel={(item, fromCol) => (fromCol === 'new' ? p.n1 : p.n4)}
            renderCard={({ c, s }, { move, dragging }) => {
              // Sin título propio, el título es la referencia y el tema; con él, esos dos datos bajan a la segunda línea
              const own = !!c.title && !c.anonymized_at;
              const when = s.column === 'closed' ? (c.anonymized_at ? null : lower(fmt(p.closedOn, { date: fShort(c.answered_at ?? c.updated_at, lang) }))) : relDay(c.created_at, p);
              return (
                <CaseCard
                  lang={lang} to={`/admin/complaints/${c.id}`} linkState={{ from }}
                  title={own || c.anonymized_at ? caseTitle(c, tr) : <>{c.reference} <span className="ds-case-sep">·</span> {catName(c.category)}</>}
                  meta={[own ? c.reference : null, own ? catName(c.category) : null, c.is_anonymous ? p.anon : p.ident, when].filter(Boolean).join(' · ')}
                  deadline={s.deadline} overdue={s.overdue} done={s.done}
                  meeting={!!s.meeting?.pending} wrote={(c.unread ?? 0) > 0} priority={s.closed ? undefined : c.priority}
                  move={move} dragging={dragging}
                />
              );
            }}
          />
        </>
      )}

      <Dialog
        side open={filtering} onClose={() => setFiltering(false)} title={p.filters} closeLabel={p.close}
        actions={<>
          {active > 0 && <Button variant="soft" size="md" onClick={clear}>{p.clearFilters}</Button>}
          <Button variant="report" size="md" onClick={() => setFiltering(false)}>{p.done}</Button>
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
