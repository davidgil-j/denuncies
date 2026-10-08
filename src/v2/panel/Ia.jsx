import React, { useEffect, useState } from 'react';
import { CircleAlert, RefreshCw, Sparkles } from 'lucide-react';
import { getAiSummary, requestAiSummary, requestAiDraft } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { fDateTime } from '../admin/adminKit.jsx';
import { Button, Card, Dialog, Menu, MenuItem, Skeleton } from '../ui/index.js';
import { usePanel } from './kit.jsx';

// Ayudas de IA para quien gestiona. Estas piezas solo se montan con la IA encendida (AI_ENABLED, es
// decir VITE_AI_ENABLED=1): apagada, la ficha no las pinta ni pide nada. Nunca envían nada solas:
// el resumen se queda en la ficha y el borrador va a la caja de texto para que la persona lo edite.

const spark = <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />;

/** Resumen del caso en 3 frases y título propuesto. canEdit: puede generarlo y usar el título. onGenerated: avisa a la ficha. */
export function AiSummary({ c, canEdit, onUseTitle, onGenerated }) {
  const { lang, p, profile, email, notify } = usePanel();
  const a = p.ai;
  const [ai, setAi] = useState(undefined); // undefined: cargando · null: no hay
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getAiSummary(c.id).then(({ ai: found }) => { if (alive) setAi(found); });
    return () => { alive = false; };
  }, [c.id]);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(false);
    const { ai: made, error: err } = await requestAiSummary(c.id, lang, profile.full_name || email);
    setBusy(false);
    if (err || !made) { setError(true); return; }
    setAi(made);
    notify(a.done);
    onGenerated?.(); // el historial de la ficha enseña la entrada nueva
  }

  // Quien solo puede ver el caso ve el resumen si ya existe, pero no la invitación a generarlo
  if (ai === null && !canEdit) return null;

  return (
    <Card tone="bg" as="section" className="ai-card" aria-labelledby="ai-sum-t" aria-busy={busy || undefined}>
      <div className="ai-head">
        <h2 className="ds-card-title" id="ai-sum-t">{spark}{a.title}</h2>
        {ai && canEdit && <Button variant="white" size="xs" onClick={generate} busy={busy} icon={<RefreshCw size={14} strokeWidth={2.4} aria-hidden="true" />}>{a.again}</Button>}
      </div>
      {ai === undefined || busy ? (
        <div role="status" aria-live="polite" className="ai-wait"><span className="ds-vh">{busy ? a.working : p.loading}</span><Skeleton width="92%" /><Skeleton width="100%" /><Skeleton width="64%" /></div>
      ) : ai ? (
        <>
          <p className="ai-text">{ai.summary}</p>
          {ai.title && (
            <p className="ai-title">
              <span><span className="ai-label">{a.suggested}</span> <b>{ai.title}</b></span>
              {canEdit && c.title !== ai.title && <button type="button" className="pn-link" onClick={() => onUseTitle(ai.title)}>{a.useTitle}</button>}
            </p>
          )}
          <p className="ai-note">{fmt(a.note, { date: fDateTime(ai.generatedAt, lang) })}</p>
        </>
      ) : (
        <>
          <p className="ai-text is-muted">{a.empty}</p>
          <Button variant="ink" size="sm" className="ai-go" onClick={generate} icon={spark}>{a.make}</Button>
        </>
      )}
      {error && <p className="ds-field-error" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{a.error}</p>}
    </Card>
  );
}

/**
 * «Redactar con IA»: propone un borrador (acuse, pregunta o respuesta final) y lo deja en la caja de
 * texto. kinds: qué borradores se ofrecen; con uno solo es un botón, con varios un menú.
 * current: lo que ya hay escrito (si hay algo, se pregunta antes de sustituirlo). onApply(texto).
 */
export function AiDraft({ c, kinds, current, onApply, align }) {
  const { p, notify } = usePanel();
  const a = p.ai;
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // borrador a la espera de confirmar que sustituye el texto

  const apply = (text) => { setPending(null); onApply(text); notify(a.draftNote); };
  async function ask(kind) {
    if (busy) return;
    setBusy(true);
    const { draft, error } = await requestAiDraft(c.id, kind);
    setBusy(false);
    if (error || !draft) { notify(a.error, 'err'); return; }
    if (current.trim()) setPending(draft); else apply(draft);
  }

  return (
    <>
      {kinds.length === 1 ? (
        <Button variant="bg" size="xs" onClick={() => ask(kinds[0])} busy={busy} icon={spark}>{busy ? a.working : a.draft}</Button>
      ) : (
        <Menu label={a.draft} align={align} trigger={props => <Button variant="bg" size="xs" busy={busy} icon={spark} {...props}>{busy ? a.working : a.draft}</Button>}>
          {kinds.map(k => <MenuItem key={k} onClick={() => ask(k)}>{a.kinds[k]}</MenuItem>)}
        </Menu>
      )}
      <Dialog
        open={pending !== null} onClose={() => setPending(null)} title={a.replaceT}
        actions={<><Button variant="soft" size="md" onClick={() => setPending(null)}>{a.keep}</Button><Button variant="ink" size="md" onClick={() => apply(pending)}>{a.replace}</Button></>}
      >
        <p>{a.replaceText}</p>
      </Dialog>
    </>
  );
}
