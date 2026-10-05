import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Info, LockKeyhole } from 'lucide-react';
import { listComplaints } from '../../lib/supabase.js';
import { ICON, fmt } from '../V2Layout.jsx';
import {
  useAdmin, L, Select, Empty, StatusPill, STATUS_ORDER, OPEN, ANSWERED, deadlineInfo, daysBetween, localeOf, catLabel,
} from './adminKit.jsx';

const pct = (n, total, lang) => (total ? new Intl.NumberFormat(localeOf(lang), { style: 'percent', maximumFractionDigits: 0 }).format(n / total) : '');
function median(values) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

/** Resum de les denúncies d'un període: volum, terminis legals i repartiment per categoria, estat i mes */
export default function V2Report() {
  const { t, tr, lang, allowedCategories } = useAdmin();
  const [rows, setRows] = useState(null);
  const [period, setPeriod] = useState('');

  useEffect(() => { document.title = `${t.rTitle} · ${t.panelName}`; }, [t]);

  const noAccess = allowedCategories !== null && allowedCategories.length === 0;
  useEffect(() => {
    if (noAccess) { setRows([]); return undefined; }
    let alive = true;
    listComplaints({ categories: allowedCategories }).then(({ complaints }) => { if (alive) setRows(complaints ?? []); });
    return () => { alive = false; };
  }, [allowedCategories, noAccess]);

  const years = useMemo(
    () => [...new Set((rows ?? []).map(c => new Date(c.created_at).getFullYear()))].sort((a, b) => b - a),
    [rows],
  );
  // Per defecte, l'any més recent amb denúncies
  useEffect(() => { if (period === '' && years.length) setPeriod(String(years[0])); }, [years, period]);

  const data = useMemo(() => {
    if (!rows) return null;
    const now = new Date();
    const inPeriod = rows.filter(c => period === 'all' || period === '' || String(new Date(c.created_at).getFullYear()) === period);
    const info = inPeriod.map(c => ({ c, d: deadlineInfo(c, now) }));
    const answered = info.filter(x => ANSWERED.includes(x.c.status));
    const open = info.filter(x => OPEN.includes(x.c.status));
    const count = (list, key) => list.reduce((m, c) => m.set(c[key], (m.get(c[key]) ?? 0) + 1), new Map());
    const byCat = count(inPeriod, 'category');
    const byCatOpen = count(open.map(x => x.c), 'category');
    const byStatus = count(inPeriod, 'status');
    const months = new Map();
    for (const c of inPeriod) {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.set(key, (months.get(key) ?? 0) + 1);
    }
    return {
      total: inPeriod.length,
      anonymous: inPeriod.filter(c => c.is_anonymous !== false).length,
      open: open.length,
      closed: answered.length,
      onTime: answered.filter(x => x.d.resp.state === 'met').length,
      late: answered.filter(x => x.d.resp.state === 'late').length,
      openOverdue: open.filter(x => x.d.next.state === 'overdue').length,
      ackPending: open.filter(x => x.c.status === 'received').length,
      median: median(answered.map(x => Math.max(daysBetween(x.d.received, x.d.resp.at), 0))),
      byCat: [...byCat].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, n, open: byCatOpen.get(value) ?? 0 })),
      byStatus: STATUS_ORDER.filter(st => byStatus.has(st)).map(st => ({ value: st, n: byStatus.get(st) })),
      byMonth: [...months].sort((a, b) => a[0].localeCompare(b[0])).map(([key, n]) => ({ key, n })),
    };
  }, [rows, period]);

  const monthName = (key) => {
    const [y, m] = key.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString(localeOf(lang), { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const listHref = period && period !== 'all' ? `/admin?v=all&from=${period}-01-01&to=${period}-12-31` : '/admin?v=all';
  const loading = rows === null;

  return (
    <div className="v2-page">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <L as="h1" className="v2-ph-title" k="rTitle" />
          <L as="p" className="v2-ph-lead" k="rLead" />
        </div>
        {!noAccess && years.length > 0 && (
          <div className="v2-ph-actions">
            <Select
              label={t.rPeriod} hideLabel value={period} onChange={setPeriod}
              options={[...years.map(y => ({ value: String(y), label: fmt(t.rYear, { y }) })), { value: 'all', label: t.rAll }]}
            />
          </div>
        )}
      </header>

      {noAccess ? (
        <Empty icon={LockKeyhole} title={t.noAccessTitle}>{t.noAccessText}</Empty>
      ) : loading ? (
        <div className="v2-stats" aria-hidden="true">
          {[0, 1, 2, 3].map(i => <div className="v2-stat" key={i}><span className="v2-skel" style={{ width: 90 }} /><span className="v2-skel is-num" /></div>)}
        </div>
      ) : data.total === 0 ? (
        <Empty icon={BarChart3} title={t.rEmptyTitle}>{t.rEmptyText}</Empty>
      ) : (
        <>
          <dl className="v2-stats">
            <div className="v2-stat"><L as="dt" k="rReceived" /><dd className="v2-num">{data.total}</dd></div>
            <div className="v2-stat"><L as="dt" k="rAnonymous" /><dd className="v2-num">{data.anonymous}<small>{pct(data.anonymous, data.total, lang)}</small></dd></div>
            <div className="v2-stat"><L as="dt" k="rOpen" /><dd className="v2-num">{data.open}</dd></div>
            <div className="v2-stat"><L as="dt" k="rClosed" /><dd className="v2-num">{data.closed}</dd></div>
          </dl>

          <div className="v2-report-grid">
            <section className="v2-sec" aria-labelledby="v2-r-dl">
              <L as="h2" className="v2-sec-h" id="v2-r-dl" k="rDeadlines" />
              <dl className="v2-rlist">
                <div><L as="dt" k="rOnTime" /><dd className="v2-num">{data.closed ? fmt(t.rOf, { n: data.onTime, total: data.closed }) : t.rNone}</dd></div>
                <div className={data.late ? 'is-danger' : undefined}><L as="dt" k="rLate" /><dd className="v2-num">{data.late}</dd></div>
                <div className={data.openOverdue ? 'is-danger' : undefined}><L as="dt" k="rOpenOverdue" /><dd className="v2-num">{data.openOverdue}</dd></div>
                <div><L as="dt" k="rAckPending" /><dd className="v2-num">{data.ackPending}</dd></div>
                <div><L as="dt" k="rMedian" /><dd className="v2-num">{data.median ?? t.rNone}</dd></div>
              </dl>
              <p className="v2-sec-empty"><Info {...ICON} /><L k="rMedianNote" /></p>
            </section>

            <section className="v2-sec" aria-labelledby="v2-r-st">
              <L as="h2" className="v2-sec-h" id="v2-r-st" k="rByStatus" />
              <table className="v2-rtable">
                <thead><tr><th scope="col"><L k="rColStatus" /></th><th scope="col" className="is-n"><L k="rColCount" /></th><th scope="col" className="is-n"><L k="rColShare" /></th></tr></thead>
                <tbody>
                  {data.byStatus.map(r => (
                    <tr key={r.value}><th scope="row"><StatusPill status={r.value} t={t} /></th><td className="is-n v2-num">{r.n}</td><td className="is-n v2-num">{pct(r.n, data.total, lang)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="v2-sec" aria-labelledby="v2-r-cat">
            <L as="h2" className="v2-sec-h" id="v2-r-cat" k="rByCategory" />
            <table className="v2-rtable">
              <thead><tr><th scope="col"><L k="rColCategory" /></th><th scope="col" className="is-n"><L k="rColCount" /></th><th scope="col" className="is-n"><L k="rColShare" /></th><th scope="col" className="is-n"><L k="rColOpen" /></th></tr></thead>
              <tbody>
                {data.byCat.map(r => (
                  <tr key={r.value}><th scope="row">{catLabel(tr, r.value)}</th><td className="is-n v2-num">{r.n}</td><td className="is-n v2-num">{pct(r.n, data.total, lang)}</td><td className="is-n v2-num">{r.open}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row"><L k="rTotal" /></th><td className="is-n v2-num">{data.total}</td><td className="is-n v2-num">{pct(data.total, data.total, lang)}</td><td className="is-n v2-num">{data.open}</td></tr></tfoot>
            </table>
          </section>

          <section className="v2-sec" aria-labelledby="v2-r-mo">
            <L as="h2" className="v2-sec-h" id="v2-r-mo" k="rByMonth" />
            <table className="v2-rtable">
              <thead><tr><th scope="col"><L k="rColMonth" /></th><th scope="col" className="is-n"><L k="rColCount" /></th><th scope="col" className="is-n"><L k="rColShare" /></th></tr></thead>
              <tbody>
                {data.byMonth.map(r => (
                  <tr key={r.key}><th scope="row">{monthName(r.key)}</th><td className="is-n v2-num">{r.n}</td><td className="is-n v2-num">{pct(r.n, data.total, lang)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="v2-report-foot">
            <Link className="v2-btn v2-btn-secondary v2-btn-sm icon-trail" to={listHref}><L k="rSeeList" /><ArrowRight {...ICON} /></Link>
          </p>
        </>
      )}
    </div>
  );
}
