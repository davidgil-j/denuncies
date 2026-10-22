import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ellipsis, Pencil, Check, X, Paperclip, Download, CircleAlert, LockKeyhole, Archive, Eraser, CalendarPlus,
  MessageSquareReply, RotateCcw, Search, Eye, Scale, Flag, FileText, FileDown, MessageSquare, Send, SlidersHorizontal, CalendarDays, CircleCheck, User, Users, History,
} from 'lucide-react';
import {
  getComplaintById, getReporterIdentity, getMessages, sendMessage, getAuditLogs, updateComplaint, addComplaintNote,
  markMessagesRead, extendDeadline, anonymizeComplaint, getAttachmentUrl, markMeetingHeld, markFiscalReferral, listAssignees, hasRedesign, AI_ENABLED,
  listComplaintAccess, excludeFromComplaint, includeInComplaint,
} from '../../lib/supabase.js';
import { translations } from '../../translations.js';
import './texts.js'; // textos del panel (lado Gestionar)
import { fmt } from '../V2Layout.jsx';
import { deadlineInfo, fDateTime, fLong, fShort, auditText, PRIORITIES } from '../admin/adminKit.jsx';
import { extensionUntil } from '../../lib/deadlines.js';
import { Button, IconButton, Card, Chip, Field, Segmented, StepBar, ChatThread, ChatComposer, Dialog, Menu, MenuItem, Skeleton, cx } from '../ui/index.js';
import { deadlineLook } from '../ui/DeadlineChip.jsx';
import { usePanel, Tp, caseState, caseTitle, historyText, blanksError, sameAsColumn, OUTCOMES, CLOSED } from './kit.jsx';
import { AiSummary, AiDraft } from './Ia.jsx';
import { formatBytes } from '../../lib/format.js';


// Icono pequeño de un título de sección (16 px, trazo 2), en el color de acento por CSS
const ti = (Icon) => <Icon size={16} strokeWidth={2} aria-hidden="true" />;
const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

/**
 * Ficha de un caso: el siguiente paso en una franja con su único botón de color; lo que ha contado, la
 * conversación en su bloque y las notas internas aparte; y, a la derecha, una sola columna de gestión.
 * En el móvil va en tres pestañas (Resumen, Conversación y Gestión), con el siguiente paso fijo abajo.
 */
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
  const [access, setAccess] = useState(null); // null: cargando · false: la base de datos no lo ofrece · []: lista
  const [accessBusy, setAccessBusy] = useState(null); // id de la persona que se está apartando/devolviendo
  const [accessErr, setAccessErr] = useState('');
  const [identity, setIdentity] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [dialog, setDialog] = useState(null); // ack | close | extend | suppress | fiscal
  const [note, setNote] = useState(''); // la nota interna que se está escribiendo
  // Solo cuentan en el móvil: la pestaña a la vista, la descripción entera o resumida y el campo de la nota abierto
  const [tab, setTab] = useState('summary');
  const [fullDesc, setFullDesc] = useState(false);
  const [cutDesc, setCutDesc] = useState(false);
  const descRef = useRef(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState('');
  const [dErr, setDErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const [blankErr, setBlankErr] = useState('');
  const [editing, setEditing] = useState(null); // título en edición
  const [idBusy, setIdBusy] = useState(false);
  const [idErr, setIdErr] = useState(false);
  const [fileNote, setFileNote] = useState(null);
  const autoStep = useRef(location.state?.step ?? null);
  // Acuse o respuesta final que ya han salido aunque el cambio de estado fallara: al reintentar no se repiten
  const sentRef = useRef(null);

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
    // Al abrirlo, los mensajes de quien informa quedan leídos (solo si quien lo abre puede responder: si no,
    // el aviso de «mensaje nuevo» desaparecería para quien sí tiene que hacerlo)
    if (complaint && can('reply', complaint.category) && (msgs ?? []).some(m => m.sender === 'reporter' && !m.is_read)) markMessagesRead(complaint.id);
  }
  // Al abrir otro caso la ficha vuelve a «Resumen», con la descripción plegada y el campo de la nota cerrado
  useEffect(() => { setTab('summary'); setFullDesc(false); setNoteOpen(false); loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => { listAssignees().then(({ people: list }) => setPeople(list ?? [])); }, []);
  // Quién gestiona el caso y quién está apartado (C1). false si la base de datos aún no lo ofrece (sin la 020)
  useEffect(() => {
    let alive = true;
    setAccess(null); setAccessErr('');
    listComplaintAccess(id).then(({ people: list, missing }) => { if (alive) setAccess(missing ? false : (list ?? [])); }).catch(() => { if (alive) setAccess(false); });
    return () => { alive = false; };
  }, [id]);
  useEffect(() => { if (c) document.title = `${c.reference} · ${org?.name ?? ''}`; }, [c, org]);
  // En el móvil la descripción se corta a unas líneas: «Leer entero» solo aparece si de verdad hay más texto
  useEffect(() => { const el = descRef.current; if (el && !fullDesc) setCutDesc(el.scrollHeight > el.clientHeight + 1); }, [c?.description, fullDesc, tab]);

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
        <Link className="pn-back" to={backTo}><ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />{p.back}</Link>
        <Card className="pn-empty">
          <h1 className="pn-empty-t">{denied ? t.noViewTitle : loadErr ? t.loadErrTitle : t.notFoundTitle}</h1>
          <p>{denied ? t.noViewText : loadErr ? t.loadErrText : t.notFoundText}</p>
          {loadErr ? <Button variant="report" size="sm" onClick={loadAll}>{p.retry}</Button> : <Button variant="soft" size="sm" to="/admin">{p.back}</Button>}
        </Card>
      </div>
    );
  }

  const erased = !!c.anonymized_at;
  const canEdit = can('edit', c.category) && !erased;
  const canReply = can('reply', c.category) && !erased;
  const canDelete = can('delete', c.category) && !erased;
  const isAdmin = profile?.role === 'superadmin';
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
    if (busy) return false;
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
    if (busy) return;
    if (!text.trim()) { setDErr(p.closeErrMsg); return; }
    if (blanksError(text, p)) { setDErr(blanksError(text, p)); return; }
    setBusy(true);
    if (sentRef.current !== `ack:${c.id}`) {
      const { error } = await sendMessage(c.id, text.trim(), 'manager', actor);
      if (error) { setBusy(false); setDErr(p.ackErr); return; }
      sentRef.current = `ack:${c.id}`;
    }
    const { error: e2 } = await updateComplaint(c.id, { status: 'reviewing' }, actor);
    setBusy(false);
    if (e2) { setDErr(p.ackPartial); refresh(); return; }
    sentRef.current = null;
    setDialog(null);
    // Si el acuse salió de lo escrito en la conversación, se vacía el campo
    if (draft.trim() && draft.trim() === text.trim()) setDraft('');
    notify(p.ackSent);
    refresh();
  }
  async function sendClose() {
    if (busy) return;
    if (!outcome) { setDErr(p.closeErrOutcome); return; }
    if (!text.trim()) { setDErr(p.closeErrMsg); return; }
    if (blanksError(text, p)) { setDErr(blanksError(text, p)); return; }
    setBusy(true);
    if (sentRef.current !== `close:${c.id}`) {
      const { error } = await sendMessage(c.id, text.trim(), 'manager', actor);
      if (error) { setBusy(false); setDErr(p.msgErr); return; }
      sentRef.current = `close:${c.id}`;
    }
    const { error: e2 } = await updateComplaint(c.id, { status: 'resolved', outcome }, actor);
    setBusy(false);
    if (e2) { setDErr(p.closePartial); refresh(); return; }
    sentRef.current = null;
    setDialog(null);
    notify(p.closedOk);
    refresh();
  }
  async function saveNote(e) {
    e.preventDefault();
    if (busy || !note.trim()) return;
    setBusy(true);
    const { error } = await addComplaintNote(c.id, note.trim(), actor);
    setBusy(false);
    if (error) { notify(p.saveErr, 'err'); return; }
    setNote('');
    notify(p.noteOk);
    refresh();
  }
  async function doExtend() {
    if (busy) return;
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
    if (busy) return;
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
    // Con el caso en «Recibida», el primer mensaje es el acuse de recibo: se abre su diálogo con lo escrito
    if (c.status === 'received' && canEdit) { open('ack', body); return; }
    // Una plantilla a medio rellenar («el [día] a las [hora]») no sale hacia quien informa
    const missing = blanksError(body, p);
    setBlankErr(missing);
    if (missing) { document.getElementById('cs-msg')?.focus(); return; }
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
  // Apartar a alguien del caso o devolverle el acceso (C1). Al acabar, se recarga la lista y el historial.
  async function toggleAccess(person, restore) {
    if (accessBusy) return;
    setAccessBusy(person.id);
    setAccessErr('');
    const { error } = restore ? await includeInComplaint(c.id, person.id) : await excludeFromComplaint(c.id, person.id);
    setAccessBusy(null);
    if (error) { setAccessErr(/last-viewer/.test(error.message ?? '') ? p.accessLast : p.accessErr); return; }
    const { people: list, missing } = await listComplaintAccess(id);
    if (!missing) setAccess(list ?? []);
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
      await exportComplaintToPDF({ ...c, ...(identity ?? { identityWithheld: true }), tracking_code: c.reference, organization: org ?? '', audit_logs, deadline: info }, messages, lang);
    } catch { notify(p.exportErr, 'err'); }
  }
  // «Proponer la reunión»: deja el mensaje preparado en la conversación para que se edite y se envíe
  function proposeMeeting() {
    setTab('conv');
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
    // Un acuse enviado fuera de los 7 días se marca en rojo: es un plazo incumplido
    else if (info.ack.at) deadlines.push({ tone: info.ack.late ? 'danger' : 'done', text: fmt(p.ackDoneOn, { date: fShort(info.ack.at, lang) }) });
    if (meeting?.pending) { const m = line('meeting', meeting.days); deadlines.push({ ...m, text: `${m.text} (${p.meetLegal})` }); }
    // También en un caso reabierto: la primera respuesta ya se dio y no hay cuenta atrás
    if (answered || info.resp.at) deadlines.push({ tone: 'done', text: fmt(p.respondedOn, { date: fShort(info.resp.at, lang) }) });
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
  // Las notas internas son entradas del historial; aquí se leen juntas, de la más antigua a la más reciente
  const notes = logs.filter(l => l.action === 'note_added' && l.details?.note);
  const title = caseTitle(c, tr);
  const cat = cats[c.category]?.[0] ?? c.category;
  const via = p.via[c.channel ?? 'web'] ?? p.via.other;
  const received = fmt(p.receivedOn, { date: fShort(c.created_at, lang), time: new Date(c.created_at).toLocaleTimeString(LOCALE[lang] ?? 'es-ES', { hour: '2-digit', minute: '2-digit' }), via });
  const flag = <Flag size={13} strokeWidth={2} aria-hidden="true" />;
  const meetLeft = meeting?.pending
    ? (meeting.days < -1 ? fmt(p.meetOverN, { n: -meeting.days }) : meeting.days === -1 ? p.meetOver1 : meeting.days === 0 ? p.meetToday : meeting.days === 1 ? p.meetLeft1 : fmt(p.meetLeftN, { n: meeting.days }))
    : '';

  return (
    <div className="pn-page cs" data-tab={tab}>
      <div className="cs-bar">
        <Link className="pn-back" to={backTo}><ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />{p.back}</Link>
        <div className="cs-bar-tools">
          <Button variant="soft" size="xs" className="cs-export" onClick={exportPdf}>{p.exportOne}</Button>
          {/* En el móvil el menú «···» está siempre, porque lleva también «Exportar PDF» */}
          <span className={cx('cs-more', !(canEdit || canDelete) && 'is-phone-only')}>
            <Menu label={p.more} trigger={props => <IconButton variant="soft" size="xs" label={p.more} {...props}><Ellipsis size={16} strokeWidth={1.8} aria-hidden="true" /></IconButton>}>
              <MenuItem className="pn-phone-only" icon={<FileDown size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={exportPdf}>{p.exportOne}</MenuItem>
              {canEdit && info.canExtend && <MenuItem icon={<CalendarPlus size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => open('extend')}>{p.extend}</MenuItem>}
              {canEdit && c.status === 'investigating' && <MenuItem icon={<MessageSquareReply size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => change({ status: 'waiting' }, p.statusOk)}>{p.toWaiting}</MenuItem>}
              {canEdit && c.status === 'waiting' && <MenuItem icon={<Search size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => change({ status: 'investigating' }, p.statusOk)}>{p.toInvestigating}</MenuItem>}
              {canEdit && ['resolved', 'closed'].includes(c.status) && <MenuItem icon={<Archive size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => change({ status: 'archived' }, p.statusOk)}>{p.archive}</MenuItem>}
              {canEdit && answered && <MenuItem icon={<RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => change({ status: 'investigating' }, p.statusOk)}>{p.reopen}</MenuItem>}
              {canDelete && <><div className="ds-menu-sep" /><MenuItem danger icon={<Eraser size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => open('suppress')}>{p.suppress}</MenuItem></>}
            </Menu>
          </span>
        </div>
      </div>

      <div className="cs-head">
        {editing !== null ? (
          <form className="cs-title-edit" onSubmit={e => { e.preventDefault(); saveTitle(); }}>
            <Field label={p.titleLabel} help={sameAsColumn(editing, tr) ? p.titleLikeColumn : p.titleHelp} value={editing} maxLength={160} autoFocus onChange={e => setEditing(e.target.value)} />
            <div className="cs-title-btns">
              <Button type="submit" variant="report" size="sm" busy={busy} icon={<Check size={16} strokeWidth={1.8} aria-hidden="true" />}>{p.save}</Button>
              <Button variant="soft" size="sm" onClick={() => setEditing(null)} icon={<X size={16} strokeWidth={1.8} aria-hidden="true" />}>{p.cancel}</Button>
            </div>
          </form>
        ) : (
          <div className="cs-title">
            <h1>{title}</h1>
            {/* Sin título propio, el título es la referencia y el tema: se puede añadir uno, que solo ve el equipo */}
            {redesign && canEdit && (c.title
              ? <IconButton variant="ghost" size="xs" label={p.editTitle} onClick={() => setEditing(c.title)}><Pencil size={16} strokeWidth={1.8} aria-hidden="true" /></IconButton>
              : <button type="button" className="pn-link is-muted" onClick={() => setEditing('')}>{p.addTitle}</button>)}
          </div>
        )}
        <p className="cs-meta">
          <span>{c.title && !erased ? `${c.reference} · ${cat} · ` : ''}{received}</span>
          <Chip>{c.is_anonymous ? p.anon : p.ident}</Chip>
          {/* La prioridad, en gris con su icono; solo la crítica va en rojo. El ámbar queda para los plazos */}
          {c.priority === 'critical'
            ? <Chip tone="danger" icon={flag}>{p.prioChip.critical}</Chip>
            : p.prioChip[c.priority] && <span className="ds-case-plain">{flag}{p.prioChip[c.priority]}</span>}
          {meeting?.pending && <Chip tone="report">{p.askMeeting}</Chip>}
          {c.status === 'waiting' && <Chip>{p.waitingChip}</Chip>}
          {c.status === 'archived' && <Chip>{p.archivedChip}</Chip>}
          {info.extended && !answered && <Chip>{p.extendedChip}</Chip>}
          {c.fiscal_referral_at && <Chip>{p.fiscalChip}</Chip>}
        </p>
      </div>

      {erased ? (
        <p className="cs-erased"><Archive size={16} strokeWidth={1.8} aria-hidden="true" /><span><b>{fmt(t.anonBanner, { date: fLong(c.anonymized_at, lang) })}</b> {t.anonBannerText}</span></p>
      ) : (
        <section className="cs-next" aria-label={p.next}>
          <div className="cs-next-main">
            <StepBar tone="line" current={stepAt} names={p.steps} label={p.stepsLabel} />
            <p className="cs-deadlines">
              {deadlines.map((d, i) => (d.tone === 'danger' || d.tone === 'warn'
                ? <Chip key={i} tone={d.tone}>{d.text}</Chip>
                : <span key={i} className="ds-case-plain">{d.tone === 'done' && <Check size={13} strokeWidth={1.8} aria-hidden="true" />}{d.text}</span>))}
            </p>
            {c.extension_reason && <p className="cs-ext">{c.extension_reason}</p>}
          </div>
          <div className={cx('cs-next-do', next?.ok && 'is-action')}>
            {next && <span className="cs-next-label">{p.next}</span>}
            {next ? (
              next.ok
                ? <Button variant="report" size="lg" full busy={busy && !dialog} onClick={next.go}><Tp lang={lang} pick={() => next.label} /></Button>
                : <p className="cs-next-note"><LockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" />{next.label}. {p.noPerm}</p>
            ) : (
              <div className="cs-closed">
                <p className="cs-next-note is-done"><Check size={16} strokeWidth={1.8} aria-hidden="true" />{fmt(p.closedOn, { date: fLong(c.answered_at ?? c.updated_at, lang) })}</p>
                <p className="cs-closed-result">{fmt(p.resultIs, { outcome: p.outcomes[c.outcome] ?? p.outcomes.none })}</p>
                {canEdit && <p className="cs-closed-hint">{p.reopenHint}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Solo en el móvil: la ficha en tres pestañas */}
      <Segmented
        className="cs-tabs" mode="tabs" tone="line" label={p.tabsLabel} value={tab} onChange={setTab}
        options={[{ value: 'summary', label: p.tabSummary, controls: 'cs-pane-summary' }, { value: 'conv', label: p.tabConv, controls: 'cs-pane-conv' }, { value: 'manage', label: p.tabManage, controls: 'cs-pane-manage' }]}
      />

      <div className="cs-grid">
        <div className="cs-main">
          {/* Solo con la IA encendida; apagada, la ficha es exactamente la de siempre */}
          <div className="cs-pane" id="cs-pane-summary">
          {AI_ENABLED && !erased && <AiSummary c={c} canEdit={canEdit} onUseTitle={title => change({ title })} onGenerated={refresh} />}
          <Card as="section" className="cs-told" aria-labelledby="cs-told">
            <h2 className="pn-sec-t" id="cs-told">{ti(FileText)}{p.told}</h2>
            <p ref={descRef} className={cx('cs-desc', !fullDesc && 'is-short')} id="cs-desc-p">{c.description}</p>
            {/* En el móvil, una descripción larga se resume y se abre con «Leer entero» */}
            {cutDesc && <button type="button" className="pn-link cs-desc-more" aria-expanded={fullDesc} aria-controls="cs-desc-p" onClick={() => setFullDesc(v => !v)}>{fullDesc ? p.readLess : p.readAll}</button>}
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
                              <Paperclip size={15} strokeWidth={1.8} aria-hidden="true" /><span title={a.filename}>{a.filename}</span><small>{formatBytes(a.file_size)}</small><Download size={15} strokeWidth={1.8} aria-hidden="true" />
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
          </div>

          <div className="cs-pane" id="cs-pane-conv">
          {/* La conversación, en su bloque: cabecera con el tinte, las burbujas por lado y la caja pegada abajo */}
          <section className="pn-block is-tint cs-conv" aria-labelledby="cs-conv">
            <div className="pn-block-head">
              <h2 className="pn-sec-t" id="cs-conv">{ti(MessageSquare)}{p.conv}</h2>
              <span className="pn-block-tag"><LockKeyhole size={14} strokeWidth={1.8} aria-hidden="true" /><span className="pn-desk-only">{p.convNote}</span><span className="pn-phone-only">{p.convNotePhone}</span></span>
            </div>
            <div className="pn-block-body">
              <ChatThread lang={lang} messages={thread} label={p.conv} empty={c.status === 'received' ? p.convEmptyFirst : p.convEmpty} />
              {erased ? null : canReply ? (
                <>
                  {sendErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{p.msgErr}</p>}
                  {blankErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{blankErr}</p>}
                  <ChatComposer lang={lang} id="cs-msg" className="cs-compose" stacked value={draft} onChange={v => { setDraft(v); if (blankErr) setBlankErr(''); }} onSend={send} busy={sending} placeholder={c.is_anonymous ? p.msgPh : p.msgPhIdent} sendLabel={<><span className="cs-send-t">{p.send}</span><Send className="cs-send-ico" size={18} strokeWidth={2} aria-hidden="true" /></>}
                    actions={AI_ENABLED ? <AiDraft c={c} kinds={['ack', 'question', 'answer']} current={draft} onApply={setDraft} align="start" /> : undefined} />
                </>
              ) : <p className="cs-locked"><LockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" />{p.noReply}</p>}
            </div>
          </section>

          {/* Las notas internas, aparte y en ámbar suave: nunca se confunden con lo que lee quien informa */}
          {!erased && (notes.length > 0 || canEdit) && (
            <section className="pn-block is-note cs-notes" aria-labelledby="cs-notes">
              <div className="pn-block-head">
                <h2 className="pn-sec-t" id="cs-notes">{ti(LockKeyhole)}{p.notesT}</h2>
                <span className="pn-block-tag">{p.notesTag}</span>
              </div>
              <div className="pn-block-body">
                {notes.length === 0 ? <p className="cs-notes-empty">{p.notesEmpty}</p> : (
                  <ul className="cs-notes-list">
                    {notes.map(l => (
                      <li key={l.id}>
                        <span className="cs-note-by">{l.details.actor_name && <><b>{l.details.actor_name}</b> · </>}<time dateTime={l.created_at}>{fDateTime(l.created_at, lang)}</time></span>
                        <p>{l.details.note}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <form className={cx('cs-note-form', noteOpen && 'is-open')} onSubmit={saveNote}>
                    <Field id="cs-note" label={p.notePh} hideLabel placeholder={p.notePh} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} />
                    <Button type="submit" variant="soft" size="md" disabled={!note.trim()} busy={busy && !dialog && !!note.trim()}>{p.noteSave}</Button>
                  </form>
                )}
              </div>
            </section>
          )}
          {/* En el móvil el campo de la nota se abre con este enlace */}
          {!erased && canEdit && !noteOpen && <button type="button" className="pn-link cs-note-add" onClick={() => { setNoteOpen(true); requestAnimationFrame(() => document.getElementById('cs-note')?.focus()); }}>{p.addNote}</button>}
          </div>
        </div>

        {/* Una sola columna de gestión: secciones con su título y una línea entre ellas */}
        <Card as="aside" className="cs-side" id="cs-pane-manage">
          {!erased && (
            <section className="cs-sec" aria-labelledby="cs-manage">
              <h2 className="pn-sec-t" id="cs-manage">{ti(SlidersHorizontal)}{p.manageT}</h2>
              <Field as="select" size="sm" label={p.priority} value={c.priority} disabled={!canEdit || busy} onChange={e => change({ priority: e.target.value })}>
                {PRIORITIES.map(v => <option key={v} value={v}>{p.prios[v]}</option>)}
              </Field>
              {redesign && (
                <Field as="select" size="sm" label={p.owner} value={c.assigned_to ?? ''} disabled={!canEdit || busy} onChange={e => change({ assigned_to: e.target.value || null })}>
                  <option value="">{p.nobody}</option>
                  {people.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}
                </Field>
              )}
            </section>
          )}

          {meeting && !erased && (
            <section className="cs-sec" aria-labelledby="cs-meet">
              <div className="cs-sec-head">
                <h2 className="pn-sec-t" id="cs-meet">{ti(CalendarDays)}{p.meetT}</h2>
                {meeting.pending && <Chip tone={meeting.days < 0 ? 'danger' : 'warn'}>{meetLeft.replace(/\.$/, '')}</Chip>}
              </div>
              {meeting.heldAt ? <p className="cs-p">{fmt(p.meetHeld, { date: fLong(meeting.heldAt, lang) })}</p> : (
                <>
                  <p className="cs-p">{fmt(p.meetPending, { date: fLong(meeting.due, lang) })}</p>
                  {canEdit && meeting.pending && <Button variant="soft" size="xs" className="cs-sec-btn" busy={busy && !dialog} onClick={() => run(() => markMeetingHeld(c.id, actor), p.meetOk)}>{p.meetMark}</Button>}
                </>
              )}
            </section>
          )}

          {!erased && (
            <section className="cs-sec" aria-labelledby="cs-close">
              <h2 className="pn-sec-t" id="cs-close">{ti(CircleCheck)}{p.closeT}</h2>
              <Field as="select" size="sm" label={p.outcome} value={c.outcome ?? ''} disabled={!canEdit || busy} onChange={e => change({ outcome: e.target.value || null })}>
                <option value="">{p.outcomes.none}</option>
                {OUTCOMES.map(v => <option key={v} value={v}>{p.outcomes[v]}</option>)}
              </Field>
              {c.fiscal_referral_at
                ? <p className="cs-p">{fmt(p.fiscalDone, { date: fLong(c.fiscal_referral_at, lang) })}</p>
                : canEdit && <Button variant="soft" size="xs" className="cs-fiscal cs-sec-btn" onClick={() => open('fiscal')} icon={<Scale size={14} strokeWidth={1.8} aria-hidden="true" />}>{p.fiscal}</Button>}
            </section>
          )}

          {!erased && (
            <section className="cs-sec" aria-labelledby="cs-ident">
              <h2 className="pn-sec-t" id="cs-ident">{ti(User)}{p.identT}</h2>
              {c.is_anonymous ? <p className="cs-p">{p.identAnon}</p> : identity ? (
                <dl className="cs-ident">
                  <div><dt>{p.name}</dt><dd>{identity.reporter_name || p.notGiven}</dd></div>
                  <div><dt>{p.email}</dt><dd>{identity.reporter_email ? <a href={`mailto:${identity.reporter_email}`}>{identity.reporter_email}</a> : p.notGiven}</dd></div>
                  <div><dt>{p.phone}</dt><dd>{identity.reporter_phone ? <a href={`tel:${identity.reporter_phone.replace(/\s/g, '')}`}>{identity.reporter_phone}</a> : p.notGiven}</dd></div>
                </dl>
              ) : (
                <>
                  <p className="cs-p">{p.identWarn}</p>
                  <Button variant="soft" size="xs" className="cs-sec-btn" busy={idBusy} onClick={reveal} icon={<Eye size={14} strokeWidth={1.8} aria-hidden="true" />}>{p.identShow}</Button>
                  {idErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{p.identErr}</p>}
                </>
              )}
            </section>
          )}

          {!erased && access !== false && (
            <section className="cs-sec" aria-labelledby="cs-access">
              <h2 className="pn-sec-t" id="cs-access">{ti(Users)}{p.accessT}</h2>
              {access === null ? <Skeleton width="100%" height={48} /> : (
                <>
                  <p className="cs-p">{p.accessD}</p>
                  <ul className="cs-access">
                    {access.map(x => (
                      <li key={x.id} className={cx('cs-access-row', x.excluded && 'is-excluded')}>
                        <span className="cs-access-who">
                          <b>{x.full_name?.trim() || p.accessNoName}</b>
                          <small>{x.role === 'superadmin' ? p.roleAdmin : p.roleManager}{x.excluded ? ` · ${x.source === 'reporter' ? p.accessByReporter : p.accessByManager}` : ''}</small>
                        </span>
                        {isAdmin && x.id !== profile?.id && (x.excluded
                          ? (x.source === 'manager'
                              ? <Button variant="soft" size="xs" busy={accessBusy === x.id} onClick={() => toggleAccess(x, true)}>{p.accessRestore}</Button>
                              : <span className="cs-access-locked" title={p.accessLockedWhy}>{p.accessLocked}</span>)
                          : <Button variant="soft" size="xs" busy={accessBusy === x.id} onClick={() => toggleAccess(x, false)}>{p.accessRemove}</Button>)}
                      </li>
                    ))}
                  </ul>
                  {accessErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{accessErr}</p>}
                </>
              )}
            </section>
          )}

          <section className="cs-sec" aria-labelledby="cs-hist">
            <h2 className="pn-sec-t" id="cs-hist">{ti(History)}{p.history}</h2>
            <ol className="cs-hist">
              {history.map(l => (
                <li key={l.id}>
                  <b>{historyText(p, t, l)}</b>
                  <time dateTime={l.created_at}>{fDateTime(l.created_at, lang)}</time>
                  {/* El texto de una nota interna ya está en su bloque: aquí solo consta que se añadió */}
                  {l.details?.note && l.action !== 'note_added' && <q>{l.details.note}</q>}
                </li>
              ))}
            </ol>
          </section>
        </Card>
      </div>

      {/* ── Diálogos propios: nada se envía ni se borra sin verlo antes ── */}
      <Dialog open={dialog === 'ack'} onClose={closeDialog} title={p.ackTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="report" size="md" busy={busy} onClick={sendAck}>{p.ackSend}</Button></>}>
        <p>{p.ackText}</p>
        {AI_ENABLED && <AiDraft c={c} kinds={['ack']} current={text === tpl('ackTpl') ? '' : text} onApply={v => { setText(v); setDErr(''); }} />}
        <Field as="textarea" rows={5} label={p.ackLabel} value={text} maxLength={10000} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'close'} onClose={closeDialog} title={p.closeTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="report" size="md" busy={busy} onClick={sendClose}>{p.closeSend}</Button></>}>
        <p>{p.closeText}</p>
        <Field as="select" size="sm" label={p.outcome} value={outcome} onChange={e => { setOutcome(e.target.value); setDErr(''); }}>
          <option value="">{p.outcomes.none}</option>
          {OUTCOMES.map(v => <option key={v} value={v}>{p.outcomes[v]}</option>)}
        </Field>
        {AI_ENABLED && <AiDraft c={c} kinds={['answer']} current={text} onApply={v => { setText(v); setDErr(''); }} />}
        <Field as="textarea" rows={5} label={p.finalMsg} value={text} maxLength={10000} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'extend'} onClose={closeDialog} title={t.extendTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="report" size="md" busy={busy} onClick={doExtend}>{fmt(t.extendConfirm, { date: fLong(extensionUntil(c.created_at), lang) })}</Button></>}>
        <p>{t.extendText}</p>
        <Field as="textarea" rows={3} label={t.extendReason} value={text} maxLength={500} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'suppress'} onClose={closeDialog} title={fmt(t.supTitle, { code: c.reference })}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="danger" size="md" busy={busy} onClick={doSuppress}>{busy ? t.deleting : t.delConfirm}</Button></>}>
        <p>{t.supText}</p>
        <Field as="textarea" rows={3} label={t.supReason} placeholder={t.supReasonPh} value={text} maxLength={500} error={dErr} onChange={e => { setText(e.target.value); setDErr(''); }} />
      </Dialog>

      <Dialog open={dialog === 'fiscal'} onClose={closeDialog} title={p.fiscalTitle}
        actions={<><Button variant="soft" size="md" onClick={closeDialog}>{p.cancel}</Button><Button variant="report" size="md" busy={busy} onClick={doFiscal}>{p.fiscalDo}</Button></>}>
        <p>{p.fiscalText}</p>
        <Field as="textarea" rows={3} label={p.fiscalNote} value={text} maxLength={500} onChange={e => setText(e.target.value)} />
      </Dialog>
    </div>
  );
}
