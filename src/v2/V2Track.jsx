import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Search, ChevronLeft, Check, CircleAlert, CircleCheck, Send, MessageSquareReply, ShieldAlert } from 'lucide-react';
import { translations } from '../translations.js';
import { getComplaintByCode, getReporterMessages, sendReporterMessage } from '../lib/supabase.js';
import { ICON, fmt, stableOf } from './V2Layout.jsx';

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pantalla no es mou
const S = stableOf(T => T.v2);

// Format real del codi: 8 caràcters amb guió al mig (A3B7-C9X2). S'accepta enganxat amb o sense guió,
// amb espais, o dins d'un text com la línia del justificant ("Codi de seguiment: A3B7-C9X2").
const CODE_CHARS = 8;
const MAX_MSG = 10000;
function formatCode(v) {
  const up = v.toUpperCase();
  const found = up.match(/[A-Z0-9]{4}\s*[-–]\s*[A-Z0-9]{4}/g);
  const clean = (found ? found[found.length - 1] : up).replace(/[^A-Z0-9]/g, '').slice(0, CODE_CHARS);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
// Flux principal que es mostra a la línia de temps; "waiting" i "archived" s'hi col·loquen
const FLOW = ['received', 'reviewing', 'investigating', 'resolved', 'closed'];
const POSITION = { received: 0, reviewing: 1, investigating: 2, waiting: 2, resolved: 3, closed: 4, archived: 4 };

function localeOf(lang) {
  return lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES';
}

function Messages({ t, lang, complaintId, code, waiting }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { ok, text }
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReporterMessages(code).then(({ messages: msgs }) => {
      if (!cancelled) { setMessages(msgs); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [complaintId, code]);

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setFeedback(null);
    const { error } = await sendReporterMessage(code, text);
    setSending(false);
    if (error) { setFeedback({ ok: false, text: t.msgErr }); return; }
    setDraft('');
    setFeedback({ ok: true, text: t.msgOk });
    const { messages: msgs } = await getReporterMessages(code);
    setMessages(msgs);
    requestAnimationFrame(() => document.getElementById('v2-msg')?.focus());
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    setTimeout(() => setFeedback(null), 3000);
  }

  const time = (iso) => iso ? new Date(iso).toLocaleString(localeOf(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <section className="v2-msgs" aria-labelledby="v2-msgs-t">
      <h2 className="v2-sec-title" id="v2-msgs-t">{t.msgTitle}</h2>
      <p className="v2-lead">{t.msgLead}</p>

      <div className="v2-thread" aria-live="polite">
        {loading ? (
          <div className="v2-center is-tight"><div className="v2-spinner" /></div>
        ) : messages.length === 0 ? (
          <p className="v2-thread-empty">{t.msgEmpty}</p>
        ) : messages.map(m => (
          <div key={m.id} className={`v2-msg${m.sender === 'reporter' ? ' is-me' : ''}`}>
            <div className="v2-msg-meta"><b>{m.sender === 'reporter' ? t.msgYou : t.msgManager}</b><span>{time(m.created_at)}</span></div>
            <p>{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="v2-compose" onSubmit={send}>
        <label className="v2-label" htmlFor="v2-msg">{t.msgPh}</label>
        {waiting && (
          <div className="v2-note is-above"><MessageSquareReply {...ICON} /><p>{t.tWaiting}</p></div>
        )}
        <textarea
          id="v2-msg" className="v2-input" rows={4} placeholder={t.msgPh}
          value={draft} readOnly={sending} aria-busy={sending} maxLength={MAX_MSG}
          aria-describedby={draft.length > MAX_MSG * 0.9 ? 'v2-msg-count' : undefined}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e); }}
        />
        {draft.length > MAX_MSG * 0.9 && (
          <p className="v2-field-meta" id="v2-msg-count"><span />{fmt(t.msgCount, { n: draft.length.toLocaleString(), max: MAX_MSG.toLocaleString() })}</p>
        )}
        <div className="v2-compose-row">
          <span role="status">
            {feedback && (
              <span className={`v2-feedback ${feedback.ok ? 'is-ok' : 'is-err'}`}>
                {feedback.ok ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}{feedback.text}
              </span>
            )}
          </span>
          <button type="submit" className="v2-btn v2-btn-primary icon-trail" aria-disabled={!draft.trim()} aria-busy={sending}>
            {sending ? t.msgSending : t.msgSend}<Send {...ICON} />
          </button>
        </div>
      </form>
    </section>
  );
}

export default function V2Track() {
  const { lang, org, base } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const root = translations[lang];
  const t = root.v2;
  // Mateix vocabulari d'estats que el panell; 'waiting' es diu des del punt de vista de l'informant
  const statusLabel = (s) => (s === 'waiting' ? t.statusWaitingReporter : root.v2admin.status[s] ?? s);

  const [code, setCode] = useState(formatCode(location.state?.code ?? ''));
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => { document.title = `${t.tTitle} · ${org.name}`; }, [t, org]);

  async function search(e, override) {
    e?.preventDefault();
    const q = formatCode(override ?? code);
    if (q.replace('-', '').length < CODE_CHARS) { setTooShort(true); inputRef.current?.focus(); return; }
    setTooShort(false);
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const { complaint, error } = await getComplaintByCode(q);
    setLoading(false);
    if (error || !complaint) { setNotFound(true); inputRef.current?.focus(); return; }
    setResult(complaint);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  // Si arriba des de la pantalla d'èxit amb el codi, es consulta directament. Després el codi
  // s'esborra de l'historial: en un ordinador compartit, «enrere» no l'ha de tornar a mostrar
  useEffect(() => {
    const fromState = location.state?.code;
    if (!fromState) return;
    search(null, fromState);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setResult(null);
    setCode('');
    setNotFound(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const date = (iso) => iso ? new Date(iso).toLocaleDateString(localeOf(lang), { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const pos = result ? (POSITION[result.status] ?? 0) : 0;
  const isWaiting = result?.status === 'waiting';
  const isFinal = ['resolved', 'closed', 'archived'].includes(result?.status);
  const categoryLabel = result && (root.categories.find(c => c.value === result.category)?.label ?? result.category);

  return (
    <div className="v2-wrap is-narrow">
      <div className="v2-task">
        <div className="v2-q is-first">
          <S as="h1" className="v2-h1" k="tTitle" />
          {!result && <S as="p" className="v2-lead" k="tLead" />}
        </div>

        {!result && (
          <form className="v2-track-form" onSubmit={search} noValidate>
            <div className="v2-field">
              <label htmlFor="v2-f-code"><S k="fCode" /></label>
              <input
                ref={inputRef}
                id="v2-f-code"
                className="v2-input v2-codeinput"
                value={code}
                placeholder="A3B7-C9X2"
                autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="search"
                aria-invalid={notFound || tooShort}
                aria-describedby={notFound || tooShort ? 'v2-e-code' : undefined}
                onChange={e => { setCode(formatCode(e.target.value)); setNotFound(false); setTooShort(false); }}
              />
            </div>
            <button type="submit" className="v2-btn v2-btn-primary icon-lead" aria-busy={loading}>
              <Search {...ICON} /><S k={loading ? 'tSearching' : 'tSubmit'} />
            </button>
          </form>
        )}
        {(notFound || tooShort) && <p className="v2-err" id="v2-e-code" role="alert"><CircleAlert {...ICON} /><S k={tooShort ? 'tShort' : 'tNotFound'} /></p>}

        {result && (
          <>
            <section className="v2-case" ref={resultRef} tabIndex={-1} aria-label={`${t.fCode} ${result.tracking_code}`}>
              <div className="v2-case-head">
                <span className="v2-code">{result.tracking_code}</span>
                <span className={`v2-status${isWaiting ? ' is-waiting' : isFinal ? ' is-final' : ''}`}>
                  {isWaiting ? <MessageSquareReply {...ICON} /> : isFinal ? <CircleCheck {...ICON} /> : null}
                  {statusLabel(result.status)}
                </span>
              </div>
              <div className="v2-case-body">
                <dl>
                  <div className="v2-sum-row"><S as="dt" k="sumCategory" /><dd>{categoryLabel}</dd></div>
                  <div className="v2-sum-row"><S as="dt" k="tReceived" /><dd>{date(result.created_at)}</dd></div>
                  {result.updated_at && result.updated_at !== result.created_at && (
                    <div className="v2-sum-row"><S as="dt" k="tUpdated" /><dd>{date(result.updated_at)}</dd></div>
                  )}
                </dl>
              </div>
              <ol className="v2-timeline" aria-label={t.tStatus}>
                {FLOW.map((s, i) => {
                  const done = i < pos || (isFinal && i === pos && s === 'closed');
                  const now = i === pos && !done;
                  return (
                    <li key={s} className={`v2-tl${done ? ' is-done' : ''}${now ? ' is-now' : ''}`} aria-current={now ? 'step' : undefined}>
                      <span className="v2-dot" aria-hidden="true">{done && <Check strokeWidth={3} aria-hidden="true" />}</span>
                      <span>{statusLabel(s)}<span className="v2-vh"> · {done ? t.tlDone : now ? t.tlNow : t.tlNext}</span></span>
                    </li>
                  );
                })}
              </ol>
              <p className="v2-case-note"><ShieldAlert {...ICON} /><S k="tPrivacy" /></p>
            </section>

            <Messages t={t} lang={lang} complaintId={result.tracking_code} code={result.tracking_code} waiting={isWaiting} />

            <div className="v2-back-row">
              <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={reset}>
                <Search {...ICON} /><S k="tAnother" />
              </button>
            </div>
          </>
        )}

        {!result && (
          <div className="v2-back-row">
            <Link className="v2-btn v2-btn-secondary icon-lead" to={base} replace><ChevronLeft {...ICON} /><S k="back" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
