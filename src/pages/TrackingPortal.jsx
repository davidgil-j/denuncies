import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../translations.js';
import { getComplaintByCode, getMessages, sendMessage } from '../lib/supabase.js';


// ── Message thread ────────────────────────────────────────────────
function MessageThread({ complaintId, lang }) {
  const t = translations[lang];
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { ok: bool, text: string }
  const bottomRef = useRef();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMsgs(true);
      const { messages: msgs } = await getMessages(complaintId);
      if (!cancelled) {
        setMessages(msgs);
        setLoadingMsgs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [complaintId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setFeedback(null);
    const { error } = await sendMessage(complaintId, text);
    setSending(false);

    if (error) {
      setFeedback({ ok: false, text: t.messageSentError });
    } else {
      setDraft('');
      setFeedback({ ok: true, text: t.messageSentOk });
      // Reload messages
      const { messages: msgs } = await getMessages(complaintId);
      setMessages(msgs);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleString(
      lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    ) : '';

  return (
    <div className="msg-section">
      <div className="msg-section-title">{t.messagesTitle}</div>
      <p className="msg-section-desc">{t.messagesDesc}</p>

      <div className="msg-thread">
        {loadingMsgs ? (
          <div className="msg-loading">...</div>
        ) : messages.length === 0 ? (
          <div className="msg-empty">{t.messageEmpty}</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`msg-bubble-wrap ${msg.sender}`}>
              <div className={`msg-bubble ${msg.sender}`}>
                <div className="msg-sender">
                  {msg.sender === 'reporter' ? t.messageYou : t.messageManager}
                </div>
                <div className="msg-content">{msg.content}</div>
                <div className="msg-time">{formatTime(msg.created_at)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="msg-compose">
        <textarea
          className="msg-input"
          placeholder={t.messagePlaceholder}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          disabled={sending}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(e);
          }}
        />
        {feedback && (
          <div className={`msg-feedback ${feedback.ok ? 'ok' : 'err'}`}>
            {feedback.text}
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary msg-send-btn"
          disabled={sending || !draft.trim()}
        >
          {sending ? t.messageSending : t.messageSend}
        </button>
      </form>
    </div>
  );
}

// ── Tracking portal ───────────────────────────────────────────────
export default function TrackingPortal({ lang, initialCode = '', onBack }) {
  const t = translations[lang];
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCode && initialCode.length >= 8) {
      handleSearch(null, initialCode);
    }
  }, []);

  async function handleSearch(e, overrideCode) {
    if (e) e.preventDefault();
    const searchCode = (overrideCode ?? code).trim().toUpperCase();
    if (!searchCode) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { complaint, error } = await getComplaintByCode(searchCode);

    setLoading(false);

    if (error || !complaint) {
      setNotFound(true);
    } else {
      setResult(complaint);
    }
  }

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(
      lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES',
      { year: 'numeric', month: 'long', day: 'numeric' }
    ) : '—';

  return (
    <div className="card-body">
      <div className="step-title">{t.trackPageTitle}</div>
      <p className="track-desc">{t.trackPageDesc}</p>

      <form onSubmit={handleSearch}>
        <div className="field">
          <label className="field-label">{t.trackCodeLabel}</label>
          <input
            className="field-input"
            type="text"
            placeholder={t.trackCodePlaceholder}
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              setNotFound(false);
              setResult(null);
            }}
            style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, fontSize: 18 }}
            maxLength={9}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading || !code.trim()}
        >
          {loading ? '...' : t.trackButton}
        </button>
      </form>

      {notFound && (
        <div className="track-not-found">
          {t.trackNotFound}
        </div>
      )}

      {result && (
        <>
          <div className="track-result" style={{ marginTop: 24 }}>
            {/* Status badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                #{result.tracking_code}
              </span>
              <span className={`track-status-badge status-${result.status}`}>
                {t.status[result.status]}
              </span>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="summary-row">
                <span className="summary-key">{t.summaryCategory}</span>
                <span className="summary-val">
                  {t.categories.find(c => c.value === result.category)?.label ?? result.category}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-key">
                  {lang === 'ca' ? 'Data recepció' : lang === 'es' ? 'Fecha recepción' : 'Received'}
                </span>
                <span className="summary-val">{formatDate(result.created_at)}</span>
              </div>
              {result.updated_at !== result.created_at && (
                <div className="summary-row">
                  <span className="summary-key">
                    {lang === 'ca' ? 'Última actualització' : lang === 'es' ? 'Última actualización' : 'Last update'}
                  </span>
                  <span className="summary-val">{formatDate(result.updated_at)}</span>
                </div>
              )}
            </div>

            {/* Privacy note */}
            <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-light)', lineHeight: 1.5, textAlign: 'center' }}>
              {lang === 'ca'
                ? 'Per protegir la confidencialitat, no es mostren detalls addicionals en aquesta consulta.'
                : lang === 'es'
                ? 'Para proteger la confidencialidad, no se muestran detalles adicionales en esta consulta.'
                : 'To protect confidentiality, no additional details are shown in this query.'}
            </p>
          </div>

          {/* Message thread */}
          <MessageThread complaintId={result.id} lang={lang} />
        </>
      )}

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button type="button" className="btn-link" onClick={onBack}>
          ← {t.trackGoBack}
        </button>
      </div>
    </div>
  );
}
