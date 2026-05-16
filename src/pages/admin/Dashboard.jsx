import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signOutAdmin } from '../../lib/supabase.js';
import { useAdminAuth } from '../../contexts/AdminAuth.jsx';
import { exportToExcel, exportSummaryToPDF } from '../../lib/export.js';

const STATUS_LABELS = {
  received: 'Rebut', reviewing: 'En revisió', investigating: 'Investigant',
  waiting: 'Esperant', resolved: 'Resolt', closed: 'Tancat', archived: 'Arxivat',
};
const CATEGORY_LABELS = {
  fraud: 'Frau o corrupció', harassment: 'Assetjament', discrimination: 'Discriminació',
  safety: 'Seguretat laboral', data: 'Dades / RGPD', conflict: 'Conflicte interessos',
  accounting: 'Irregularitats comptables', environmental: 'Medi ambient', other: 'Altres',
};
const PRIORITY_LABELS = { low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica' };
const STATUS_ORDER = ['received','reviewing','investigating','waiting','resolved','closed','archived'];
const CATEGORIES   = Object.keys(CATEGORY_LABELS);

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon neutral">↕</span>;
  return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isSuperadmin, allowedCategories, profile } = useAdminAuth();

  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const PER_PAGE = 20;

  // Filters
  const [filters, setFilters] = useState({
    status: '', category: '', priority: '', dateFrom: '', dateTo: '',
  });

  // Sort
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => { load(); }, [filters, sortCol, sortDir, page]);

  async function load() {
    setLoading(true);

    let query = supabase
      .from('complaints')
      .select('*', { count: 'exact' })
      .order(sortCol, { ascending: sortDir === 'asc' })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    if (filters.status)   query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo)   query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    // Managers only see their allowed categories
    if (!isSuperadmin && allowedCategories) {
      if (allowedCategories.length === 0) {
        setComplaints([]); setTotal(0); setLoading(false); return;
      }
      query = query.in('category', allowedCategories);
    }

    const { data, count } = await query;
    setComplaints(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ status: '', category: '', priority: '', dateFrom: '', dateTo: '' });
    setPage(1);
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  }

  async function handleLogout() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const hasFilters = Object.values(filters).some(v => v !== '');

  const statsAll   = total;
  const statsOpen  = complaints.filter(c => ['received','reviewing','investigating','waiting'].includes(c.status)).length;
  const statsResolved = complaints.filter(c => ['resolved','closed'].includes(c.status)).length;

  const formatDate = iso => iso
    ? new Date(iso).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const SortTh = ({ col, label }) => (
    <th className="sortable-th" onClick={() => handleSort(col)}>
      {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><img src="/logo.png" alt="Reportia" /></div>
        <nav className="admin-nav">
          <div className="admin-nav-item active">🗂 Denúncies</div>
          {isSuperadmin && (
            <div className="admin-nav-item" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
              👥 Usuaris
            </div>
          )}
        </nav>
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-role">{isSuperadmin ? '⭐ Superadmin' : '👤 Gestor'}</div>
          <div className="admin-sidebar-email">{profile?.full_name || ''}</div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>↩ Tancar sessió</button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">Denúncies</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="admin-export-btn" onClick={() => exportToExcel(complaints)}>
              📊 Excel
            </button>
            <button className="admin-export-btn" onClick={() => exportSummaryToPDF(complaints, filters)}>
              📄 PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-num">{statsAll}</div>
            <div className="admin-stat-label">Total</div>
          </div>
          <div className="admin-stat-card open">
            <div className="admin-stat-num">{statsOpen}</div>
            <div className="admin-stat-label">Obertes</div>
          </div>
          <div className="admin-stat-card resolved">
            <div className="admin-stat-num">{statsResolved}</div>
            <div className="admin-stat-label">Resoltes</div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters-bar">
          <select className="admin-filter-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">Tots els estats</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          <select className="admin-filter-select" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
            <option value="">Totes les categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>

          <select className="admin-filter-select" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
            <option value="">Totes les prioritats</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <div className="admin-date-range">
            <input type="date" className="admin-filter-select" value={filters.dateFrom}
              onChange={e => setFilter('dateFrom', e.target.value)} title="Des de" />
            <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>
            <input type="date" className="admin-filter-select" value={filters.dateTo}
              onChange={e => setFilter('dateTo', e.target.value)} title="Fins a" />
          </div>

          {hasFilters && (
            <button className="admin-clear-btn" onClick={clearFilters}>✕ Netejar</button>
          )}

          <span className="admin-filter-count" style={{ marginLeft: 'auto' }}>{total} resultats</span>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading">⏳ Carregant...</div>
          ) : complaints.length === 0 ? (
            <div className="admin-empty">Cap denúncia trobada.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Codi</th>
                  <SortTh col="category"   label="Categoria" />
                  <SortTh col="status"     label="Estat" />
                  <SortTh col="priority"   label="Prioritat" />
                  <SortTh col="created_at" label="Data" />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/admin/complaints/${c.id}`)} className="admin-table-row">
                    <td><code className="admin-code">{c.tracking_code}</code></td>
                    <td>{CATEGORY_LABELS[c.category] ?? c.category}</td>
                    <td><span className={`admin-badge status-${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                    <td><span className={`admin-priority priority-${c.priority}`}>{PRIORITY_LABELS[c.priority]}</span></td>
                    <td className="admin-date">{formatDate(c.created_at)}</td>
                    <td><span className="admin-view-btn">Veure →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > PER_PAGE && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <span>Pàgina {page} de {Math.ceil(total / PER_PAGE)}</span>
            <button className="admin-page-btn" disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage(p => p + 1)}>Següent →</button>
          </div>
        )}
      </main>
    </div>
  );
}
