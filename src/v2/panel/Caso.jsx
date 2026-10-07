import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ellipsis, Pencil, Check, X, Paperclip, Download, CircleAlert, LockKeyhole, Archive, Eraser, CalendarPlus,
  MessageSquareReply, RotateCcw, Search, Eye, FileQuestion,
} from 'lucide-react';
import {
  getComplaintById, getReporterIdentity, getMessages, sendMessage, getAuditLogs, updateComplaint, addComplaintNote,
  markMessagesRead, extendDeadline, anonymizeComplaint, getAttachmentUrl, markMeetingHeld, markFiscalReferral, listAssignees, hasRedesign,
} from '../../lib/supabase.js';
import { translations } from '../../translations.js';
import { fmt } from '../V2Layout.jsx';
import { deadlineInfo, fDateTime, fLong, fShort, auditText, PRIORITIES } from '../admin/adminKit.jsx';
import { Button, IconButton, Card, Chip, Chips, Field, StepBar, ChatThread, ChatComposer, Dialog, Menu, MenuItem, Skeleton } from '../ui/index.js';
import { deadlineLook } from '../ui/DeadlineChip.jsx';
import { usePanel, Tp, caseState, caseTitle, relDay, historyText, OUTCOMES, CLOSED } from './kit.jsx';

function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}
function sixMonths(iso) {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 6);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/** Ficha de un caso: qué ha contado, la conversación y un único botón con el siguiente paso */
export default function Caso() {
  const { id } = useParams();
  const location = useLocation();
  const { lang, t, tr, p, can, profile, email, org, notify } = usePanel();
  const backTo = `/admin${location.state?.from ?? ''}`;
  const actor = profile?.full_name || email;

  const [c, setC] = useState(undefined); // undefined: cargando · null: no encontrada
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [people, setPeople] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [dialog, setDialog] = useState(null); // ack | close | note | extend | suppress | fiscal
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState('');
  const [dErr, setDErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const [editing, setEditing] = useState(null); // título en edición
  const [idBusy, setIdBusy] = useState(false);
  const [idErr, setIdErr] = useState(false);
  const [fileNote, setFileNote] = useState(null);
  const autoStep = useRef(location.state?.step ?? null);

  async function loadAll() {
    setC(undefined);
    setIdentity(null);
    setLoadErr(false);
    const [{ complaint, error }, { messages: msgs }, { logs: l }] = await Promise.all([getComplaintById(id), getMessages(id), getAuditLogs(id)]);
    // Un fallo de red no es lo mismo que un caso que no existe
    if (error && !complaint && error.code !== 'PGRST116' && error.message !== 'not-found') { setLoadErr(true); setC(null); return; }
    setC(complaint ?? null);
    setMessages(msgs ?? []);
    setLogs(l ?? []);
    // Al abrirlo, los mensajes de quien informa quedan leídos
    if (complaint && (msgs ?? []).some(m => m.sender === 'reporter' && !m.is_read)) markMessagesRead(complaint.id);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => { listAssignees().then(({ people: list }) => setPeople(list ?? [])); }, []);
  useEffect(() => { if (c) document.title = `${c.reference} · ${org?.name ?? ''}`; }, [c, org]);

  async function refresh() {
    const [{ complaint }, { messages: msgs }, { logs: l }] = await Promise.all([getComplaintById(id), getMessages(id), getAuditLogs(id)]);
    if (complaint) setC(complaint);
    setMessages(msgs ?? []);
    setLogs(l ?? []);
  }

  const open = (name, initial = '') => { setText(initial); setOutcome(c?.outcome ?? ''); setDErr(''); setDialog(name); };
  const closeDialog = () => { if (!busy) setDialog(null); };
  // El texto del acuse va en el idioma de quien informó
  const tpl = (key) => translations[c?.language]?.panel?.[key] ?? p[key];

  // Si se llegó moviendo la tarjeta en el tablero, el paso se abre preparado (no se envía nada solo)
  useEffect(() => {
    if (!c || !autoStep.current) return;
    const step = autoStep.current;
    autoStep.current = null;
    if (step === 'ack' && c.status === 'received') open('ack', tpl('ackTpl'));
    if (step === 'close' && ['reviewing', 'investigating', 'waiting'].includes(c.status)) open('close');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  if (c === undefined) {
    return (
      <div className="pn-page" aria-busy="true">
        <span className="ds-vh" role="status">{p.loading}</span>
        <Skeleton width={120} /><Skeleton width="70%" height={44} /><Skeleton height={120} />
        <div className="cs-grid" aria-hidden="true"><Skeleton height={320} /><Skeleton height={320} /></div>
      </div>
    );
  }
  if (c === null || !can('view', c.category)) {
    const denied = c !== null;
    return (
      <div className="pn-page">
        <Link className="pn-back" to={backTo}><ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />{p.back}</Link>
        <Card tone="bg" className="pn-empty">
          {denied ? <LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" /> : loadErr ? <CircleAlert size={28} strokeWidth={1.7} aria-hidden="true" /> : <FileQuestion size={28} strokeWidth={1.7} aria-hidden="true" />}
          <h1 className="pn-empty-t">{denied ? t.noViewTitle : loadErr ? t.loadErrTitle : t.notFoundTitle}</h1>
          <p>{denied ? t.noViewText : loadErr ? t.loadErrText : t.notFoundText}</p>
          {loadErr ? <Button variant="ink" size="sm" onClick={loadAll}>{p.retry}</Button> : <Button variant="ink" size="sm" to="/admin">{p.back}</Button>}
        </Card>
      </div>
    );
  }

  const erased = !!c.anonymized_at;
  const canEdit = can('edit', c.category) && !erased;
  const canReply = can('reply', c.category) && !erased;
  const canDelete = can('delete', c.category) && !erased;
  const s = caseState(c);
  const info = deadlineInfo(c);
  const answered = CLOSED.includes(c.status);
  const stepAt = c.status === 'received' ? 1 : c.status === 'reviewing' ? 2 : answered ? 4 : 3;
  const redesign = hasRedesign();
  const cats = tr.canal.cats;
  const meeting = s.meeting;
  // Mensajes del equipo desde que se pidió la reunión (o desde el acuse): si hay alguno, ya se ha propuesto
  const meetFrom = new Date(Math.max(new Date(c.meeting_requested_at ?? c.created_at), new Date(c.acknowledged_at ?? 0)));
  const proposed = messages.some(m => m.sender === 'manager' && new Date(m.created_at) > meetFrom);

  // ── Acciones ──────────────────────────────────────────────────────────
  async function run(fn, okText) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { notify(p.saveErr, 'err'); return false; }
    if (okText) notify(okText);
    await refresh();
    return true;
  }
  const change = (patch, okText = p.saved) => run(() => updateComplaint(c.id, patch, actor), okText);

  async function sendAck() {
    if (!text.trim()) { setDErr(p.closeErrMsg); return; }
    setBusy(true);
    const { error } = await sendMessage(c.id, text.trim(), 'manager', actor);
    if (error) { setBusy(false); setDErr(p.ackErr); return; }
    await updateComplaint(c.id, { status: 'reviewing' }, actor);
    setBusy(false);
    setDialog(null);
    notify(p.ackSent);
    refresh();
  }
  async function sendClose() {
    if (!outcome) { setDErr(p.closeErrOutcome); return; }
    if (!text.trim()) { setDErr(p.closeErrMsg); return; }
    setBusy(true);
    const { error } = await sendMessage(c.id, text.trim(), 'manager', actor);
    if (error) { setBusy(false); setDErr(p.msgErr); return; }
    const { error: e2 } = await updateComplaint(c.id, { status: 'resolved', outcome }, actor);
    setBusy(false);
    if (e2) { setDErr(p.saveErr); return; }
    setDialog(null);
    notify(p.closedOk);
    refresh();
  }
  async function saveNote() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await addComplaintNote(c.id, text.trim(), actor);
    setBusy(false);
    if (error) { setDErr(p.saveErr); return; }
    setDialog(null);
    notify(p.noteOk);
    refresh();
  }
  async function doExtend() {
    if (text.trim().length < 10) { setDErr(t.extendErrReason); return; }
    setBusy(true);
    const { until, error } = await extendDeadline(c.id, text.trim(), actor);
    setBusy(false);
    if (error) { setDErr(t.extendErr); return; }
    setDialog(null);
    notify(fmt(t.extendOk, { date: fLong(`${until}T12:00:00`, lang) }));
    refresh();
  }
  async function doSuppress() {
    if (text.trim().length < 5) { setDErr(t.supErrReason); return; }
    setBusy(true);
    const { error } = await anonymizeComplaint(c.id, text.trim(), actor);
    setBusy(false);
    if (error) { setDErr(t.delErr); return; }
    setDialog(null);
    notify(fmt(t.deleted, { code: c.reference }));
    loadAll();
  }
  async function doFiscal() {
    const ok = await run(() => markFiscalReferral(c.id, text.trim(), actor), p.fiscalOk);
    if (ok) setDialog(null);
  }
  async function send(body) {
    setSending(true);
    setSendErr(false);
    const { error } = await sendMessage(c.id, body, 'manager', actor);
    setSending(false);
    if (error) { setSendErr(true); return; }
    setDraft('');
    refresh();
  }
  async function saveTitle() {
    const ok = await change({ title: editing });
    if (ok) setEditing(null);
  }
  async function reveal() {
    if (idBusy) return;
    setIdBusy(true);
    setIdErr(false);
    const { identity: found, error } = await getReporterIdentity(c.id);
    setIdBusy(false);
    if (error || !found) { setIdErr(true); return; }
    setIdentity(found);
    const { logs: l } = await getAuditLogs(id);
    setLogs(l ?? []);
  }
  async function download(a) {
    setFileNote(null);
    const { url, demo, error } = await getAttachmentUrl(a.storage_path);
    if (demo) { setFileNote({ id: a.id, text: t.downloadDemo }); return; }
    if (error || !url) { setFileNote({ id: a.id, text: p.downloadErr, err: true }); return; }
    window.open(url, '_blank', 'noopener');
  }
  async function exportPdf() {
    try {
      // El historial va con el texto ya traducido para que el PDF lo muestre como se ve aquí
      const audit_logs = logs.map(l => (l.action === 'created' ? l : { ...l, action: historyText(p, t, l), details: { note: l.details?.note ?? '' } }));
      const { exportComplaintToPDF } = await import('../lib/exportV2.js');
      // La identidad solo sale en el PDF si se ha consultado en esta ficha (y la consulta ya consta en el historial)
      await exportComplaintToPDF({ ...c, ...(identity ?? { identityWithheld: true }), tracking_code: c.reference, organization: org?.name ?? '', audit_logs, deadline: info }, messages, lang);
    } catch { notify(p.exportErr, 'err'); }
  }
  // «Proponer la reunión»: deja el mensaje preparado en la conversación para que se edite y se envíe
  function proposeMeeting() {
    setDraft(tpl('meetTpl'));
    requestAnimationFrame(() => { const el = document.getElementById('cs-msg'); el?.scrollIntoView({ block: 'center' }); el?.focus(); });
  }

  // ── El siguiente paso: uno solo ───────────────────────────────────────
  let next = null;
  if (!erased && !answered) {
    if (c.status === 'received') next = { label: p.n1, ok: canEdit && canReply, go: () => open('ack', tpl('ackTpl')) };
    else if (meeting?.pending) next = proposed
      ? { label: p.n2b, ok: canEdit, go: () => run(() => markMeetingHeld(c.id, actor), p.meetOk) }
      : { label: p.n2a, ok: canReply, go: proposeMeeting };
    else if (c.status === 'reviewing') next = { label: p.n3, ok: canEdit, go: () => change({ status: 'investigating' }, p.invOk) };
    else next = { label: p.n4, ok: canEdit && canReply, go: () => open('close') };
  }

  const line = (kind, days) => { const look = deadlineLook(kind, days); return { ...look, text: fmt(tr.ds[look.k], { n: look.n }) }; };
  const deadlines = [];
  if (!erased) {
    if (c.status === 'received') deadlines.push(line('ack', info.ack.days));
    else if (info.ack.at) deadlines.push({ tone: 'done', text: fmt(p.ackDoneOn, { date: fShort(info.ack.at, lang) }) });
    if (meeting?.pending) { const m = line('meeting', meeting.days); deadlines.push({ ...m, text: `${m.text} (${p.meetLegal})` }); }
    if (answered) deadlines.push({ tone: 'done', text: fmt(p.respondedOn, { date: fShort(info.resp.at, lang) }) });
    else deadlines.push(line('resp', info.resp.days));
  }

  const when = c.incident_when || (c.incident_date ? fLong(`${c.incident_date}T12:00:00`, lang) : '');
  const facts = [[p.where, c.department], [p.when, when], [p.who, c.involved_people], [p.lang, t.langs?.[c.language] ?? c.language]].filter(([, v]) => v);
  const files = c.attachments ?? [];
  const thread = messages.map(m => ({
    id: m.id, mine: m.sender === 'manager', author: m.sender === 'manager' ? (org?.name ?? '') : p.reporter,
    when: fDateTime(m.created_at, lang), text: m.content, isNew: m.sender === 'reporter' && !m.is_read,
  }));
  const history = [...logs].reverse();
  const title = caseTitle(c, p);
  const via = p.via[c.channel ?? 'web'] ?? p.via.other;

  return (
    <div className="pn-page cs">
      <div className="cs-bar">
        <Link className="pn-back" to={backTo}><ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />{p.back}</Link>
        <div className="cs-bar-tools">
          <Button variant="bg" size="sm" onClick={exportPdf}>{p.exportOne}</Button>
          {(canEdit || canDelete) && (
            <Menu label={p.more} trigger={props => <IconButton variant="bg" label={p.more} {...props}><Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" /></IconButton>}>
              {canEdit && !info.extended && !answered && <MenuItem icon={<CalendarPlus size={16} aria-hidden="true" />} onClick={() => open('extend')}>{p.extend}</MenuItem>}
              {canEdit && c.status === 'investigating' && <MenuItem icon={<MessageSquareReply size={16} aria-hidden="true" />} onClick={() => change({ status: 'waiting' }, p.statusOk)}>{p.toWaiting}</MenuItem>}
              {canEdit && c.status === 'waiting' && <MenuItem icon={<Search size={16} aria-hidden="true" />} onClick={() => change({ status: 'investigating' }, p.statusOk)}>{p.toInvestigating}</MenuItem>}
              {canEdit && ['resolved', 'closed'].includes(c.status) && <MenuItem icon={<Archive size={16} aria-hidden="true" />} onClick={() => change({ status: 'archived' }, p.statusOk)}>{p.archive}</MenuItem>}
              {canEdit && answered && <MenuItem icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => change({ status: 'investigating' }, p.statusOk)}>{p.reopen}</MenuItem>}
              {canDelete && <><div className="ds-menu-sep" /><MenuItem danger icon={<Eraser size={16} aria-hidden="true" />} onClick={() => open('suppress')}>{p.suppress}</MenuItem></>}
            </Menu>
          )}
        </div>
      </div>

      <div className="cs-head">
        <span className="cs-meta">{c.reference} · {fmt(p.received, { when: `${relDay(c.created_at, p)}, ${new Date(c.created_at).toLocaleTimeString(lang === 'en' ? 'en-GB' : lang === 'ca' ? 'ca-ES' : 'es-ES', { hour: '2-digit', minute: '2-digit' })}`, via })}</span>
        {editing !== null ? (
          <form className="cs-title-edit" onSubmit={e => { e.preventDefault(); saveTitle(); }}>
            <Field label={p.titleLabel} help={p.titleHelp} value={editing} maxLength={160} autoFocus onChange={e => setEditing(e.target.value)} />
            <div className="cs-title-btns">
              <Button type="submit" variant="ink" size="sm" busy={busy} icon={<Check size={16} strokeWidth={2.6} aria-hidden="true" />}>{p.save}</Button>
              <Button variant="bg" size="sm" onClick={() => setEditing(null)} icon={<X size={16} strokeWidth={2.4} aria-hidden="true" />}>{p.cancel}</Button>
            </div>
          </form>
        ) : (
          <div className="cs-title">
            <h1>{title}</h1>
            {redesign && canEdit && <IconButton variant="bg" size="xs" label={p.editTitle} onClick={() => setEditing(c.title ?? '')}><Pencil size={16} strokeWidth={2} aria-hidden="true" /></IconButton>}
          </div>
        )}
        <Chips>
          <Chip size="md">{cats[c.category]?.[0] ?? c.category}</Chip>
          <Chip size="md">{c.is_anonymous ? p.anon : p.ident}</Chip>
          {p.prioChip[c.priority] && <Chip size="md" tone={c.priority === 'critical' ? 'danger' : c.priority === 'high' ? 'warn' : 'neutral'}>{p.prioChip[c.priority]}</Chip>}
          {meeting?.pending && <Chip size="md" tone="report">{p.askMeeting}</Chip>}
          {c.status === 'waiting' && <Chip size="md" tone="report">{p.waitingChip}</Chip>}
          {c.status === 'archived' && <Chip size="md">{p.archivedChip}</Chip>}
          {info.extended && !answered && <Chip size="md">{p.extendedChip}</Chip>}
          {c.fiscal_referral_at && <Chip size="md" tone="warn">{p.fiscalChip}</Chip>}
        </Chips>
      </div>

      {erased ? (
        <Card tone="bg" className="cs-erased"><Archive size={22} strokeWidth={1.8} aria-hidden="true" /><p><b>{fmt(t.anonBanner, { date: fLong(c.anonymized_at, lang) })}</b> {t.anonBannerText}</p></Card>
      ) : (
        <section className="cs-next ds-on-ink" aria-label={p.next}>
          <div className="cs-next-main">
            <StepBar tone="ink" current={stepAt} names={p.steps} label={p.stepsLabel} />
            <p className="cs-deadlines">{deadlines.map((d, i) => <span key={i} className={`is-${d.tone}`}>{d.text}</span>)}</p>
            {c.extension_reason && <p className="cs-ext">{c.extension_reason}</p>}
          </div>
          <div className="cs-next-do">
            {next && <span className="cs-next-label">{p.next}</span>}
            {next ? (
              next.ok
                ? <Button variant="white" size="md" full busy={busy && !dialog} onClick={next.go}><Tp lang={lang} pick={() => next.label} /></Button>
                : <p className="cs-next-note"><LockKeyhole size={16} strokeWidth={2} aria-hidden="true" />{next.label}. {p.noPerm}</p>
            ) : <p className="cs-next-note is-done"><Check size={18} strokeWidth={2.6} aria-hidden="true" />{fmt(p.closedOn, { date: fLong(c.answered_at ?? c.updated_at, lang) })}</p>}
          </div>
        </section>
      )}

      <div className="cs-grid">
        <div className="cs-main">
          <Card tone="outline" as="section" aria-labelledby="cs-told">
            <h2 className="ds-card-title" id="cs-told">{p.told}</h2>
            <p className="cs-desc">{c.description}</p>
            {(facts.length > 0 || files.length > 0) && (
              <dl className="cs-facts">
                {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                {files.length > 0 && (
                  <div className="is-files">
                    <dt>{p.proof}</dt>
                    <dd>
                      <ul>
                        {files.map(a => (
                          <li key={a.id}>
                            <button type="button" className="cs-file" onClick={() => download(a)} aria-label={fmt(p.downloadAria, { name: a.filename })}>
                              <Paperclip size={15} strokeWidth={2} aria-hidden="true" /><span>{a.filename}</span><small>{fileSize(a.file_size)}</small><Download size={15} strokeWidth={2} aria-hidden="true" />
                            </button>
                            {fileNote?.id === a.id && <span className={`cs-file-note${fileNote.err ? ' is-err' : ''}`} role="status">{fileNote.text}</span>}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          <Card tone="outline" as="section" aria-labelledby="cs-conv">
            <div className="cs-conv-head"><h2 className="ds-card-title" id="cs-conv">{p.conv}</h2><span>{p.convNote}</span></div>
            <ChatThread lang={lang} messages={thread} label={p.conv} empty={c.status === 'received' ? p.convEmptyFirst : p.convEmpty} />
            {erased ? null : canReply ? (
              <>
                {sendErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{p.msgErr}</p>}
                <ChatComposer lang={lang} id="cs-msg" stacked value={draft} onChange={setDraft} onSend={send} busy={sending} placeholder={c.is_anonymous ? p.msgPh : p.msgPhIdent} sendLabel={p.send} />
              </>
            ) : <p className="cs-locked"><LockKeyhole size={16} strokeWidth={2} aria-hidden="true" />{p.noReply}</p>}
          </Card>
        </div>

        <aside className="cs-side">
          {!erased && (
            <Card tone="bg" as="section" aria-labelledby="cs-manage">
              <h2 className="ds-card-title is-sm" id="cs-manage">{p.manageT}</h2>
              <Field as="select" size="sm" plain label={p.priority} value={c.priority} disabled={!canEdit || busy} onChange={e => change({ priority: e.target.value })}>
                {PRIORITIES.map(v => <option key={v} value={v}>{p.prios[v]}</option>)}
              </Field>
              {redesign && (
                <Field as="select" size="sm" plain label={p.owner} value={c.assigned_to ?? ''} disabled={!canEdit || busy} onChange={e => change({ assigned_to: e.target.value || null })}>
                  <option value="">{p.nobody}</option>
                  {people.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}
                </Field>
              )}
              {canEdit && <Button variant="white" size="sm" full onClick={() => open('note')}>{p.addNote}</Button>}
            </Card>
          )}

          {meeting && !erased && (
            <Card tone="bg" as="section" aria-labelledby="cs-meet">
              <h2 className="ds-card-title is-sm" id="cs-meet">{p.meetT}</h2>
              {meeting.heldAt ? <p className="cs-p">{fmt(p.meetHeld, { date: fLong(meeting.heldAt, lang) })}</p> : (
                <>
                  <p className="cs-p">{fmt(p.meetPending, { date: fLong(meeting.due, lang) })} <b className={meeting.days < 0 ? 'is-over' : undefined}>
                    {meeting.days < -1 ? fmt(p.meetOverN, { n: -meeting.days }) : meeting.days === -1 ? p.meetOver1 : meeting.days === 0 ? p.meetToday : meeting.days === 1 ? p.meetLeft1 : fmt(p.meetLeftN, { n: meeting.days })}
                  </b></p>
                  {canEdit && meeting.pending && <Button variant="white" size="sm" full busy={busy && !dialog} onClick={() => run(() => markMeetingHeld(c.id, actor), p.meetOk)}>{p.meetMark}</Button>}
                </>
              )}
            </Card>
          )}

          {!erased && (
            <Card tone="bg" as="section" aria-labelledby="cs-close">
              <h2 className="ds-card-title is-sm" id="cs-close">{p.closeT}</h2>
              <Field as="select" size="sm" plain label={p.outcome} value={c.outcome ?? ''} disabled={!canEdit || busy} onChange={e => change({ outcome: e.target.value || null })}>
                <option value="">{p.outcomes.none}</option>
                {OUTCOMES.map(v => <option key={v} value={v}>{p.outcomes[v]}</option>)}
              </Field>
              {c.fiscal_referral_at
                ? <p className="cs-p">{fmt(p.fiscalDone, { date: fLong(c.fiscal_referral_at, lang) })}</p>
                : canEdit && <button type="button" className="pn-link" onClick={() => open('fiscal')}>{p.fiscal}</button>}
            </Card>
          )}

          {!erased && (
            <Card tone="bg" as="section" aria-labelledby="cs-ident">
              <h2 className="ds-card-title is-sm" id="cs-ident">{p.identT}</h2>
              {c.is_anonymous ? <p className="cs-p">{p.identAnon}</p> : identity ? (
                <dl className="cs-ident">
                  <div><dt>{p.name}</dt><dd>{identity.reporter_name || p.notGiven}</dd></div>
                  <div><dt>{p.email}</dt><dd>{identity.reporter_email ? <a href={`mailto:${identity.reporter_email}`}>{identity.reporter_email}</a> : p.notGiven}</dd></div>
                  <div><dt>{p.phone}</dt><dd>{identity.reporter_phone ? <a href={`tel:${identity.reporter_phone.replace(/\s/g, '')}`}>{identity.reporter_phone}</a> : p.notGiven}</dd></div>
                </dl>
              ) : (
                <>
                  <p className="cs-p">{p.identWarn}</p>
                  <Button variant="white" size="sm" full busy={idBusy} onClick={reveal} icon={<Eye size={16} strokeWidth={2} aria-hidden="true" />}>{p.identShow}</Button>
                  {idErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{p.identErr}</p>}
                </>
              )}
            </Card>
          )}

          <Card tone="bg" as="section" aria-labelledby="cs-hist">
            <h2 className="ds-card-title is-sm" id="cs-hist">{p.history}</h2>
            <ol className="cs-hist">
              {history.map((l, i) => (
                <li key={l.id} className={i === 0 ? 'is-last' : undefined}>
                  <span className="cs-dot" aria-hidden="true" />
                  <span><b>{historyText(p, t, l)}</b><time dateTime={l.created_at}>{fDateTime(l.created_at, lang)}</time>{l.details?.note && <q>{l.details.note}</q>}</span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {/* ── Diálogos propios: nada se envía ni se borra sin verlo antes ── */}
      <Dialog open={dialog === 'ack'} onClose={closeDialog} title={p.ackTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="ink" size="md" busy={busy} onClick={sendAck}>{p.ackSend}</Button></>}>
        <p>{p.ackText}</p>
        <Field as="textarea" rows={5} label={p.ackLabel} value={text} maxLength={10000} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'close'} onClose={closeDialog} title={p.closeTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="ink" size="md" busy={busy} onClick={sendClose}>{p.closeSend}</Button></>}>
        <p>{p.closeText}</p>
        <Field as="select" size="sm" label={p.outcome} value={outcome} onChange={e => { setOutcome(e.target.value); setDErr(''); }}>
          <option value="">{p.outcomes.none}</option>
          {OUTCOMES.map(v => <option key={v} value={v}>{p.outcomes[v]}</option>)}
        </Field>
        <Field as="textarea" rows={5} label={p.finalMsg} value={text} maxLength={10000} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'note'} onClose={closeDialog} title={p.noteTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="ink" size="md" busy={busy} disabled={!text.trim()} onClick={saveNote}>{p.noteSave}</Button></>}>
        <p>{p.noteText}</p>
        <Field as="textarea" rows={4} label={p.noteLabel} hideLabel value={text} maxLength={2000} error={dErr} onChange={e => setText(e.target.value)} />
      </Dialog>

      <Dialog open={dialog === 'extend'} onClose={closeDialog} title={t.extendTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="ink" size="md" busy={busy} onClick={doExtend}>{fmt(t.extendConfirm, { date: fLong(sixMonths(c.created_at), lang) })}</Button></>}>
        <p>{t.extendText}</p>
        <Field as="textarea" rows={3} label={t.extendReason} value={text} maxLength={500} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'suppress'} onClose={closeDialog} title={fmt(t.supTitle, { code: c.reference })}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="danger" size="md" busy={busy} onClick={doSuppress}>{busy ? t.deleting : t.delConfirm}</Button></>}>
        <p>{t.supText}</p>
        <Field as="textarea" rows={3} label={t.supReason} placeholder={t.supReasonPh} value={text} maxLength={500} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'fiscal'} onClose={closeDialog} title={p.fiscalTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="ink" size="md" busy={busy} onClick={doFiscal}>{p.fiscalDo}</Button></>}>
        <p>{p.fiscalText}</p>
        <Field as="textarea" rows={3} label={p.fiscalNote} value={text} maxLength={500} onChange={e => setText(e.target.value)} />
      </Dialog>
    </div>
  );
}
