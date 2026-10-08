import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CircleAlert, FileSpreadsheet, FileText, LockKeyhole } from 'lucide-react';
import { listComplaints } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { STATUS_ORDER, OPEN, ANSWERED, deadlineInfo, daysBetween, localeOf } from '../admin/adminKit.jsx';
import { Button, Card, Field, Skeleton, cx } from '../ui/index.js';
import { usePanel, Tp } from './kit.jsx';

const BAR_MAX = 168; // altura, en px, de la barra del mes con más denuncias
const NONE = '–';

function median(values) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}
const count = (list, key) => list.reduce((m, c) => m.set(c[key], (m.get(c[key]) ?? 0) + 1), new Map());

/** Mes abreviado sin punto ni preposición («abr»), su inicial para el móvil y el nombre entero para la tabla */
function monthNames(year, month, lang) {
  const d = new Date(year, month, 1);
  const loc = localeOf(lang);
  const short = d.toLocaleDateString(loc, { month: 'short' }).replace(/^(de |d’|d')/, '').replace(/\.$/, '');
  const long = d.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  return { short, initial: short.charAt(0).toUpperCase(), long: long.charAt(0).toUpperCase() + long.slice(1) };
}

/**
 * Informe: el periodo de un vistazo. Cuatro cifras, las denuncias por mes y por tema en barras (con su
 * tabla para quien no las ve) y, debajo, el detalle de plazos y estados que ya tenía el informe anterior.
 * Cada persona ve solo las categorías que tiene asignadas.
 */
export default function Informe() {
  const { lang, t, tr, p, org, isSuperadmin, allowedCategories, notify } = usePanel();
  const r = p.rep;
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState('');
  const [exporting, setExporting] = useState('');

  const noAccess = !isSuperadmin && allowedCategories.length === 0;
  const catsKey = allowedCategories ? allowedCategories.join(',') : '*';
  const catName = (v) => tr.canal.cats[v]?.[0] ?? v;
  useEffect(() => { document.title = `${p.nav.report} · ${org?.name ?? ''}`; }, [p, org]);

  async function load() {
    setFailed(false);
    setRows(null);
    const { complaints, error } = await listComplaints({ categories: allowedCategories });
    if (error) { setFailed(true); setRows([]); return; }
    setRows(complaints ?? []);
  }
  useEffect(() => { if (!noAccess) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [catsKey]);

  const years = useMemo(() => [...new Set((rows ?? []).map(c => new Date(c.created_at).getFullYear()))].sort((a, b) => b - a), [rows]);
  // Por defecto, el año más reciente con denuncias
  useEffect(() => { if (period === '' && years.length) setPeriod(String(years[0])); }, [years, period]);
  const year = period && period !== 'all' ? Number(period) : null;

  const inPeriod = useMemo(
    () => (rows ?? []).filter(c => period === 'all' || period === '' || String(new Date(c.created_at).getFullYear()) === period),
    [rows, period],
  );

  const data = useMemo(() => {
    if (!rows) return null;
    const now = new Date();
    const info = inPeriod.map(c => ({ c, d: deadlineInfo(c, now) }));
    const answered = info.filter(x => ANSWERED.includes(x.c.status));
    const open = info.filter(x => OPEN.includes(x.c.status));
    const byCat = count(inPeriod, 'category');
    const byCatOpen = count(open.map(x => x.c), 'category');
    const byStatus = count(inPeriod, 'status');
    const late = answered.filter(x => x.d.resp.state === 'late').length;
    const openOverdue = open.filter(x => x.d.next.state === 'overdue').length;

    // Barras: los meses del año (del primero con denuncias al último, o hasta hoy), o los años si es todo el historial
    let series = [];
    if (year) {
      const perMonth = Array(12).fill(0);
      inPeriod.forEach(c => { perMonth[new Date(c.created_at).getMonth()] += 1; });
      const first = perMonth.findIndex(n => n > 0);
      const last = year === now.getFullYear() ? now.getMonth() : 11 - [...perMonth].reverse().findIndex(n => n > 0);
      if (first >= 0) for (let m = first; m <= Math.max(last, first); m += 1) series.push({ key: `${year}-${m}`, n: perMonth[m], ...monthNames(year, m, lang) });
    } else if (years.length) {
      const perYear = count(inPeriod.map(c => ({ y: new Date(c.created_at).getFullYear() })), 'y');
      for (let y = years[years.length - 1]; y <= years[0]; y += 1) series.push({ key: String(y), n: perYear.get(y) ?? 0, short: String(y), initial: `’${String(y).slice(2)}`, long: String(y) });
    }
    return {
      total: inPeriod.length,
      anonymous: inPeriod.filter(c => c.is_anonymous !== false).length,
      open: open.length,
      closed: answered.length,
      onTime: answered.filter(x => x.d.resp.state === 'met').length,
      late,
      openOverdue,
      missed: late + openOverdue,
      ackPending: open.filter(x => x.c.status === 'received').length,
      median: median(answered.map(x => Math.max(daysBetween(x.d.received, x.d.resp.at), 0))),
      byCat: [...byCat].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, n, open: byCatOpen.get(value) ?? 0 })),
      byStatus: STATUS_ORDER.filter(st => byStatus.has(st)).map(st => ({ value: st, n: byStatus.get(st) })),
      series,
    };
  }, [rows, inPeriod, year, years, lang]);

  const pct = (n, total) => (total ? new Intl.NumberFormat(localeOf(lang), { style: 'percent', maximumFractionDigits: 0 }).format(n / total) : NONE);

  async function doExport(kind) {
    if (exporting) return;
    setExporting(kind);
    // Las exportaciones llevan la referencia interna, nunca el código de quien informa
    const list = inPeriod.map(c => ({ ...c, tracking_code: c.reference, organization: org?.name ?? '' }));
    try {
      const { exportToExcel, exportSummaryToPDF } = await import('../lib/exportV2.js');
      const filters = { view: '', status: '', category: '', priority: '', dateFrom: year ? `${year}-01-01` : '', dateTo: year ? `${year}-12-31` : '', q: '', organization: org?.name ?? '' };
      if (kind === 'xlsx') await exportToExcel(list, undefined, lang, filters);
      else await exportSummaryToPDF(list, filters, lang);
    } catch { notify(p.exportErr, 'err'); }
    setExporting('');
  }

  if (noAccess) {
    return (
      <div className="pn-page">
        <Card tone="bg" className="pn-empty"><LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" /><h1 className="pn-empty-t">{t.noAccessTitle}</h1><p>{t.noAccessText}</p></Card>
      </div>
    );
  }

  const loading = rows === null;
  const ready = !loading && !failed && data.total > 0;
  const maxBar = ready ? Math.max(...data.series.map(s => s.n), 0) : 0;
  const maxCat = ready ? Math.max(...data.byCat.map(c => c.n), 0) : 0;
  const dense = ready && data.series.length > 8;
  const listHref = year ? `/admin?from=${year}-01-01&to=${year}-12-31` : '/admin';

  return (
    <div className="pn-page rp">
      <div className="pn-top">
        <div className="rp-title">
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => (period === 'all' ? x.rep.titleAll : fmt(x.rep.title, { year: year ?? new Date().getFullYear() }))} />
          {years.length > 0 && (
            <Field as="select" size="sm" className="rp-period" label={r.period} hideLabel value={period} onChange={e => setPeriod(e.target.value)}>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              <option value="all">{r.all}</option>
            </Field>
          )}
        </div>
        <div className="pn-actions rp-exports">
          <Button variant="bg" size="sm" disabled={!ready} busy={exporting === 'xlsx'} onClick={() => doExport('xlsx')} icon={<FileSpreadsheet size={16} strokeWidth={2.2} aria-hidden="true" />}>{r.xls}</Button>
          <Button variant="ink" size="sm" disabled={!ready} busy={exporting === 'pdf'} onClick={() => doExport('pdf')} icon={<FileText size={16} strokeWidth={2.2} aria-hidden="true" />}>{r.pdf}</Button>
        </div>
      </div>

      {failed ? (
        <div className="pn-error" role="alert"><CircleAlert size={20} strokeWidth={2.2} aria-hidden="true" /><span>{p.loadErr}</span><Button variant="white" size="xs" onClick={load}>{p.retry}</Button></div>
      ) : loading ? (
        <div role="status" aria-live="polite" className="rp-loading">
          <span className="ds-vh">{p.loading}</span>
          <div className="rp-figs" aria-hidden="true">{[0, 1, 2, 3].map(i => <Skeleton key={i} height={112} />)}</div>
          <div className="rp-charts" aria-hidden="true"><Skeleton height={300} /><Skeleton height={300} /></div>
        </div>
      ) : data.total === 0 ? (
        <Card tone="bg" className="pn-empty">
          <BarChart3 size={28} strokeWidth={1.7} aria-hidden="true" />
          <h2 className="pn-empty-t">{years.length ? r.emptyTitle : p.emptyTitle}</h2>
          <p>{years.length ? r.emptyText : fmt(p.emptyText, { org: org?.name ?? '' })}</p>
        </Card>
      ) : (
        <>
          <dl className="rp-figs">
            <div className="rp-fig is-report"><dt>{r.received}</dt><dd>{data.total}</dd></div>
            <div className="rp-fig"><dt>{r.onTime}</dt><dd>{data.onTime} <small>{fmt(r.of, { total: data.closed })}</small></dd></div>
            <div className="rp-fig"><dt>{r.anonymous}</dt><dd>{pct(data.anonymous, data.total)}</dd></div>
            <div className={cx('rp-fig', data.missed > 0 && 'is-danger')}><dt>{r.missed}</dt><dd>{data.missed}</dd></div>
          </dl>

          <div className="rp-charts">
            <Card as="section" tone="bg" className="rp-card" aria-labelledby="rp-series">
              <h2 className="ds-card-title" id="rp-series">{year ? r.byMonth : r.byYear}</h2>
              <div className={cx('rp-bars', dense && 'is-dense')} style={{ '--n': data.series.length }} aria-hidden="true">
                {data.series.map(s => (
                  <div key={s.key} className={cx('rp-bar', s.n === maxBar && 'is-max')}>
                    <b>{s.n}</b>
                    <i style={{ height: Math.max(Math.round((s.n / maxBar) * BAR_MAX), 4) }} />
                    <span className={dense ? 'ds-wide' : undefined}>{s.short}</span>
                    {dense && <span className="ds-narrow">{s.initial}</span>}
                  </div>
                ))}
              </div>
              <table className="ds-vh">
                <caption>{year ? r.byMonth : r.byYear}</caption>
                <thead><tr><th scope="col">{year ? r.colMonth : r.colYear}</th><th scope="col">{r.colCount}</th><th scope="col">{r.colShare}</th></tr></thead>
                <tbody>{data.series.map(s => <tr key={s.key}><th scope="row">{s.long}</th><td>{s.n}</td><td>{pct(s.n, data.total)}</td></tr>)}</tbody>
              </table>
            </Card>

            <Card as="section" tone="bg" className="rp-card" aria-labelledby="rp-topics">
              <h2 className="ds-card-title" id="rp-topics">{r.byTopic}</h2>
              <div className="rp-topics" aria-hidden="true">
                {data.byCat.map(c => (
                  <React.Fragment key={c.value}>
                    <span>{catName(c.value)}</span>
                    <i className={c.n === maxCat ? 'is-max' : undefined} style={{ width: `${Math.max((c.n / maxCat) * 100, 3)}%` }} />
                    <b>{c.n}</b>
                  </React.Fragment>
                ))}
              </div>
              <table className="ds-vh">
                <caption>{r.byTopic}</caption>
                <thead><tr><th scope="col">{r.colTopic}</th><th scope="col">{r.colCount}</th><th scope="col">{r.colShare}</th><th scope="col">{r.colOpen}</th></tr></thead>
                <tbody>{data.byCat.map(c => <tr key={c.value}><th scope="row">{catName(c.value)}</th><td>{c.n}</td><td>{pct(c.n, data.total)}</td><td>{c.open}</td></tr>)}</tbody>
                <tfoot><tr><th scope="row">{r.total}</th><td>{data.total}</td><td>{pct(data.total, data.total)}</td><td>{data.open}</td></tr></tfoot>
              </table>
            </Card>
          </div>

          <div className="rp-charts">
            <Card as="section" tone="bg" className="rp-card" aria-labelledby="rp-detail">
              <h2 className="ds-card-title" id="rp-detail">{r.detail}</h2>
              <dl className="rp-facts">
                <div><dt>{r.open}</dt><dd>{data.open}</dd></div>
                <div><dt>{r.closed}</dt><dd>{data.closed}</dd></div>
                <div className={data.late ? 'is-danger' : undefined}><dt>{r.late}</dt><dd>{data.late}</dd></div>
                <div className={data.openOverdue ? 'is-danger' : undefined}><dt>{r.openOverdue}</dt><dd>{data.openOverdue}</dd></div>
                <div><dt>{r.ackPending}</dt><dd>{data.ackPending}</dd></div>
                <div><dt>{r.median}</dt><dd>{data.median ?? NONE}</dd></div>
              </dl>
              <p className="rp-note">{r.medianNote}</p>
            </Card>

            <Card as="section" tone="bg" className="rp-card" aria-labelledby="rp-status">
              <h2 className="ds-card-title" id="rp-status">{r.byStatus}</h2>
              <table className="rp-table">
                <thead><tr><th scope="col">{r.colStatus}</th><th scope="col">{r.colCount}</th><th scope="col">{r.colShare}</th></tr></thead>
                <tbody>{data.byStatus.map(s => <tr key={s.value}><th scope="row">{t.status[s.value] ?? s.value}</th><td>{s.n}</td><td>{pct(s.n, data.total)}</td></tr>)}</tbody>
              </table>
            </Card>
          </div>

          <Button variant="bg" size="sm" className="rp-see" to={listHref} iconEnd={<ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />}>{r.seeList}</Button>
        </>
      )}
    </div>
  );
}
