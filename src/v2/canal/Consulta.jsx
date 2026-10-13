import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, Ellipsis, MessageSquare, CircleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import { getComplaintByCode, getReporterMessages, sendReporterMessage, requestMeetingByCode } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { Button, IconButton, ChatThread, ChatComposer, Dialog, Field, StepBar, cx } from '../ui/index.js';
import { CanalHead, FlowTop, Tc, ic, respDue, dayMonth, dayShort } from './shared.jsx';
import { LOCALES } from '../../lib/format.js';

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
  const { lang, setLang, org, base } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const t = translations[lang].canal;
  const [code, setCode] = useState(formatCode(location.state?.code ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // codeErr | codeShort | codeBusy
  const [result, setResult] = useState(null);
  useEffect(() => { document.title = `${result ? t.docCase : t.docLookup} · ${t.ethics} · ${org.name}`; }, [t, org, result]);
  const inputRef = useRef(null);

  async function search(e, override) {
    e?.preventDefault();
    const q = formatCode(override ?? code);
    if (q.replace('-', '').length < CODE_CHARS) { setError('codeShort'); inputRef.current?.focus(); return; }
    setError(null);
    setLoading(true);
    const { complaint, error: err } = await getComplaintByCode(q);
    setLoading(false);
    // El mismo mensaje exista o no el código: no se dan pistas
    // Demasiados intentos con códigos que no existen (migración 014): se dice, sin dar pistas del código
    if (/too-many-attempts/.test(err?.message ?? '')) { setError('codeBusy'); inputRef.current?.focus(); return; }
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
        lang={lang} setLang={setLang} org={org} c={result}
        onRefresh={async () => { const { complaint } = await getComplaintByCode(result.tracking_code); if (complaint) setResult(complaint); }}
        onLeave={() => { setResult(null); setCode(''); navigate(base, { replace: true }); }}
      />
    );
  }

  return (
    <form className="flow" onSubmit={search} noValidate>
      <CanalHead lang={lang} setLang={setLang} org={org} />
      <div className="flow-body">
        <FlowTop lang={lang} base={base} />
        <div className="flow-q">
          <Tc as="h1" className="ds-h1" lang={lang} k="caseTitle" />
          <Tc as="p" className="ds-lead" lang={lang} k="caseLead" />
        </div>
        {/* El campo y su botón, a la misma altura */}
        <div className="codebox">
          <Field
            ref={inputRef} code label={<Tc lang={lang} k="code" />} value={code} placeholder="XXXX-XXXX"
            autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="search" inputMode="text"
            error={error && t[error]}
            onChange={e => { setCode(formatCode(e.target.value)); setError(null); }}
          />
          <Button type="submit" variant="report" size="xl" className="codebox-go" busy={loading} iconEnd={ic(ArrowRight, 18)}>
            <Tc lang={lang} k={loading ? 'seeing' : 'seeCase'} />
          </Button>
        </div>
        <p className="flow-note"><span><b>{t.lostB}</b> {t.lostD}</span></p>
      </div>
    </form>
  );
}

const LOCALE = LOCALES;
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
              <span className="tl-dot" aria-hidden="true">{s.done && <Check size={12} strokeWidth={2.4} />}</span>
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
        <div className="mc-meet">
          {c.meeting_requested ? t.meetAsked : (
            <>
              {t.meetQ}{' '}
              <button type="button" className="linkbtn" onClick={onMeeting} aria-busy={meetBusy || undefined}>{meetBusy ? t.meetAsking : t.meetAsk}</button>
              {meetErr && <span className="mc-meet-err" role="alert"> {t.meetErr}</span>}
            </>
          )}
        </div>
      )}
    </>
  );
}

/** Mi caso: el estado en una línea con su fecha y la conversación como bloque principal */
function MiCaso({ lang, setLang, org, c, onRefresh, onLeave }) {
  const t = translations[lang].canal;
  const code = c.tracking_code;
  const p = progress(c);
  const [messages, setMessages] = useState(null);
  const [msgErr, setMsgErr] = useState(false); // no se han podido cargar (no es lo mismo que «no hay»)
  const [msgTry, setMsgTry] = useState(0);
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
    setMsgErr(false);
    getReporterMessages(code)
      .then(({ messages: m, error }) => { if (!alive) return; setMsgErr(!!error); setMessages(error ? [] : (m ?? [])); })
      .catch(() => { if (alive) { setMsgErr(true); setMessages([]); } });
    return () => { alive = false; };
  }, [code, msgTry]);

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

  const due = fmt(t.byDate, { date: dayMonth(respDue(c.created_at, c.extended_until), lang) });

  return (
    <div className="flow mc-page">
      <CanalHead lang={lang} setLang={setLang} org={org}>
        <IconButton variant="soft" size="xs" className="mc-more" label={t.moreCase} onClick={() => setMenu(true)}>{ic(Ellipsis, 18)}</IconButton>
        <Button variant="soft" size="xs" className="mc-leave" onClick={onLeave}><Tc lang={lang} k="leaveCase" /></Button>
      </CanalHead>
      <div className="flow-body mc">
        <div className="mc-status">
          <span className="mc-code">{fmt(t.yourCase, { code })}</span>
          <div className="mc-state">
            <Tc as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.st[p.key]} ref={headRef} tabIndex={-1} />
            {!p.answered && <span className="mc-due">{t.tl[3]} · {due}</span>}
          </div>
          <StepBar lang={lang} total={4} current={p.at} compact className="mc-bar" />
        </div>
        <div className="mc-cols">
          <div className="mc-side">{side}</div>

          <section className="mc-chat" aria-labelledby="mc-chat-t">
            <div className="mc-chat-head">{ic(MessageSquare, 17)}<Tc as="h2" lang={lang} k="msgs" id="mc-chat-t" /><Tc lang={lang} k="msgsNote" className="mc-chat-note" /></div>
            <div className="mc-thread">
              {messages === null
                ? <div className="mc-skel" aria-hidden="true"><span className="ds-skel" style={{ width: '60%', height: 44 }} /><span className="ds-skel" style={{ width: '45%', height: 44 }} /></div>
                : msgErr
                  ? <p className="flow-note" role="alert"><span>{t.msgLoadErr} <button type="button" className="linkbtn" onClick={() => { setMessages(null); setMsgTry(n => n + 1); }}>{t.retry}</button></span></p>
                  : <ChatThread lang={lang} messages={thread} empty={t.msgEmpty}><span ref={endRef} /></ChatThread>}
            </div>
            <div className="mc-compose">
              {p.answered && (
                <p className="flow-note mc-closed" role="note">
                  <span><b>{c.answered_at ? fmt(t.closedOn, { date: fLongDay(c.answered_at, lang) }) : t.closedNoDate}</b> {t.closedMore}</span>
                </p>
              )}
              {c.status === 'waiting' && <p className="mc-wait" role="note"><span className="state-dot" aria-hidden="true" />{t.waiting}</p>}
              {sendErr && <p className="ds-field-error" role="alert">{ic(CircleAlert, 16)}{t.msgErr}</p>}
              <ChatComposer lang={lang} id="mc-msg" value={draft} onChange={setDraft} onSend={send} busy={sending} />
              <p className="mc-tip">{t.msgTip} {t.hidden}</p>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={menu} onClose={() => setMenu(false)} title={t.caseMenu} closeLabel={t.close} className="mc-menu"
        actions={<Button variant="soft" size="md" full onClick={onLeave}>{t.leaveCase}</Button>}
      >
        <div className="mc-menu-side">{side}</div>
      </Dialog>
    </div>
  );
}
