import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, KeyRound, Ellipsis, MessageSquareReply, CircleAlert, CircleCheck } from 'lucide-react';
import { translations } from '../../translations.js';
import { getComplaintByCode, getReporterMessages, sendReporterMessage, requestMeetingByCode } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { Button, IconButton, ChatThread, ChatComposer, Dialog, Field, StepBar, cx } from '../ui/index.js';
import { CanalHead, Tc, respDue, dayMonth, dayShort } from './shared.jsx';

// Formato real del código: 8 caracteres con guion en medio (A3B7-C9X2). Se acepta pegado con o sin
// guion, con espacios, o dentro de un texto como la línea del justificante.
const CODE_CHARS = 8;
function formatCode(v) {
  const up = v.toUpperCase();
  const found = up.match(/[A-Z0-9]{4}\s*[-–]\s*[A-Z0-9]{4}/g);
  const clean = (found ? found[found.length - 1] : up).replace(/[^A-Z0-9]/g, '').slice(0, CODE_CHARS);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

// Los 7 estados internos, contados en 4 pasos para quien informa
function progress(c) {
  const answered = ['resolved', 'closed', 'archived'].includes(c.status);
  const investigating = ['investigating', 'waiting'].includes(c.status);
  const received = !!c.acknowledged_at || c.status !== 'received';
  const at = answered ? 4 : investigating ? 3 : received ? 2 : 1; // el paso en el que está
  const key = c.status === 'closed' || c.status === 'archived' ? 'closed' : answered ? 'answered' : investigating ? 'investigating' : received ? 'received' : 'sent';
  return { at, key, answered, investigating, received };
}

export default function Consulta() {
  const { lang, org, base } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const t = translations[lang].canal;
  const [code, setCode] = useState(formatCode(location.state?.code ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // codeErr | codeShort
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { document.title = `${t.ethics} · ${org.name}`; }, [t, org]);

  async function search(e, override) {
    e?.preventDefault();
    const q = formatCode(override ?? code);
    if (q.replace('-', '').length < CODE_CHARS) { setError('codeShort'); inputRef.current?.focus(); return; }
    setError(null);
    setLoading(true);
    const { complaint, error: err } = await getComplaintByCode(q);
    setLoading(false);
    // El mismo mensaje exista o no el código: no se dan pistas
    if (err || !complaint) { setError('codeErr'); inputRef.current?.focus(); return; }
    setResult(complaint);
  }

  // Si llega desde «Enviada» con el código, se abre directamente. Después el código se borra del
  // historial: en un ordenador compartido, «atrás» no debe volver a mostrarlo.
  useEffect(() => {
    const fromState = location.state?.code;
    if (!fromState) return;
    search(null, fromState);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result) {
    return (
      <MiCaso
        lang={lang} org={org} c={result}
        onRefresh={async () => { const { complaint } = await getComplaintByCode(result.tracking_code); if (complaint) setResult(complaint); }}
        onLeave={() => { setResult(null); setCode(''); navigate(base, { replace: true }); }}
      />
    );
  }

  return (
    <form className="flow" onSubmit={search} noValidate>
      <CanalHead lang={lang} org={org} />
      <div className="codebox">
        <span className="codebox-ico" aria-hidden="true"><KeyRound size={34} strokeWidth={1.7} /></span>
        <Tc as="h1" className="ds-h1" lang={lang} k="caseTitle" />
        <Tc as="p" className="ds-lead" lang={lang} k="caseLead" />
        <Field
          ref={inputRef} code onReport label={<Tc lang={lang} k="code" />} value={code} placeholder="XXXX-XXXX"
          autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="search" inputMode="text"
          error={error && t[error]}
          onChange={e => { setCode(formatCode(e.target.value)); setError(null); }}
        />
        <Button type="submit" variant="ink" size="lg" full busy={loading} iconEnd={<ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />}>
          <Tc lang={lang} k={loading ? 'seeing' : 'seeCase'} />
        </Button>
        <p className="notebox"><b>{t.lostB}</b> {t.lostD}</p>
      </div>
      <div className="flow-actions">
        <Button variant="shade" size="lg" to={base} replace><Tc lang={lang} k="back" /></Button>
      </div>
    </form>
  );
}

const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
const fLongDay = (iso, lang) => new Date(iso).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Línea de tiempo y petición de reunión: a la izquierda en el ordenador, en el menú «···» en el móvil */
function CaseSide({ lang, c, p, onMeeting, meetBusy, meetErr }) {
  const t = translations[lang].canal;
  const due = dayMonth(respDue(c.created_at, c.extended_until), lang);
  const steps = [
    { done: true, sub: dayMonth(c.created_at, lang) },
    { done: p.received, sub: c.acknowledged_at ? dayMonth(c.acknowledged_at, lang) : null },
    { done: p.answered, sub: null },
    { done: p.answered, sub: p.answered ? (c.answered_at ? dayMonth(c.answered_at, lang) : null) : fmt(t.byDate, { date: due }) },
  ];
  return (
    <>
      <ol className="tl" aria-label={t.tlLabel}>
        {steps.map((s, i) => {
          // En curso: el acuse mientras no llega, o la investigación mientras dura
          const isNow = !s.done && ((i === 1 && !p.received) || (i === 2 && p.investigating));
          return (
            <li key={i} className={cx(s.done && 'is-done', isNow && 'is-now')} aria-current={isNow ? 'step' : undefined}>
              <span className="tl-dot" aria-hidden="true">{s.done && <Check size={14} strokeWidth={3} />}</span>
              <span className="tl-txt">
                <b>{t.tl[i]}<span className="ds-vh"> · {s.done ? t.tlDone : isNow ? t.tlNow : t.tlNext}</span></b>
                <small>{s.sub ?? (s.done ? '' : i === 2 && isNow ? t.now : t.pending)}</small>
              </span>
            </li>
          );
        })}
      </ol>
      {/* Pedir reunión: solo si la base de datos ya lo permite (migración 012). Hasta entonces la consulta
          por código no devuelve «meeting_requested» y el recuadro no se ofrece. */}
      {c.meeting_requested != null && !p.answered && (
        <div className="notebox">
          {c.meeting_requested ? t.meetAsked : (
            <>
              {t.meetQ}{' '}
              <button type="button" className="linkbtn is-on-report" onClick={onMeeting} aria-busy={meetBusy || undefined}>{meetBusy ? t.meetAsking : t.meetAsk}</button>
              {meetErr && <span className="notebox-err" role="alert"> {t.meetErr}</span>}
            </>
          )}
        </div>
      )}
    </>
  );
}

function MiCaso({ lang, org, c, onRefresh, onLeave }) {
  const t = translations[lang].canal;
  const code = c.tracking_code;
  const p = progress(c);
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const [menu, setMenu] = useState(false);
  const [meetBusy, setMeetBusy] = useState(false);
  const [meetErr, setMeetErr] = useState(false);
  const endRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => { headRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    let alive = true;
    getReporterMessages(code).then(({ messages: m }) => { if (alive) setMessages(m ?? []); });
    return () => { alive = false; };
  }, [code]);

  async function send(text) {
    setSending(true);
    setSendErr(false);
    const { error } = await sendReporterMessage(code, text);
    if (error) { setSending(false); setSendErr(true); return; }
    setDraft('');
    const { messages: m } = await getReporterMessages(code);
    setMessages(m ?? []);
    setSending(false);
    onRefresh(); // si esperaban su respuesta, el caso vuelve a «investigando»
    requestAnimationFrame(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); document.getElementById('mc-msg')?.focus(); });
  }

  async function askMeeting() {
    if (meetBusy) return;
    setMeetBusy(true);
    setMeetErr(false);
    const { error } = await requestMeetingByCode(code);
    setMeetBusy(false);
    if (error) { setMeetErr(true); return; }
    onRefresh();
  }

  const side = <CaseSide lang={lang} c={c} p={p} onMeeting={askMeeting} meetBusy={meetBusy} meetErr={meetErr} />;
  const thread = (messages ?? []).map(m => ({
    id: m.id, mine: m.sender === 'reporter', author: m.sender === 'reporter' ? null : org.name, when: dayShort(m.created_at, lang), text: m.content,
  }));

  return (
    <div className="flow mc-page">
      <CanalHead lang={lang} org={org}>
        <IconButton variant="shade" className="mc-more" label={t.moreCase} onClick={() => setMenu(true)}><Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" /></IconButton>
        <Button variant="shade" size="sm" className="mc-leave" onClick={onLeave}><Tc lang={lang} k="leaveCase" /></Button>
      </CanalHead>
      <div className="mc">
        <div className="mc-status">
          <span className="mc-code">{fmt(t.yourCase, { code })}</span>
          <Tc as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.st[p.key]} ref={headRef} tabIndex={-1} />
          <div className="mc-bar">
            <StepBar lang={lang} total={4} current={p.at} compact />
            {!p.answered && <span>{fmt(t.byDate, { date: dayMonth(respDue(c.created_at, c.extended_until), lang) })}</span>}
          </div>
        </div>
        <div className="mc-side">{side}</div>

        <section className="mc-chat ds-on-white" aria-labelledby="mc-chat-t">
          <div className="mc-chat-head"><Tc as="h2" lang={lang} k="msgs" id="mc-chat-t" /><Tc lang={lang} k="msgsNote" /></div>
          <div className="mc-thread">
            {messages === null
              ? <div className="mc-skel" aria-hidden="true"><span className="ds-skel" style={{ width: '60%', height: 52 }} /><span className="ds-skel" style={{ width: '45%', height: 52 }} /></div>
              : <ChatThread lang={lang} messages={thread} empty={t.msgEmpty}><span ref={endRef} /></ChatThread>}
          </div>
          <div className="mc-compose">
            {p.answered && (
              <p className="okbox" role="note">
                <CircleCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                <span><b>{c.answered_at ? fmt(t.closedOn, { date: fLongDay(c.answered_at, lang) }) : t.closedNoDate}</b> {t.closedMore}</span>
              </p>
            )}
            {c.status === 'waiting' && <p className="warnbox" role="note"><MessageSquareReply size={18} strokeWidth={2} aria-hidden="true" />{t.waiting}</p>}
            {sendErr && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{t.msgErr}</p>}
            <ChatComposer lang={lang} id="mc-msg" value={draft} onChange={setDraft} onSend={send} busy={sending} />
            <p className="mc-tip">{t.msgTip} {t.hidden}</p>
          </div>
        </section>
      </div>

      <Dialog
        open={menu} onClose={() => setMenu(false)} title={t.caseMenu} closeLabel={t.close} className="mc-menu"
        actions={<Button variant="ink" size="md" full onClick={onLeave}>{t.leaveCase}</Button>}
      >
        <div className="mc-menu-side">{side}</div>
      </Dialog>
    </div>
  );
}
