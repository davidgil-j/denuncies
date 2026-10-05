import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, FileText, Eraser, Eye, EyeOff, UserRound, X, Check, Copy, Paperclip, Download, Send, CircleCheck,
  CircleAlert, ShieldAlert, Info, FileQuestion, LockKeyhole, Mail, Phone, MailCheck, CalendarPlus, Archive,
} from 'lucide-react';
import {
  getComplaintById, getReporterIdentity, getMessages, sendMessage, getAuditLogs, updateComplaint, addComplaintNote,
  markMessagesRead, extendDeadline, anonymizeComplaint, getAttachmentUrl,
} from '../../lib/supabase.js';
import { translations } from '../../translations.js';
import { ICON, fmt } from '../V2Layout.jsx';
import {
  useAdmin, L, SwapL, deadlineInfo, dlMain, StatusPill, Priority, Select, Confirm, Empty, copyText, catLabel, auditText,
  fDateTime, fLong, fShort, STATUS_ORDER, PRIORITIES, ANSWERED,
} from './adminKit.jsx';

function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}

// Si la base de dades encara no desa les dates legals (abans de la migració 010), es treuen del
// registre: el PRIMER canvi des de "received" i la PRIMERA resposta (arxivar després no la mou)
function milestonesFromLogs(logs) {
  const statusLogs = logs.filter(l => l.action === 'status_changed' || /^status_changed_to_/.test(l.action ?? ''));
  const toOf = (l) => l.details?.to ?? l.action.replace('status_changed_to_', '');
  const ack = statusLogs.find(l => l.action !== 'status_changed' || l.details?.from === 'received');
  const answered = statusLogs.find(l => ANSWERED.includes(toOf(l)));
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
  const [identity, setIdentity] = useState(null); // dades de contacte, només si s'han demanat
  const [loadErr, setLoadErr] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState('');
  const [delReason, setDelReason] = useState('');
  const [exporting, setExporting] = useState(false);

  async function loadAll() {
    setComplaint(undefined);
    setIdentity(null);
    setLoadErr(false);
    const [{ complaint: c, error }, { messages: msgs }, { logs: l }] = await Promise.all([
      getComplaintById(id), getMessages(id), getAuditLogs(id),
    ]);
    // Un error de xarxa no és el mateix que una denúncia inexistent
    if (error && !c && error.code !== 'PGRST116' && error.message !== 'not-found') { setLoadErr(true); setComplaint(null); return; }
    setComplaint(c ?? null);
    setMessages(msgs ?? []);
    setLogs(l ?? []);
    // En obrir-la, els missatges de l'informant queden llegits
    if (c && (msgs ?? []).some(m => m.sender === 'reporter' && !m.is_read)) markMessagesRead(c.id);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => {
    if (complaint) document.title = `${complaint.reference} · ${t.panelName}`;
  }, [complaint, t]);

  const reloadLogs = async () => { const { logs: l } = await getAuditLogs(id); setLogs(l ?? []); };
  const actor = profile?.full_name || email;

  if (complaint === undefined) return <DetailSkeleton t={t} backTo={backTo} />;

  if (complaint === null) {
    return (
      <div className="v2-page">
        <BackLink to={backTo} t={t} />
        {loadErr ? (
          <Empty icon={CircleAlert} title={t.loadErrTitle} actions={<button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={loadAll}><L k="retry" /></button>}>
            {t.loadErrText}
          </Empty>
        ) : (
          <Empty icon={FileQuestion} title={t.notFoundTitle} actions={<Link className="v2-btn v2-btn-secondary v2-btn-sm" to="/admin"><L k="backToList" /></Link>}>
            {t.notFoundText}
          </Empty>
        )}
      </div>
    );
  }

  if (!can('view', complaint.category)) {
    return (
      <div className="v2-page">
        <BackLink to={backTo} t={t} />
        <Empty icon={LockKeyhole} title={t.noViewTitle} actions={<Link className="v2-btn v2-btn-secondary v2-btn-sm" to="/admin"><L k="backToList" /></Link>}>
          {t.noViewText}
        </Empty>
      </div>
    );
  }

  const c = complaint;
  const closed = !!c.anonymized_at;
  const canEdit = can('edit', c.category) && !closed;
  const canReply = can('reply', c.category) && !closed;
  const canDelete = can('delete', c.category) && !closed;
  const { ackAt: logAck, answeredAt: logAnswer } = milestonesFromLogs(logs);
  const info = deadlineInfo(c, new Date(), { ackAt: logAck, answeredAt: logAnswer });

  async function doExport() {
    setExporting(true);
    try {
      // El registre s'envia amb el text ja traduït perquè el PDF el mostri tal com es veu aquí
      const audit_logs = logs.map(l => (l.action === 'created' ? l : { ...l, action: auditText(t, l), details: { note: l.details?.note ?? '' } }));
      const { exportComplaintToPDF } = await import('../lib/exportV2.js');
      // La identitat només surt al PDF si s'ha consultat en aquesta fitxa (i la consulta ja consta al registre)
      await exportComplaintToPDF({ ...c, ...(identity ?? { identityWithheld: true }), tracking_code: c.reference, organization: org?.name ?? '', audit_logs, deadline: info }, messages, lang);
    } catch {
      notify(t.exportErr, 'err');
    }
    setExporting(false);
  }

  async function doDelete() {
    if (delReason.trim().length < 5) { setDelErr(t.supErrReason); return; }
    setDeleting(true);
    setDelErr('');
    const { error } = await anonymizeComplaint(c.id, delReason.trim(), actor);
    setDeleting(false);
    if (error) { setDelErr(t.delErr); return; }
    setConfirmDel(false);
    setDelReason('');
    notify(fmt(t.deleted, { code: c.reference }));
    loadAll();
  }

  // Recàrrega parcial després d'una acció: dades legals, missatges i registre
  async function refresh() {
    const [{ complaint: fresh }, { messages: msgs }, { logs: l }] = await Promise.all([getComplaintById(id), getMessages(id), getAuditLogs(id)]);
    if (fresh) setComplaint(fresh);
    setMessages(msgs ?? []);
    setLogs(l ?? []);
  }

  // Acusament de recepció: missatge a l'informant en el seu idioma i la denúncia passa a En revisió
  async function sendAck() {
    const text = translations[c.language]?.v2admin?.ackMessage ?? t.ackMessage;
    const { error } = await sendMessage(c.id, text, 'manager', actor);
    if (error) { notify(t.ackErr, 'err'); return; }
    await updateComplaint(c.id, { status: 'reviewing' }, actor);
    notify(t.ackSent);
    refresh();
  }

  return (
    <div className="v2-page v2-detail">
      <BackLink to={backTo} t={t} />

      <section className="v2-exp" aria-labelledby="v2-exp-code">
        <div className="v2-exp-head">
          <div className="v2-exp-id">
            <h1 className="v2-exp-code" id="v2-exp-code" title={t.refHelp}>{c.reference}</h1>
            {/* La fila sencera reserva l'amplada de l'idioma més llarg: les accions del costat no es mouen */}
            <L as="div" inner="v2-exp-tags" pick={x => (
              <>
                <StatusPill status={c.status} t={x} />
                <Priority priority={c.priority} t={x} />
                <span className="v2-idn is-tag">{c.is_anonymous ? <EyeOff {...ICON} /> : <UserRound {...ICON} />}{c.is_anonymous ? x.anon : x.ident}</span>
              </>
            )} />
            <L as="p" className="v2-exp-meta" pick={(x, T, l) => (
              <>
                {fmt(x.receivedOn, { date: fDateTime(c.created_at, l) })}
                <span aria-hidden="true"> · </span>{catLabel(T, c.category)}
              </>
            )} />
          </div>
          <div className="v2-exp-actions">
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={doExport} aria-busy={exporting}>
              <FileText {...ICON} /><L k="exportOne" />
            </button>
            {canDelete && (
              <button type="button" className="v2-btn v2-btn-ghost-danger v2-btn-sm icon-lead" onClick={() => { setDelErr(''); setConfirmDel(true); }}>
                <Eraser {...ICON} /><L k="del" />
              </button>
            )}
          </div>
        </div>
        {closed ? (
          <div className="v2-exp-body">
            <div className="v2-note is-quiet v2-anon-banner">
              <Archive {...ICON} />
              <p>{fmt(t.anonBanner, { date: fLong(c.anonymized_at, lang) })}<small><L k="anonBannerText" /></small></p>
            </div>
          </div>
        ) : (
          <Deadlines
            c={c} info={info} t={t} lang={lang} actor={actor} notify={notify}
            canAck={canEdit && canReply && c.status === 'received'} canExtend={canEdit && !info.extended && !['met', 'late'].includes(info.resp.state)}
            onAck={sendAck} onChanged={refresh}
          />
        )}
      </section>

      <div className="v2-detail-grid">
        <div className="v2-detail-main">
          <Facts c={c} t={t} tr={tr} lang={lang} />
          <Reporter c={c} t={t} identity={identity} onReveal={async () => {
            const { identity: found, error } = await getReporterIdentity(c.id);
            if (error || !found) return false;
            setIdentity(found);
            reloadLogs();
            return true;
          }} />
          <Docs c={c} t={t} />
          <Messages
            c={c} t={t} lang={lang} canReply={canReply} messages={messages} actor={actor}
            onSent={async () => {
              const { messages: msgs } = await getMessages(c.id);
              setMessages(msgs ?? []);
              reloadLogs();
            }}
          />
        </div>
        <div className="v2-detail-side">
          {!closed && (
            <Manage
              c={c} t={t} canEdit={canEdit} canReply={can('reply', c.category)} actor={actor}
              onSaved={refresh}
            />
          )}
          <Audit logs={logs} t={t} lang={lang} />
        </div>
      </div>

      <Confirm
        open={confirmDel}
        title={fmt(t.supTitle, { code: c.reference })}
        confirmLabel={t.delConfirm}
        busyLabel={t.deleting}
        cancelLabel={t.cancel}
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      >
        <L as="p" k="supText" />
        <div className="v2-field v2-dialog-field">
          <label htmlFor="v2-sup-reason"><L k="supReason" /></label>
          <textarea
            id="v2-sup-reason" className="v2-input v2-note-input" rows={3} maxLength={500} placeholder={t.supReasonPh}
            value={delReason} onChange={e => { setDelReason(e.target.value); setDelErr(''); }}
            aria-invalid={!!delErr} aria-describedby={delErr ? 'v2-sup-err' : undefined}
          />
        </div>
        {delErr && <p className="v2-err" id="v2-sup-err" role="alert"><CircleAlert {...ICON} />{delErr}</p>}
      </Confirm>
    </div>
  );
}

function BackLink({ to, t }) {
  return (
    <Link className="v2-back" to={to}><ChevronLeft {...ICON} /><L k="back" /></Link>
  );
}

// ── Terminis legals: el que mana a la fitxa ─────────────────────────────
function Deadlines({ c, info, t, lang, actor, notify, canAck, canExtend, onAck, onChanged }) {
  const [acking, setAcking] = useState(false);
  const [extOpen, setExtOpen] = useState(false);
  const [extReason, setExtReason] = useState('');
  const [extErr, setExtErr] = useState('');
  const [extBusy, setExtBusy] = useState(false);

  const ackAt = info.ack.at;
  const ackDone = info.ack.state === 'done';
  const ackLate = ackDone && info.ack.late;
  const respDone = ['met', 'late'].includes(info.resp.state);
  // Els dos terminis amb els textos d'un idioma (x) i les seves dates (l): es pinten en els tres
  // perquè la fitxa reservi l'espai del més llarg i no es mogui en canviar d'idioma
  const meters = (x, l) => [{
    title: x.kAck, rule: x.ackRule,
    state: ackDone ? (ackLate ? 'late' : 'met') : info.ack.state,
    main: ackDone ? (ackAt ? fmt(x.ackDoneOn, { date: fShort(ackAt, l) }) : x.ackDone) : dlMain(x, info.ack),
    sub: ackDone ? (ackLate ? x.dlLate : x.dlMet) : fmt(x.until, { date: fLong(info.ackDue, l) }),
    pct: ackDone ? 1 : Math.min(1, Math.max(0, info.elapsed / 7)),
    start: fShort(info.received, l),
  }, {
    title: x.kResp, rule: info.extended ? fmt(x.extendedOn, { date: fShort(info.respDue, l) }) : x.respRule,
    state: info.resp.state,
    main: respDone ? fmt(x.respDoneOn, { date: fShort(info.resp.at, l) }) : dlMain(x, info.resp),
    sub: respDone ? (info.resp.state === 'met' ? x.dlMet : x.dlLate) : fmt(x.until, { date: fLong(info.respDue, l) }),
    pct: respDone ? 1 : Math.min(1, Math.max(0, info.elapsed / info.totalDays)),
    start: fShort(info.received, l),
  }];
  const part = (i, k) => (x, T, l) => meters(x, l)[i][k];

  return (
    <div className="v2-exp-body">
      <L as="h2" className="v2-vh" k="deadlinesTitle" />
      <div className="v2-dls">
        {meters(t, lang).map((m, i) => (
          <div key={i} className={`v2-dlm is-${m.state}`}>
            <p className="v2-dlm-head"><L pick={part(i, 'title')} /><L className="v2-dlm-rule" pick={part(i, 'rule')} /></p>
            <L as="p" className="v2-dlm-main" pick={part(i, 'main')} />
            <div className="v2-meter" aria-hidden="true"><span style={{ transform: `scaleX(${m.pct})` }} /></div>
            <p className="v2-dlm-foot"><L pick={part(i, 'start')} /><L className="v2-dlm-sub" pick={part(i, 'sub')} /></p>
          </div>
        ))}
      </div>
      {(canAck || canExtend) && (
        <div className="v2-dl-actions">
          {canAck && (
            <>
              <button type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-lead" aria-busy={acking}
                onClick={async () => { setAcking(true); await onAck(); setAcking(false); }}>
                <MailCheck {...ICON} /><L k="ackSend" />
              </button>
              <p className="v2-dl-hint"><Info {...ICON} /><L k="ackSendText" /></p>
            </>
          )}
          {canExtend && (
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => { setExtErr(''); setExtOpen(true); }}>
              <CalendarPlus {...ICON} /><L k="extendBtn" />
            </button>
          )}
        </div>
      )}
      {c.extension_reason && <p className="v2-dl-hint"><Info {...ICON} />{c.extension_reason}</p>}

      <Confirm
        open={extOpen}
        title={t.extendTitle}
        confirmLabel={fmt(t.extendConfirm, { date: fLong(sixMonths(c.created_at), lang) })}
        busyLabel={t.saving}
        cancelLabel={t.cancel}
        busy={extBusy}
        tone="primary"
        onConfirm={async () => {
          if (extReason.trim().length < 10) { setExtErr(t.extendErrReason); return; }
          setExtBusy(true);
          const { until, error } = await extendDeadline(c.id, extReason.trim(), actor);
          setExtBusy(false);
          if (error) { setExtErr(t.extendErr); return; }
          setExtOpen(false);
          setExtReason('');
          notify(fmt(t.extendOk, { date: fLong(`${until}T12:00:00`, lang) }));
          onChanged();
        }}
        onCancel={() => setExtOpen(false)}
      >
        <L as="p" k="extendText" />
        <div className="v2-field v2-dialog-field">
          <label htmlFor="v2-ext-reason"><L k="extendReason" /></label>
          <textarea
            id="v2-ext-reason" className="v2-input v2-note-input" rows={3} maxLength={500}
            value={extReason} onChange={e => { setExtReason(e.target.value); setExtErr(''); }}
            aria-invalid={!!extErr} aria-describedby={extErr ? 'v2-ext-err' : undefined}
          />
        </div>
        {extErr && <p className="v2-err" id="v2-ext-err" role="alert"><CircleAlert {...ICON} />{extErr}</p>}
      </Confirm>
    </div>
  );
}

function sixMonths(iso) {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 6);
  if (d.getDate() < day) d.setDate(0);
  return d;
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
      <L as="h2" className="v2-sec-h" id="v2-facts-t" k="facts" />
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
function Reporter({ c, t, identity, onReveal }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  if (c.is_anonymous) {
    return (
      <section className="v2-sec" aria-labelledby="v2-rep-t">
        <L as="h2" className="v2-sec-h" id="v2-rep-t" k="identityNone" />
        <L as="p" className="v2-sec-lead" k="anonText" />
        <dl className="v2-ficha-block is-no v2-rep-ficha">
          {[t.fName, t.fEmail, t.fPhone].map((label, i) => (
            <div className="v2-f-row" key={i}><dt>{label}</dt><dd><X {...ICON} /><L k="notStored" /></dd></div>
          ))}
        </dl>
      </section>
    );
  }
  // Identificada: les dades de contacte no viatgen amb la denúncia. Es demanen aquí i la consulta queda al registre
  if (!identity) {
    return (
      <section className="v2-sec" aria-labelledby="v2-rep-t">
        <L as="h2" className="v2-sec-h" id="v2-rep-t" k="reporter" />
        <L as="p" className="v2-sec-lead" k="identityShowText" />
        <button
          type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead v2-rep-show" aria-busy={busy}
          onClick={async () => { if (busy) return; setBusy(true); setErr(false); const ok = await onReveal(); if (!ok) { setErr(true); setBusy(false); } }}
        >
          <Eye {...ICON} /><L k="identityShow" />
        </button>
        {err && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{t.identityErr}</p>}
      </section>
    );
  }
  const emailAddr = (identity.reporter_email ?? '').trim();
  return (
    <section className="v2-sec" aria-labelledby="v2-rep-t">
      <L as="h2" className="v2-sec-h" id="v2-rep-t" k="reporter" />
      <L as="p" className="v2-sec-lead" k="identText" />
      <dl className="v2-kv is-contact">
        <div><L as="dt" k="fName" /><dd className={identity.reporter_name ? '' : 'is-empty'}>{identity.reporter_name || t.notProvided}</dd></div>
        <div>
          <L as="dt" k="fEmail" />
          <dd className={emailAddr ? 'v2-kv-row' : 'is-empty'}>
            {emailAddr ? (
              <>
                <a className="v2-link" href={`mailto:${emailAddr}`}><Mail {...ICON} />{emailAddr}</a>
                <button type="button" className="v2-mini-btn" onClick={async () => { if (await copyText(emailAddr)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}>
                  {copied ? <Check {...ICON} /> : <Copy {...ICON} />}<SwapL on={copied} k="copy" kOn="copied" />
                </button>
              </>
            ) : t.notProvided}
          </dd>
        </div>
        <div>
          <L as="dt" k="fPhone" />
          <dd className={identity.reporter_phone ? '' : 'is-empty'}>
            {identity.reporter_phone ? <a className="v2-link" href={`tel:${identity.reporter_phone.replace(/\s/g, '')}`}><Phone {...ICON} />{identity.reporter_phone}</a> : t.notProvided}
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
        <L as="p" className="v2-sec-empty" k="docsNone" />
      ) : (
        <ul className="v2-docs">
          {files.map(a => (
            <li key={a.id}>
              <div className="v2-doc">
                <Paperclip {...ICON} />
                <span className="v2-doc-name" title={a.filename}>{a.filename}</span>
                <span className="v2-doc-size v2-num">{fileSize(a.file_size)}</span>
                <button type="button" className="v2-mini-btn" onClick={() => download(a)} aria-busy={busy === a.id} aria-label={fmt(t.downloadAria, { name: a.filename })}>
                  <Download {...ICON} /><L aria-hidden="true" k="download" />
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
function Messages({ c, t, lang, canReply, messages, actor, onSent }) {
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
    const { error } = await sendMessage(c.id, text, 'manager', actor);
    if (error) { setSending(false); setFeedback({ ok: false, text: t.msgErr }); return; }
    setDraft('');
    await onSent();
    setSending(false);
    requestAnimationFrame(() => document.getElementById('v2-reply')?.focus());
    setFeedback({ ok: true, text: t.msgOk });
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <section className="v2-sec" aria-labelledby="v2-msgs-t">
      <h2 className="v2-sec-h" id="v2-msgs-t">{t.msgs}{messages.length > 0 && <span className="v2-sec-n">{messages.length}</span>}</h2>
      <L as="p" className="v2-sec-lead" k="msgsLead" />

      <div className="v2-thread" aria-live="polite">
        {messages.length === 0 ? (
          <L as="p" className="v2-thread-empty" k="msgsEmpty" />
        ) : messages.map(m => (
          <div key={m.id} className={`v2-msg${m.sender === 'manager' ? ' is-me' : ''}${m.sender === 'reporter' && !m.is_read ? ' is-new' : ''}`}>
            <div className="v2-msg-meta"><b><L k={m.sender === 'reporter' ? 'msgReporter' : 'msgManager'} /></b><span>{fDateTime(m.created_at, lang)}</span></div>
            <p>{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {canReply ? (
        <form className="v2-compose" onSubmit={send}>
          {c.is_anonymous && <p className="v2-compose-tip"><ShieldAlert {...ICON} /><L k="msgAnonTip" /></p>}
          <label className="v2-vh" htmlFor="v2-reply"><L k="msgLabel" /></label>
          <textarea
            id="v2-reply" className="v2-input" rows={4} placeholder={t.msgPh}
            value={draft} readOnly={sending} aria-busy={sending} maxLength={10000}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e); }}
          />
          <div className="v2-compose-row">
            <span role="status" className="v2-compose-status">
              {feedback ? (
                <span className={`v2-feedback ${feedback.ok ? 'is-ok' : 'is-err'}`}>
                  {feedback.ok ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}{feedback.text}
                </span>
              ) : <L className="v2-kbd-hint" k="msgShortcut" />}
            </span>
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm icon-trail" disabled={!draft.trim()} aria-busy={sending}>
              <L k={sending ? 'msgSending' : 'msgSend'} /><Send {...ICON} />
            </button>
          </div>
        </form>
      ) : (
        <p className="v2-sec-empty"><LockKeyhole {...ICON} /><L k="msgNoReply" /></p>
      )}
    </section>
  );
}

// ── Gestió: estat, prioritat i nota interna ─────────────────────────────
function Manage({ c, t, canEdit, canReply, actor, onSaved }) {
  const [status, setStatus] = useState(c.status);
  const [priority, setPriority] = useState(c.priority);
  const [note, setNote] = useState('');
  const [result, setResult] = useState('');
  const [resultErr, setResultErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { setStatus(c.status); setPriority(c.priority); }, [c.status, c.priority]);

  // En resoldre o tancar per primera vegada, cal comunicar el resultat a l'informant (art. 9.2 d)
  const needsResult = ANSWERED.includes(status) && !ANSWERED.includes(c.status) && !c.answered_at;
  const changed = status !== c.status || priority !== c.priority || note.trim() !== '';

  async function save(e) {
    e.preventDefault();
    if (!changed || saving) return;
    if (needsResult && !canReply) { setResultErr(t.resultNoReply); return; }
    if (needsResult && !result.trim()) { setResultErr(t.resultErr); document.getElementById('v2-result')?.focus(); return; }
    setSaving(true);
    setFeedback(null);
    const statusChanged = status !== c.status;
    const prioChanged = priority !== c.priority;
    const text = note.trim();
    if (needsResult) {
      const { error } = await sendMessage(c.id, result.trim(), 'manager', actor);
      if (error) { setSaving(false); setFeedback({ ok: false, text: t.saveErr }); return; }
    }
    if (statusChanged || prioChanged) {
      // El canvi d'estat i de prioritat el registra la base de dades
      const { error } = await updateComplaint(c.id, { ...(statusChanged ? { status } : {}), ...(prioChanged ? { priority } : {}) }, actor);
      if (error) { setSaving(false); setFeedback({ ok: false, text: t.saveErr }); return; }
    }
    if (text) await addComplaintNote(c.id, text, actor);
    setSaving(false);
    setNote('');
    setResult('');
    setResultErr('');
    setFeedback({ ok: true, text: t.saved });
    setTimeout(() => setFeedback(null), 3000);
    onSaved();
  }

  return (
    <section className="v2-sec v2-manage" aria-labelledby="v2-manage-t">
      <L as="h2" className="v2-sec-h" id="v2-manage-t" k="manage" />
      {!canEdit && <p className="v2-sec-lead"><LockKeyhole {...ICON} /><L k="noEdit" /></p>}
      <form onSubmit={save} className="v2-manage-form">
        <Select
          label={t.cStatus} value={status} onChange={setStatus} disabled={!canEdit}
          options={STATUS_ORDER.map(s => ({ value: s, label: t.status[s] }))}
        />
        <Select
          label={t.cPriority} value={priority} onChange={setPriority} disabled={!canEdit}
          options={PRIORITIES.map(p => ({ value: p, label: t.priority[p] }))}
        />
        {canEdit && needsResult && (
          <div className="v2-field">
            <label htmlFor="v2-result"><L k="resultLabel" /></label>
            <L as="p" className="v2-help" id="v2-result-h" k="resultHelp" />
            <textarea
              id="v2-result" className="v2-input v2-note-input" rows={4} maxLength={10000} value={result}
              onChange={e => { setResult(e.target.value); setResultErr(''); }}
              aria-invalid={!!resultErr} aria-describedby={resultErr ? 'v2-result-e v2-result-h' : 'v2-result-h'}
            />
            {resultErr && <p className="v2-err" id="v2-result-e" role="alert"><CircleAlert {...ICON} />{resultErr}</p>}
          </div>
        )}
        {canEdit && (
          <div className="v2-field">
            <label htmlFor="v2-note"><L k="note" /></label>
            <textarea id="v2-note" className="v2-input v2-note-input" rows={3} placeholder={t.notePh} value={note} onChange={e => setNote(e.target.value)} />
            <L as="p" className="v2-help" k="noteHelp" />
          </div>
        )}
        {canEdit && (
          <div className="v2-manage-foot">
            <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" aria-disabled={!changed} aria-busy={saving}>
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
  const items = [...logs].reverse();
  return (
    <section className="v2-sec" aria-labelledby="v2-audit-t">
      <L as="h2" className="v2-sec-h" id="v2-audit-t" k="audit" />
      {items.length === 0 ? (
        <L as="p" className="v2-sec-empty" k="auditEmpty" />
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
      <L className="v2-vh" role="status" k="loading" />
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
