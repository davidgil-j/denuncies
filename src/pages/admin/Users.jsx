import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProfiles, getManagerPermissions, setManagerPermissions, inviteManager, deleteManager, signOutAdmin } from '../../lib/supabase.js';
import { useAdminAuth } from '../../contexts/AdminAuth.jsx';

const CATEGORIES = [
  { value: 'fraud',          label: 'Frau o corrupció' },
  { value: 'harassment',     label: 'Assetjament' },
  { value: 'discrimination', label: 'Discriminació' },
  { value: 'safety',         label: 'Seguretat laboral' },
  { value: 'data',           label: 'Dades / RGPD' },
  { value: 'conflict',       label: 'Conflicte interessos' },
  { value: 'accounting',     label: 'Irregularitats comptables' },
  { value: 'environmental',  label: 'Medi ambient' },
  { value: 'other',          label: 'Altres' },
];

const PERM_COLS = [
  { key: 'can_view',   label: 'Veure' },
  { key: 'can_edit',   label: 'Editar' },
  { key: 'can_reply',  label: 'Respondre' },
  { key: 'can_delete', label: 'Eliminar' },
];

function emptyPerms() {
  return CATEGORIES.map(c => ({
    category: c.value, can_view: false, can_edit: false, can_reply: false, can_delete: false,
  }));
}

export default function Users() {
  const navigate = useNavigate();
  const { isSuperadmin } = useAdminAuth();

  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null); // manager being edited
  const [perms, setPerms]         = useState(emptyPerms());
  const [saving, setSaving]       = useState(false);
  const [feedback, setFeedback]   = useState(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail]     = useState('');
  const [invName, setInvName]       = useState('');
  const [inviting, setInviting]     = useState(false);
  const [invError, setInvError]     = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, full_name, email }
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    if (!isSuperadmin) { navigate('/admin'); return; }
    loadProfiles();
  }, [isSuperadmin]);

  async function loadProfiles() {
    setLoading(true);
    const { profiles: p } = await getAllProfiles();
    setProfiles(p);
    setLoading(false);
  }

  async function selectManager(profile) {
    setSelected(profile);
    const { permissions } = await getManagerPermissions(profile.id);
    const merged = emptyPerms().map(ep => {
      const existing = permissions.find(p => p.category === ep.category);
      return existing ? { ...ep, ...existing } : ep;
    });
    setPerms(merged);
  }

  function togglePerm(catIdx, permKey) {
    setPerms(prev => prev.map((p, i) => i === catIdx ? { ...p, [permKey]: !p[permKey] } : p));
  }

  function toggleAllCat(catIdx) {
    const allOn = PERM_COLS.every(col => perms[catIdx][col.key]);
    setPerms(prev => prev.map((p, i) => i === catIdx
      ? { ...p, can_view: !allOn, can_edit: !allOn, can_reply: !allOn, can_delete: !allOn }
      : p
    ));
  }

  function toggleAllPerm(permKey) {
    const allOn = perms.every(p => p[permKey]);
    setPerms(prev => prev.map(p => ({ ...p, [permKey]: !allOn })));
  }

  async function savePerms() {
    setSaving(true);
    const activePerms = perms.filter(p => p.can_view || p.can_edit || p.can_reply || p.can_delete);
    const { error } = await setManagerPermissions(selected.id, activePerms);
    setSaving(false);
    if (error) setFeedback({ ok: false, text: 'Error en guardar els permisos.' });
    else { setFeedback({ ok: true, text: 'Permisos guardats correctament.' }); setTimeout(() => setFeedback(null), 3000); }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInvError('');
    setInviting(true);
    const { error } = await inviteManager(invEmail, invName);
    setInviting(false);
    if (error) setInvError('Error en enviar la invitació: ' + error.message);
    else {
      setShowInvite(false); setInvEmail(''); setInvName('');
      setFeedback({ ok: true, text: `Invitació enviada a ${invEmail}.` });
      setTimeout(() => { setFeedback(null); loadProfiles(); }, 3000);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteManager(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      setFeedback({ ok: false, text: 'Error en eliminar el gestor: ' + error.message });
    } else {
      if (selected?.id === deleteTarget.id) setSelected(null);
      setFeedback({ ok: true, text: `Gestor eliminat correctament.` });
      setTimeout(() => { setFeedback(null); loadProfiles(); }, 2000);
    }
  }

  async function handleLogout() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const formatDate = iso => iso ? new Date(iso).toLocaleDateString('ca-ES') : '—';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><span className="admin-wordmark">Reportia</span></div>
        <nav className="admin-nav">
          <div className="admin-nav-item" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>🗂 Denúncies</div>
          <div className="admin-nav-item active">Usuaris</div>
          <div className="admin-nav-item" onClick={() => navigate('/admin/mfa')} style={{ cursor: 'pointer' }}>🔐 Seguretat</div>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>Tancar sessió</button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">Gestió d'usuaris</h1>
          <button className="btn btn-primary" style={{ marginLeft: 'auto', padding: '10px 20px', fontSize: 13 }}
            onClick={() => setShowInvite(true)}>
            + Convidar gestor
          </button>
        </div>

        {feedback && (
          <div className={`msg-feedback ${feedback.ok ? 'ok' : 'err'}`} style={{ marginBottom: 16 }}>
            {feedback.text}
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div className="admin-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
            <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <h2 className="admin-modal-title">Eliminar gestor</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '12px 0 24px', lineHeight: 1.6 }}>
                Segur que vols eliminar <strong>{deleteTarget.full_name || deleteTarget.email}</strong>?
                Aquesta acció no es pot desfer i s'eliminaran tots els seus permisos.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ flex: 1, padding: 12 }}
                >
                  Cancel·lar
                </button>
                <button
                  className="btn"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ flex: 1, padding: 12, background: 'var(--danger, #dc2626)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  {deleting ? 'Eliminant...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite modal */}
        {showInvite && (
          <div className="admin-modal-overlay" onClick={() => setShowInvite(false)}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
              <h2 className="admin-modal-title">Convidar nou gestor</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                S'enviarà un correu amb l'enllaç per establir la contrasenya.
              </p>
              <form onSubmit={handleInvite}>
                <div className="field">
                  <label className="field-label">Nom complet</label>
                  <input className="field-input" type="text" value={invName}
                    onChange={e => setInvName(e.target.value)} placeholder="Anna García" required />
                </div>
                <div className="field">
                  <label className="field-label">Correu electrònic</label>
                  <input className="field-input" type="email" value={invEmail}
                    onChange={e => setInvEmail(e.target.value)} placeholder="gestor@empresa.com" required />
                </div>
                {invError && <div className="admin-login-error">⚠️ {invError}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={inviting} style={{ flex: 1, padding: 12 }}>
                    {inviting ? 'Enviant...' : 'Enviar invitació'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)} style={{ flex: 1, padding: 12 }}>
                    Cancel·lar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="admin-users-grid">
          {/* Left: user list */}
          <div className="admin-section">
            <div className="admin-section-title">Usuaris ({profiles.length})</div>
            {loading ? (
              <div className="admin-loading" style={{ padding: 24 }}>⏳</div>
            ) : (
              <div className="admin-user-list">
                {profiles.map(p => (
                  <div
                    key={p.id}
                    className={`admin-user-item ${selected?.id === p.id ? 'active' : ''}`}
                    onClick={() => p.role === 'manager' ? selectManager(p) : null}
                    style={{ cursor: p.role === 'manager' ? 'pointer' : 'default' }}
                  >
                    <div className="admin-user-avatar">
                      {(p.full_name || p.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="admin-user-info">
                      <div className="admin-user-name">{p.full_name || '—'}</div>
                      <div className="admin-user-email">{p.email}</div>
                    </div>
                    <span className={`admin-role-badge ${p.role}`}>
                      {p.role === 'superadmin' ? '⭐ Superadmin' : '👤 Gestor'}
                    </span>
                    {p.role === 'manager' && (
                      <button
                        title="Eliminar gestor"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        style={{ background: 'none', border: '1px solid var(--danger, #dc2626)', cursor: 'pointer', color: 'var(--danger, #dc2626)', fontSize: 11, padding: '2px 8px', borderRadius: 4, marginLeft: 4, opacity: 0.7, fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: permissions */}
          <div className="admin-section">
            {!selected ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                Selecciona un gestor per editar els seus permisos.
              </div>
            ) : (
              <>
                <div className="admin-section-title">
                  Permisos de {selected.full_name || selected.email}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table admin-perms-table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        {PERM_COLS.map(col => (
                          <th key={col.key} className="perm-col-header" onClick={() => toggleAllPerm(col.key)} title="Clic per activar/desactivar tots">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map((cat, i) => (
                        <tr key={cat.value} className="admin-table-row" onClick={() => toggleAllCat(i)}>
                          <td style={{ fontWeight: 600 }}>{cat.label}</td>
                          {PERM_COLS.map(col => (
                            <td key={col.key} style={{ textAlign: 'center' }} onClick={e => { e.stopPropagation(); togglePerm(i, col.key); }}>
                              <input type="checkbox" checked={perms[i][col.key]} onChange={() => togglePerm(i, col.key)}
                                style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-light)', margin: '8px 0 16px' }}>
                  Clic a una fila per activar/desactivar tota la categoria · Clic a la capçalera per activar/desactivar tota la columna
                </p>

                {feedback && (
                  <div className={`msg-feedback ${feedback.ok ? 'ok' : 'err'}`} style={{ marginBottom: 12 }}>
                    {feedback.text}
                  </div>
                )}

                <button className="btn btn-primary" style={{ width: '100%', padding: 13 }}
                  onClick={savePerms} disabled={saving}>
                  {saving ? '⏳ Guardant...' : '💾 Guardar permisos'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
