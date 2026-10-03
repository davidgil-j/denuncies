import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, FileText, Trash2, EyeOff, UserRound, X, Check, Copy, Paperclip, Download, Send, CircleCheck,
  CircleAlert, ShieldAlert, Info, FileQuestion, LockKeyhole, Mail, Phone,
} from 'lucide-react';
import {
  getComplaintById, getMessages, sendMessage, updateComplaintStatus, getAuditLogs, logComplaintEvent,
  deleteComplaint, getAttachmentUrl,
} from '../../lib/supabase.js';
import { exportComplaintToPDF } from '../lib/exportV2.js';
import { ICON, fmt } from '../V2Layout.jsx';
import {
  useAdmin, deadlineInfo, dlMain, StatusPill, Priority, Select, Confirm, Empty, copyText, catLabel, auditText,
  fDateTime, fLong, fShort, STATUS_ORDER, PRIORITIES, ANSWERED,
} from './adminKit.jsx';

function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}

// Data en què es va fer l'acusament (primer canvi des de "received") i la resposta, segons el registre
function milestonesFromLogs(logs) {
  const statusLogs = logs.filter(l => l.action === 'status_changed' || /^status_changed_to_/.test(l.action ?? ''));
  const toOf = (l) => l.details?.to ?? l.action.replace('status_changed_to_', '');
  const ack = statusLogs.find(l => l.action !== 'status_changed' || l.details?.from === 'received');
  const answered = [...statusLogs].reverse().find(l => ANSWERED.includes(toOf(l)));
  return { ackAt: ack?.created_at ?? null, answeredAt: answered?.created_at ?? null };
}

export default function V2Detail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, tr, lang, can, profile, email, org, notify } = useAdmin();
  const backTo = `/admin${location.state?.from ?? ''}`;

  const [complaint, setComplaint] = useState(undefined); // undefined: carregant · null: no trobada
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState('');
  const [exporting, setExporting] = useState(false);

  async function loadAll() {
    setComplaint(undefined);
    const [{ complaint: c }, { messages: msgs }, { logs: l }] = await Promise.all([
      getComplaintById(id), getMessages(id), getAuditLogs(id),
    ]);
    setComplaint(c ?? null);
    setMessages(msgs ?? []);
    setLogs(l ?? []);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => {
    if (complaint) document.title = `${complaint.tracking_code} · ${t.panelName}`;
  }, [complaint, t]);

  const reloadLogs = async () => { const { logs: l } = await getAuditLogs(id); setLogs(l ?? []); };
  const actor = profile?.full_name || email;

  if (complaint === undefined) return <DetailSkeleton t={t} backTo={backTo} />;

  if (complaint === null) {
    return (
      <div className="v2-page">
        <BackLink to={backTo} t={t} />
        <Empty icon={FileQuestion} title={t.notFoundTitle} actions={<Link className="v2-btn v2-btn-secondary v2-btn-sm" to="/admin">{t.backToList}</Link>}>
          {t.notFoundText}
        </Empty>
      </div>
    );
  }

  if (!can('view', complaint.category)) {
    return (
      <div className="v2-page">
        <BackLink to={backTo} t={t} />
        <Empty icon={LockKeyhole} title={t.noViewTitle} actions={<Link className="v2-btn v2-btn-secondary v2-btn-sm" to="/admin">{t.backToList}</Link>}>
          {t.noViewText}
        </Empty>
      </div>
    );
  }

  const c = complaint;
  const canEdit = can('edit', c.category);
  const canReply = can('reply', c.category);
  const canDelete = can('delete', c.category);

  async function doExport() {
    setExporting(true);
    try {
      // El registre s'envia amb el text ja traduït perquè el PDF el mostri tal com es veu aquí
      const audit_logs = logs.map(l => (l.action === 'created' ? l : { ...l, action: auditText(t, l), details: { note: l.details?.note ?? '' } }));
      await exportComplaintToPDF({ ...c, organization: org?.name ?? '', audit_logs }, messages, lang);
    } catch {
      notify(t.exportErr, 'err');
    }
    setExporting(false);
  }

  async function doDelete() {
    setDeleting(true);
    setDelErr('');
    const { error } = await deleteComplaint(c.id);
    setDeleting(false);
    if (error) { setDelErr(t.delErr); return; }
    // El registre es conserva sense vincle a la denúncia esborrada
    logComplaintEvent({ complaintId: null, organizationId: c.organization_id, action: 'deleted', details: { tracking_code: c.tracking_code, actor_name: actor } });
    setConfirmDel(false);
    notify(fmt(t.deleted, { code: c.tracking_code }));
    navigate(backTo, { replace: true });
  }

  return (
    <div className="v2-page v2-detail">
      <BackLink to={backTo} t={t} />

      <section className="v2-exp" aria-labelledby="v2-exp-code">
        <div className="v2-exp-head">
          <div className="v2-exp-id">
            <h1 className="v2-exp-code" id="v2-exp-code">{c.tracking_code}</h1>
            <div className="v2-exp-tags">
              <StatusPill status={c.status} t={t} />
              <Priority priority={c.priority} t={t} />
              <span className="v2-idn is-tag">{c.is_anonymous ? <EyeOff {...ICON} /> : <UserRound {...ICON} />}{c.is_anonymous ? t.anon : t.ident}</span>
            </div>
            <p className="v2-exp-meta">
              {fmt(t.receivedOn, { date: fDateTime(c.created_at, lang) })}
              <span aria-hidden="true"> · </span>{catLabel(tr, c.category)}
            </p>
          </div>
          <div className="v2-exp-actions">
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={doExport} aria-busy={exporting}>
              <FileText {...ICON} />{t.exportOne}
            </button>
            {canDelete && (
              <button type="button" className="v2-btn v2-btn-ghost-danger v2-btn-sm icon-lead" onClick={() => { setDelErr(''); setConfirmDel(true); }}>
                <Trash2 {...ICON} />{t.del}
              </button>
            )}
          </div>
        </div>
        <Deadlines c={c} logs={logs} t={t} lang={lang} />
      </section>

      <div className="v2-detail-grid">
        <div className="v2-detail-main">
          <Facts c={c} t={t} tr={tr} lang={lang} />
          <Reporter c={c} t={t} />
          <Docs c={c} t={t} />
          <Messages
            c={c} t={t} lang={lang} canReply={canReply} messages={messages}
            onSent={async () => {
              await logComplaintEvent({ complaintId: c.id, organizationId: c.organization_id, action: 'message_sent', details: { actor_name: actor } });
              const { messages: msgs } = await getMessages(c.id);
              setMessages(msgs ?? []);
              reloadLogs();
            }}
          />
        </div>
        <div className="v2-detail-side">
          <Manage
            c={c} t={t} canEdit={canEdit} actor={actor}
            onSaved={(patch) => { setComplaint(prev => ({ ...prev, ...patch })); reloadLogs(); }}
          />
          <Audit logs={logs} t={t} lang={lang} />
        </div>
      </div>

      <Confirm
        open={confirmDel}
        title={fmt(t.delTitle, { code: c.tracking_code })}
        confirmLabel={t.delConfirm}
        busyLabel={t.deleting}
        cancelLabel={t.cancel}
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      >
        <p>{t.delText}</p>
        {delErr && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{delErr}</p>}
      </Confirm>
    </div>
  );
}

function BackLink({ to, t }) {
  return (
    <Link className="v2-back" to={to}><ChevronLeft {...ICON} />{t.back}</Link>
  );
}

// ── Terminis legals: el que mana a la fitxa ─────────────────────────────
function Deadlines({ c, logs, t, lang }) {
  const { ackAt, answeredAt } = useMemo(() => milestonesFromLogs(logs), [logs]);
  const info = deadlineInfo(c, new Date(), { answeredAt });

  const ackDone = info.ack.state === 'done';
  const ackLate = ackDone && ackAt && new Date(ackAt) > info.ackDue;
  const ack = {
    title: t.kAck, rule: t.ackRule,
    state: ackDone ? (ackLate ? 'late' : 'met') : info.ack.state,
    main: ackDone ? (ackAt ? fmt(t.ackDoneOn, { date: fShort(ackAt, lang) }) : t.ackDone) : dlMain(t, info.ack),
    sub: ackDone ? (ackLate ? t.dlLate : t.dlMet) : fmt(t.until, { date: fLong(info.ackDue, lang) }),
    pct: ackDone ? 1 : Math.min(1, Math.max(0, info.elapsed / 7)),
    start: fShort(info.received, lang), end: fShort(info.ackDue, lang),
  };
  const respDone = ['met', 'late'].includes(info.resp.state);
  const resp = {
    title: t.kResp, rule: t.respRule,
    state: info.resp.state,
    main: respDone ? fmt(t.respDoneOn, { date: fShort(info.resp.at, lang) }) : dlMain(t, info.resp),
    sub: respDone ? (info.resp.state === 'met' ? t.dlMet : t.dlLate) : fmt(t.until, { date: fLong(info.respDue, lang) }),
    pct: respDone ? 1 : Math.min(1, Math.max(0, info.elapsed / info.totalDays)),
    start: fShort(info.received, lang), end: fShort(info.respDue, lang),
  };

  return (
    <div className="v2-exp-body">
      <h2 className="v2-vh">{t.deadlinesTitle}</h2>
      <div className="v2-dls">
        {[ack, resp].map(m => (
          <div key={m.title} className={`v2-dlm is-${m.state}`}>
            <p className="v2-dlm-head"><span>{m.title}</span><span className="v2-dlm-rule">{m.rule}</span></p>
            <p className="v2-dlm-main">{m.main}</p>
            <div className="v2-meter" aria-hidden="true"><span style={{ transform: `scaleX(${m.pct})` }} /></div>
            <p className="v2-dlm-foot"><span>{m.start}</span><span>{m.sub}</span></p>
          </div>
        ))}
      </div>
      {c.status === 'received' && (
        <p className="v2-dl-hint"><Info {...ICON} />{t.ackHint}</p>
      )}
    </div>
  );
}

// ── Fets ────────────────────────────────────────────────────────────────
function Facts({ c, t, tr, lang }) {
  const rows = [
    [t.fieldCategory, catLabel(tr, c.category)],
    [t.fieldDepartment, c.department],
    [t.fieldIncident, c.incident_date ? fLong(`${c.incident_date}T12:00:00`, lang) : null],
    [t.fieldInvolved, c.involved_people],
    [t.fieldLanguage, t.langs[c.language] ?? c.language],
  ];
  return (
    <section className="v2-sec" aria-labelledby="v2-facts-t">
      <h2 className="v2-sec-h" id="v2-facts-t">{t.facts}</h2>
      <p className="v2-desc">{c.description}</p>
      <dl className="v2-kv">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd className={v ? '' : 'is-empty'}>{v || t.notProvided}</dd></div>
        ))}
      </dl>
    </section>
  );
}

// ── Informant: en anònimes no es mostra res identificatiu, mai ──────────
function Reporter({ c, t }) {
  const [copied, setCopied] = useState(false);
  if (c.is_anonymous) {
    return (
      <section className="v2-sec" aria-labelledby="v2-rep-t">
        <h2 className="v2-sec-h" id="v2-rep-t">{t.identityNone}</h2>
        <p className="v2-sec-lead">{t.anonText}</p>
        <dl className="v2-ficha-block is-no v2-rep-ficha">
          {[t.fName, t.fEmail, t.fPhone].map(label => (
            <div className="v2-f-row" key={label}><dt>{label}</dt><dd><X {...ICON} />{t.notStored}</dd></div>
          ))}
        </dl>
      </section>
    );
  }
  const emailAddr = (c.reporter_email ?? '').trim();
  return (
    <section className="v2-sec" aria-labelledby="v2-rep-t">
      <h2 className="v2-sec-h" id="v2-rep-t">{t.reporter}</h2>
      <p className="v2-sec-lead">{t.identText}</p>
      <dl className="v2-kv is-contact">
        <div><dt>{t.fName}</dt><dd className={c.reporter_name ? '' : 'is-empty'}>{c.reporter_name || t.notProvided}</dd></div>
        <div>
          <dt>{t.fEmail}</dt>
          <dd className={emailAddr ? 'v2-kv-row' : 'is-empty'}>
            {emailAddr ? (
              <>
                <a className="v2-link" href={`mailto:${emailAddr}`}><Mail {...ICON} />{emailAddr}</a>
                <button type="button" className="v2-mini-btn" onClick={async () => { if (await copyText(emailAddr)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}>
                  {copied ? <Check {...ICON} /> : <Copy {...ICON} />}{copied ? t.copied : t.copy}
                </button>
              </>
            ) : t.notProvided}
          </dd>
        </div>
        <div>
          <dt>{t.fPhone}</dt>
          <dd className={c.reporter_phone ? '' : 'is-empty'}>
            {c.reporter_phone ? <a className="v2-link" href={`tel:${c.reporter_phone.replace(/\s/g, '')}`}><Phone {...ICON} />{c.reporter_phone}</a> : t.notProvided}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ── Documents ───────────────────────────────────────────────────────────
function Docs({ c, t }) {
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null); // { id, text, err }
  const files = c.attachments ?? [];

  async function download(a) {
    setBusy(a.id);
    setNote(null);
    const { url, demo, error } = await getAttachmentUrl(a.storage_path);
    setBusy(null);
    if (demo) { setNote({ id: a.id, text: t.downloadDemo }); return; }
    if (error || !url) { setNote({ id: a.id, text: t.downloadErr, err: true }); return; }
    window.open(url, '_blank', 'noopener');
  }

  return (
    <section className="v2-sec" aria-labelledby="v2-docs-t">
      <h2 className="v2-sec-h" id="v2-docs-t">{t.docs}{files.length > 0 && <span className="v2-sec-n">{files.length}</span>}</h2>
      {files.length === 0 ? (
        <p className="v2-sec-empty">{t.docsNone}</p>
      ) : (
        <ul className="v2-docs">
          {files.map(a => (
            <li key={a.id}>
              <div className="v2-doc">
                <Paperclip {...ICON} />
                <span className="v2-doc-name" title={a.filename}>{a.filename}</span>
                <span className="v2-doc-size v2-num">{fileSize(a.file_size)}</span>
                <button type="button" className="v2-mini-btn" onClick={() => download(a)} aria-busy={busy === a.id} aria-label={fmt(t.downloadAria, { name: a.filename })}>
                  <Download {...ICON} /><span aria-hidden="true">{t.download}</span>
                </button>
              </div>
              {note?.id === a.id && <p className={`v2-doc-note${note.err ? ' is-err' : ''}`} role="status">{note.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Missatgeria amb l'informant ─────────────────────────────────────────
function Messages({ c, t, lang, canReply, messages, onSent }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const endRef = useRef(null);
  const prevLen = useRef(messages.length);

  // Només es desplaça quan arriba un missatge nou, no en obrir la denúncia
  useEffect(() => {
    if (messages.length > prevLen.current) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    prevLen.current = messages.length;
  }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setFeedback(null);
    const { error } = await sendMessage(c.id, text, 'manager');
    if (error) { setSending(false); setFeedback({ ok: false, text: t.msgErr }); return; }
    setDraft('');
    await onSent();
    setSending(false);
    setFeedback({ ok: true, text: t.msgOk });
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <section className="v2-sec" aria-labelledby="v2-msgs-t">
      <h2 className="v2-sec-h" id="v2-msgs-t">{t.msgs}{messages.length > 0 && <span className="v2-sec-n">{messages.length}</span>}</h2>
      <p className="v2-sec-lead">{t.msgsLead}</p>

      <div className="v2-thread" aria-live="polite">
        {messages.length === 0 ? (
          <p className="v2-thread-empty">{t.msgsEmpty}</p>
        ) : messages.map(m => (
          <div key={m.id} className={`v2-msg${m.sender === 'manager' ? ' is-me' : ''}`}>
            <div className="v2-msg-meta"><b>{m.sender === 'reporter' ? t.msgReporter : t.msgManager}</b><span>{fDateTime(m.created_at, lang)}</span></div>
            <p>{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {canReply ? (
        <form className="v2-compose" onSubmit={send}>
          {c.is_anonymous && <p className="v2-compose-tip"><ShieldAlert {...ICON} />{t.msgAnonTip}</p>}
          <label className="v2-vh" htmlFor="v2-reply">{t.msgLabel}</label>
          <textarea
            id="v2-reply" className="v2-input" rows={4} placeholder={t.msgPh}
            value={draft} disabled={sending}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e); }}
          />
          <div className="v2-compose-row">
            <span role="status" className="v2-compose-status">
              {feedback ? (
                <span className={`v2-feedback ${feedback.ok ? 'is-ok' : 'is-err'}`}>
                  {feedback.ok ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}{feedback.text}
                </span>
              ) : <span className="v2-kbd-hint">{t.msgShortcut}</span>}
            </span>
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm icon-trail" disabled={!draft.trim()} aria-busy={sending}>
              {sending ? t.msgSending : t.msgSend}<Send {...ICON} />
            </button>
          </div>
        </form>
      ) : (
        <p className="v2-sec-empty"><LockKeyhole {...ICON} />{t.msgNoReply}</p>
      )}
    </section>
  );
}

// ── Gestió: estat, prioritat i nota interna ─────────────────────────────
function Manage({ c, t, canEdit, actor, onSaved }) {
  const [status, setStatus] = useState(c.status);
  const [priority, setPriority] = useState(c.priority);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { setStatus(c.status); setPriority(c.priority); }, [c.status, c.priority]);

  const changed = status !== c.status || priority !== c.priority || note.trim() !== '';

  async function save(e) {
    e.preventDefault();
    if (!changed || saving) return;
    setSaving(true);
    setFeedback(null);
    const statusChanged = status !== c.status;
    const prioChanged = priority !== c.priority;
    const text = note.trim();
    if (statusChanged || prioChanged) {
      const { error } = await updateComplaintStatus(c.id, status, null, priority);
      if (error) { setSaving(false); setFeedback({ ok: false, text: t.saveErr }); return; }
    }
    const base = { complaintId: c.id, organizationId: c.organization_id };
    if (statusChanged) await logComplaintEvent({ ...base, action: 'status_changed', details: { from: c.status, to: status, actor_name: actor, ...(text ? { note: text } : {}) } });
    if (prioChanged) await logComplaintEvent({ ...base, action: 'priority_changed', details: { from: c.priority, to: priority, actor_name: actor, ...(text && !statusChanged ? { note: text } : {}) } });
    if (!statusChanged && !prioChanged && text) await logComplaintEvent({ ...base, action: 'note_added', details: { note: text, actor_name: actor } });
    setSaving(false);
    setNote('');
    setFeedback({ ok: true, text: t.saved });
    setTimeout(() => setFeedback(null), 3000);
    onSaved({ status, priority, ...(statusChanged || prioChanged ? { updated_at: new Date().toISOString() } : {}) });
  }

  return (
    <section className="v2-sec v2-manage" aria-labelledby="v2-manage-t">
      <h2 className="v2-sec-h" id="v2-manage-t">{t.manage}</h2>
      {!canEdit && <p className="v2-sec-lead"><LockKeyhole {...ICON} />{t.noEdit}</p>}
      <form onSubmit={save} className="v2-manage-form">
        <Select
          label={t.cStatus} value={status} onChange={setStatus} disabled={!canEdit}
          options={STATUS_ORDER.map(s => ({ value: s, label: t.status[s] }))}
        />
        <Select
          label={t.cPriority} value={priority} onChange={setPriority} disabled={!canEdit}
          options={PRIORITIES.map(p => ({ value: p, label: t.priority[p] }))}
        />
        {canEdit && (
          <div className="v2-field">
            <label htmlFor="v2-note">{t.note}</label>
            <textarea id="v2-note" className="v2-input v2-note-input" rows={3} placeholder={t.notePh} value={note} onChange={e => setNote(e.target.value)} />
            <p className="v2-help">{t.noteHelp}</p>
          </div>
        )}
        {canEdit && (
          <div className="v2-manage-foot">
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={!changed} aria-busy={saving}>
              {saving ? t.saving : t.save}
            </button>
            <span role="status">
              {feedback && (
                <span className={`v2-feedback ${feedback.ok ? 'is-ok' : 'is-err'}`}>
                  {feedback.ok ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}{feedback.text}
                </span>
              )}
            </span>
          </div>
        )}
      </form>
    </section>
  );
}

// ── Registre d'activitat (el més recent, a dalt) ────────────────────────
function Audit({ logs, t, lang }) {
  const items = [...logs].filter(l => l.action !== 'deleted').reverse();
  return (
    <section className="v2-sec" aria-labelledby="v2-audit-t">
      <h2 className="v2-sec-h" id="v2-audit-t">{t.audit}</h2>
      {items.length === 0 ? (
        <p className="v2-sec-empty">{t.auditEmpty}</p>
      ) : (
        <ol className="v2-log">
          {items.map(l => (
            <li key={l.id} className={`v2-log-item is-${l.action === 'created' ? 'created' : l.action?.startsWith('status') ? 'status' : 'other'}`}>
              <span className="v2-log-dot" aria-hidden="true" />
              <p className="v2-log-text">{auditText(t, l)}</p>
              <time className="v2-log-time" dateTime={l.created_at}>{fDateTime(l.created_at, lang)}</time>
              {l.details?.note && <p className="v2-log-note">{l.details.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DetailSkeleton({ t, backTo }) {
  return (
    <div className="v2-page v2-detail" aria-busy="true">
      <BackLink to={backTo} t={t} />
      <span className="v2-vh" role="status">{t.loading}</span>
      <div className="v2-exp is-skel" aria-hidden="true">
        <div className="v2-exp-head">
          <div className="v2-exp-id">
            <span className="v2-skel" style={{ width: 210, height: 30 }} />
            <span className="v2-skel" style={{ width: 280, marginTop: 14 }} />
          </div>
        </div>
        <div className="v2-exp-body"><span className="v2-skel" style={{ width: '100%', height: 92 }} /></div>
      </div>
      <div className="v2-detail-grid" aria-hidden="true">
        <div className="v2-detail-main">
          <div className="v2-sec">
            <span className="v2-skel" style={{ width: 180, height: 20 }} />
            {[96, 88, 92, 60].map((w, i) => <span key={i} className="v2-skel" style={{ width: `${w}%`, marginTop: 12 }} />)}
          </div>
        </div>
        <div className="v2-detail-side">
          <div className="v2-sec">
            <span className="v2-skel" style={{ width: 120, height: 20 }} />
            <span className="v2-skel" style={{ width: '100%', height: 40, marginTop: 16 }} />
            <span className="v2-skel" style={{ width: '100%', height: 40, marginTop: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
