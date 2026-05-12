import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllComplaints, signOutAdmin } from '../../lib/supabase.js';

const STATUS_LABELS = {
  received:      'Rebut',
  reviewing:     'En revisió',
  investigating: 'Investigant',
  waiting:       'Esperant',
  resolved:      'Resolt',
  closed:        'Tancat',
  archived:      'Arxivat',
};

const CATEGORY_LABELS = {
  fraud:          'Frau o corrupció',
  harassment:     'Assetjament',
  discrimination: 'Discriminació',
  safety:         'Seguretat laboral',
  data:           'Dades / RGPD',
  conflict:       'Conflicte interessos',
  accounting:     'Irregularitats comptables',
  environmental:  'Medi ambient',
  other:          'Altres',
};

const STATUS_ORDER = ['received', 'reviewing', 'investigating', 'waiting', 'resolved', 'closed', 'archived'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]             = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    load();
  }, [statusFilter, page]);

  async function load() {
    setLoading(true);
    const { data, count } = await getAllComplaints({ status: statusFilter || undefined, page, limit: PER_PAGE });
    setComplaints(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  async function handleLogout() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const stats = {
    total: total,
    open: complaints.filter(c => ['received','reviewing','investigating','waiting'].includes(c.status)).length,
    resolved: complaints.filter(c => ['resolved','closed'].includes(c.status)).length,
  };

  const formatDate = iso => iso
    ? new Date(iso).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <img src="/logo.png" alt="Reportia" />
        </div>
        <nav className="admin-nav">
          <div className="admin-nav-item active">🗂 Denúncies</div>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>
          ↩ Tancar sessió
        </button>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">Canal Ètic · Denúncies</h1>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-num">{total}</div>
            <div className="admin-stat-label">Total</div>
          </div>
          <div className="admin-stat-card open">
            <div className="admin-stat-num">{stats.open}</div>
            <div className="admin-stat-label">Obertes</div>
          </div>
          <div className="admin-stat-card resolved">
            <div className="admin-stat-num">{stats.resolved}</div>
            <div className="admin-stat-label">Resoltes</div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tots els estats</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <span className="admin-filter-count">{total} resultats</span>
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
                  <th>Categoria</th>
                  <th>Estat</th>
                  <th>Prioritat</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/admin/complaints/${c.id}`)} className="admin-table-row">
                    <td><code className="admin-code">{c.tracking_code}</code></td>
                    <td>{CATEGORY_LABELS[c.category] ?? c.category}</td>
                    <td><span className={`admin-badge status-${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                    <td><span className={`admin-priority priority-${c.priority}`}>{c.priority}</span></td>
                    <td className="admin-date">{formatDate(c.created_at)}</td>
                    <td><span className="admin-view-btn">Veure →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
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
