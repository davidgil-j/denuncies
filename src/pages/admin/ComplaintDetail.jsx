import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getComplaintById, getMessages, sendMessage, updateComplaintStatus, signOutAdmin } from '../../lib/supabase.js';

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
  fraud: 'Frau o corrupció', harassment: 'Assetjament', discrimination: 'Discriminació',
  safety: 'Seguretat laboral', data: 'Dades / RGPD', conflict: 'Conflicte interessos',
  accounting: 'Irregularitats comptables', environmental: 'Medi ambient', other: 'Altres',
};

const PRIORITY_LABELS = { low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica' };

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [draft, setDraft]         = useState('');
  const [sending, setSending]     = useState(false);
  const [statusDraft, setStatusDraft]   = useState('');
  const [priorityDraft, setPriorityDraft] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusNote, setStatusNote]     = useState('');
  const [feedback, setFeedback] = useState(null);
  const bottomRef = useRef();

  useEffect(() => { loadAll(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadAll() {
    setLoading(true);
    const [{ complaint: c }, { messages: msgs }] = await Promise.all([
      getComplaintById(id),
      getMessages(id),
    ]);
    setComplaint(c);
    setStatusDraft(c?.status ?? '');
    setPriorityDraft(c?.priority ?? 'normal');
    setMessages(msgs);
    setLoading(false);
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await sendMessage(id, text, 'manager');
    setSending(false);
    if (!error) {
      setDraft('');
      const { messages: msgs } = await getMessages(id);
      setMessages(msgs);
    }
  }

  async function handleStatusSave() {
    const statusChanged   = statusDraft && statusDraft !== complaint.status;
    const priorityChanged = priorityDraft && priorityDraft !== complaint.priority;
    if (!statusChanged && !priorityChanged) return;

    setStatusSaving(true);
    await updateComplaintStatus(id, statusDraft, statusNote || null, priorityDraft);
    setStatusSaving(false);
    setStatusNote('');
    setFeedback('Canvis guardats correctament.');
    setTimeout(() => setFeedback(null), 3000);
    setComplaint(c => ({ ...c, status: statusDraft, priority: priorityDraft }));
  }

  async function handleLogout() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const formatDate = iso => iso
    ? new Date(iso).toLocaleString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const formatShort = iso => iso
    ? new Date(iso).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  if (loading) return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><img src="/logo.png" alt="Reportia" /></div>
        <button className="admin-logout-btn" onClick={handleLogout}>Tancar sessió</button>
      </aside>
      <main className="admin-main"><div className="admin-loading" style={{ margin: 48 }}>Carregant...</div></main>
    </div>
  );

  if (!complaint) return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><img src="/logo.png" alt="Reportia" /></div>
        <button className="admin-logout-btn" onClick={handleLogout}>Tancar sessió</button>
      </aside>
      <main className="admin-main"><div className="admin-empty" style={{ margin: 48 }}>Denúncia no trobada.</div></main>
    </div>
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><img src="/logo.png" alt="Reportia" /></div>
        <nav className="admin-nav">
          <div className="admin-nav-item" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>Denúncies</div>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>Tancar sessió</button>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-topbar">
          <button className="admin-back-btn" onClick={() => navigate('/admin')}>← Tornar</button>
          <h1 className="admin-page-title">
            <code>{complaint.tracking_code}</code>
            <span className={`admin-badge status-${complaint.status}`} style={{ marginLeft: 12 }}>
              {STATUS_LABELS[complaint.status]}
            </span>
          </h1>
        </div>

        <div className="admin-detail-grid">
          {/* Left: info + status */}
          <div className="admin-detail-left">

            {/* Info card */}
            <div className="admin-section">
              <div className="admin-section-title">Informació de la denúncia</div>
              <div className="admin-info-grid">
                <div className="admin-info-row">
                  <span className="admin-info-key">Categoria</span>
                  <span className="admin-info-val">{CATEGORY_LABELS[complaint.category] ?? complaint.category}</span>
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-key">Modalitat</span>
                  <span className="admin-info-val">{complaint.is_anonymous ? 'Anònim' : 'Identificat'}</span>
                </div>
                {!complaint.is_anonymous && complaint.reporter_name && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Denunciant</span>
                    <span className="admin-info-val">{complaint.reporter_name}</span>
                  </div>
                )}
                {!complaint.is_anonymous && complaint.reporter_email && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Correu</span>
                    <span className="admin-info-val">{complaint.reporter_email}</span>
                  </div>
                )}
                {!complaint.is_anonymous && complaint.reporter_phone && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Telèfon</span>
                    <span className="admin-info-val">{complaint.reporter_phone}</span>
                  </div>
                )}
                {complaint.department && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Departament</span>
                    <span className="admin-info-val">{complaint.department}</span>
                  </div>
                )}
                {complaint.incident_date && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Data incident</span>
                    <span className="admin-info-val">{complaint.incident_date}</span>
                  </div>
                )}
                {complaint.involved_people && (
                  <div className="admin-info-row">
                    <span className="admin-info-key">Implicats</span>
                    <span className="admin-info-val">{complaint.involved_people}</span>
                  </div>
                )}
                <div className="admin-info-row">
                  <span className="admin-info-key">Prioritat</span>
                  <span className={`admin-priority priority-${complaint.priority}`}>{PRIORITY_LABELS[complaint.priority]}</span>
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-key">Rebuda</span>
                  <span className="admin-info-val">{formatDate(complaint.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="admin-section">
              <div className="admin-section-title">Descripció dels fets</div>
              <p className="admin-description">{complaint.description}</p>
            </div>

            {/* Attachments */}
            {complaint.attachments?.length > 0 && (
              <div className="admin-section">
                <div className="admin-section-title">Arxius adjunts ({complaint.attachments.length})</div>
                <div className="admin-attachments">
                  {complaint.attachments.map(a => (
                    <div key={a.id} className="admin-attachment">
                      <span></span>
                      <span>{a.filename}</span>
                      <span className="admin-attachment-size">
                        {a.file_size ? (a.file_size / 1024).toFixed(0) + ' KB' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status change */}
            <div className="admin-section">
              <div className="admin-section-title">Canviar estat i prioritat</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="field-label" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Estat</label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={statusDraft}
                    onChange={e => setStatusDraft(e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Prioritat</label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={priorityDraft}
                    onChange={e => setPriorityDraft(e.target.value)}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                className="msg-input"
                placeholder="Nota interna (opcional)..."
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                rows={2}
                style={{ marginTop: 8 }}
              />
              {feedback && <div className="msg-feedback ok" style={{ marginTop: 8 }}>{feedback}</div>}
              <button
                className="btn btn-primary"
                style={{ marginTop: 10, width: '100%' }}
                onClick={handleStatusSave}
                disabled={statusSaving || statusDraft === complaint.status}
              >
                {statusSaving ? 'Guardant...' : 'Guardar estat'}
              </button>
            </div>
          </div>

          {/* Right: messages */}
          <div className="admin-detail-right">
            <div className="admin-section" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="admin-section-title">Missatges amb el denunciant</div>

              <div className="msg-thread" style={{ flex: 1 }}>
                {messages.length === 0 ? (
                  <div className="msg-empty">Encara no hi ha missatges.</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`msg-bubble-wrap ${msg.sender}`}>
                      <div className={`msg-bubble ${msg.sender}`}>
                        <div className="msg-sender">{msg.sender === 'reporter' ? 'Denunciant' : 'Tu (gestor)'}</div>
                        <div className="msg-content">{msg.content}</div>
                        <div className="msg-time">{formatShort(msg.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="msg-compose" style={{ marginTop: 12 }}>
                <textarea
                  className="msg-input"
                  placeholder="Respon al denunciant..."
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  disabled={sending}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendMessage(e); }}
                />
                <button
                  type="submit"
                  className="btn btn-primary msg-send-btn"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? 'Enviant...' : 'Enviar resposta'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
