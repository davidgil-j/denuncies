import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CalendarDays, Paperclip, Plus, Minus, Send, Shield, CircleAlert, Pencil } from 'lucide-react';
import { translations } from '../../translations.js';
import { saveComplaint, getChannelManagers } from '../../lib/supabase.js';
import { cleanForAnonymous } from '../../lib/cleanImage.js';
import { fmt } from '../V2Layout.jsx';
import { EMAIL_RE } from '../site/fields.jsx';
import { Button, Card, Field, cx } from '../ui/index.js';
import Pruebas, { MAX_FILES, MAX_FILE_MB } from './Pruebas.jsx';
import Enviada from './Enviada.jsx';
import { CATEGORIES, EMPTY_DRAFT, CanalHead, FlowTop, Tc, ic } from './shared.jsx';

const MIN_DESC = 20;
// Sin comprobación contra robots: denunciar nunca depende de que cargue un servicio de terceros (n.º 71). El canal se
// protege en la base de datos: una denuncia por petición y un tope por hora y empresa (migración 014)

const cut = (text, n = 90) => (text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, '')}…` : text);

export default function Denuncia() {
  const { lang, setLang, org, base, draft, setDraft, sent, setSent } = useOutletContext();
  const navigate = useNavigate();
  const T = translations[lang];
  const t = T.canal;
  const [errors, setErrors] = useState({});
  const [open, setOpen] = useState({ known: false, proof: false, exclude: false }); // apartados que se abren con su fila
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // sendErr | sendLimit | { clean: nombre del archivo }
  // Quién gestiona el canal, para que quien denuncia pueda apartar a alguien del caso (C1). null = aún no se sabe
  const [managers, setManagers] = useState(null);
  // Código e id del primer intento de envío: si la red falla después de guardar, el reintento usa los
  // mismos y la base de datos no crea una denuncia repetida
  const attemptRef = useRef(null);
  const headRef = useRef(null);
  const groupRef = useRef(null);
  const first = useRef(true);
  const step = draft.step;
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));
  const clear = (k) => setErrors(e => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });

  // Título neutro: el historial del navegador no debe decir que se está enviando una denuncia
  // (cada paso con su título, para quien usa lector de pantalla; «Enviada» pone el suyo)
  useEffect(() => { if (!sent) document.title = `${fmt(T.ds.stepOf, { n: step, total: 3 })} · ${t.ethics} · ${org.name}`; }, [t, org, step, sent]);

  // Quién gestiona el canal (para poder apartar a alguien). Si la base de datos aún no lo ofrece, la lista
  // queda vacía y el paso 3 no enseña la sección.
  useEffect(() => {
    let alive = true;
    getChannelManagers(org.id).then(({ people }) => { if (alive) setManagers(people ?? []); }).catch(() => { if (alive) setManagers([]); });
    return () => { alive = false; };
  }, [org.id]);

  // Al cambiar de paso: arriba y con el foco en el título
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    headRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Aviso del navegador si se cierra la pestaña con algo escrito (no con «Salir rápido»)
  const dirty = !sent && (step > 1 || !!draft.category);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { if (window.__v2Exiting) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  // El foco va al primer campo con error en cuanto el aviso está pintado. No se aplaza a un fotograma
  // posterior: si se retrasara, podría quitarle el foco al campo en el que la persona ya está escribiendo.
  const errorFocus = useRef(null);
  function focusError(errs) { errorFocus.current = Object.keys(errs)[0] ?? null; }
  useEffect(() => {
    const k = errorFocus.current;
    errorFocus.current = null;
    if (!k) return;
    const el = document.getElementById(`dn-${k}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [errors]);

  // (Todos los hooks van antes de este punto: a partir de aquí la pantalla puede ser otra)
  if (sent) return <Enviada />;

  function back() {
    setErrors({});
    // Dentro del canal se navega sustituyendo la entrada del historial: el canal solo ocupa una
    if (step === 1) navigate(base, { replace: true });
    else set({ step: step - 1 });
  }

  async function next(e) {
    e.preventDefault();
    const errs = {};
    if (step === 1 && !draft.category) return;
    if (step === 2 && draft.description.trim().length < MIN_DESC) errs.description = 'errDescription';
    if (step === 3) {
      if (!draft.isAnonymous && !EMAIL_RE.test(draft.email.trim())) errs.email = 'errEmail';
      if (!draft.privacy) errs.privacy = 'consentErr';
    }
    if (Object.keys(errs).length) { focusError(errs); setErrors(errs); return; }
    setErrors(errs);
    if (step < 3) { set({ step: step + 1 }); return; }
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      // En una denuncia anónima, las fotos salen sin datos ocultos. Si alguna no se puede limpiar, no se envía nada
      let files = draft.files;
      if (draft.isAnonymous && files.length) {
        const cleaned = await Promise.all(files.map(cleanForAnonymous));
        const dirty = files.find((f, i) => !cleaned[i]);
        if (dirty) { setSubmitError({ clean: dirty.name }); return; }
        files = cleaned;
      }
      // El «cuándo» viaja aparte: va a su columna o, si aún no existe, una sola vez al final de la
      // descripción (lo decide supabase.js al guardar)
      const { trackingCode, complaintId, attempt, error } = await saveComplaint({
        formData: {
          isAnonymous: draft.isAnonymous, name: draft.name, email: draft.email, phone: draft.phone,
          category: draft.category, department: draft.department, description: draft.description.trim(), incidentDate: '',
          when: draft.when, whenLabel: t.when,
          involvedPeople: draft.involvedPeople, language: lang, meetingRequested: draft.meeting,
          excluded: draft.excluded,
        },
        files,
        organizationId: org.id,
        attempt: attemptRef.current,
      });
      attemptRef.current = attempt;
      if (error) { console.error('[Supabase]', error); setSubmitError(/rate-limited/.test(error.message ?? '') ? 'sendLimit' : 'sendErr'); }
      else {
        attemptRef.current = null;
        // El código se enseña ya; las pruebas se suben desde «Enviada» (si se corta, la denuncia y su código ya están)
        setSent({
          code: trackingCode, failed: 0, createdAt: new Date().toISOString(), secured: false, asked: false,
          complaintId, anonymous: draft.isAnonymous, uploads: files.length ? files : null, uploaded: 0,
        });
        setDraft(EMPTY_DRAFT);
      }
    } catch (err) {
      console.error(err);
      setSubmitError('sendErr');
    } finally {
      setSubmitting(false);
    }
  }

  // Radios de verdad: las flechas mueven la elección entre las 9 tarjetas
  function onCatKey(e) {
    const step_ = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step_) return;
    e.preventDefault();
    const at = Math.max(0, CATEGORIES.indexOf(draft.category));
    const to = (at + step_ + CATEGORIES.length) % CATEGORIES.length;
    set({ category: CATEGORIES[to] });
    groupRef.current?.querySelectorAll('[role="radio"]')[to]?.focus();
  }

  const nFiles = draft.files.length;
  // Un apartado opcional con algo dentro no se puede plegar: lo escrito nunca queda escondido
  const knownOpen = open.known || !!(draft.when || draft.department || draft.involvedPeople);
  const proofOpen = open.proof || nFiles > 0;
  const excludeOpen = open.exclude || draft.excluded.length > 0;
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));

  return (
    <form className="flow" onSubmit={next} noValidate>
      <CanalHead lang={lang} setLang={setLang} org={org} />
      <div className="flow-body">
        <FlowTop lang={lang} base={base} step={step} anon={draft.isAnonymous} topic={step > 1 ? (c => c.cats[draft.category][0]) : null} />

        {/* ── Paso 1 · ¿Qué ha pasado? ─────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="flow-q">
              <Tc as="h1" className="ds-h1" lang={lang} k="q1" ref={headRef} tabIndex={-1} />
              <Tc as="p" className="ds-lead" lang={lang} k="q1Lead" />
            </div>
            <div className="cats" role="radiogroup" aria-label={t.q1Group} ref={groupRef} onKeyDown={onCatKey}>
              {CATEGORIES.map((value) => (
                <button key={value} type="button" role="radio" aria-checked={draft.category === value} className="cat" onClick={() => set({ category: value })}>
                  <span className="pick-dot" aria-hidden="true" />
                  <Tc
                    lang={lang} className="cat-txt" inner="cat-txt-v"
                    pick={c => <><span className="cat-name">{c.cats[value][0]}</span><span className="cat-ex">{c.cats[value][1]}</span></>}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Paso 2 · Describe lo ocurrido ────────────────────────── */}
        {step === 2 && (
          <>
            <Tc as="h1" className="ds-h1" lang={lang} k="q2" ref={headRef} tabIndex={-1} />
            <div className="tell-main">
              <Field
                as="textarea" id="dn-description" rows={7} maxLength={20000} label={<Tc lang={lang} k="what" />} value={draft.description}
                help={<Tc lang={lang} k="help" />} error={errors.description && t[errors.description]}
                onChange={e => { set({ description: e.target.value }); if (e.target.value.trim().length >= MIN_DESC) clear('description'); }}
              />
              {draft.isAnonymous && (
                <p className="flow-note" role="note">
                  {ic(Shield, 16)}
                  <Tc lang={lang} k="anonWarn" className="ds-wide" /><Tc lang={lang} k="anonWarnShort" className="ds-narrow" />
                </p>
              )}
            </div>

            {/* Los dos apartados opcionales. En el móvil cada uno se abre con su fila */}
            <section className={cx('tell-sec', !knownOpen && 'is-closed')}>
              <div className="tell-sec-head">
                {ic(CalendarDays, 17)}<Tc as="h2" lang={lang} k="ifKnown" /><Tc lang={lang} k="optionalT" className="tell-sec-note" />
              </div>
              <button type="button" className="tell-sec-toggle" aria-expanded={knownOpen} aria-controls="dn-known" onClick={() => toggle('known')}>
                <span className="tell-sec-toggle-txt"><Tc lang={lang} k="moreKnown" className="tell-sec-toggle-t" /><Tc lang={lang} k="optionalT" className="tell-sec-toggle-s" /></span>
                {ic(knownOpen ? Minus : Plus, 18)}
              </button>
              <div className="tell-sec-body tell-known" id="dn-known">
                <Field label={<Tc lang={lang} k="when" />} placeholder={t.whenPh} value={draft.when} maxLength={120} onChange={e => set({ when: e.target.value })} />
                <Field label={<Tc lang={lang} k="where" />} value={draft.department} maxLength={160} onChange={e => set({ department: e.target.value })} />
                <Field label={<Tc lang={lang} k="who" />} placeholder={t.whoPh} value={draft.involvedPeople} maxLength={300} onChange={e => set({ involvedPeople: e.target.value })} />
              </div>
            </section>
            <section className={cx('tell-sec', !proofOpen && 'is-closed')}>
              <div className="tell-sec-head">
                {ic(Paperclip, 17)}<Tc as="h2" lang={lang} k="proofT" /><Tc lang={lang} k="proofNote" vars={{ n: MAX_FILES, mb: MAX_FILE_MB }} className="tell-sec-note" />
              </div>
              <button type="button" className="tell-sec-toggle" aria-expanded={proofOpen} aria-controls="dn-proof" onClick={() => toggle('proof')}>
                <span className="tell-sec-toggle-txt"><Tc lang={lang} k="proof" className="tell-sec-toggle-t" /><Tc lang={lang} k="proofNote" vars={{ n: MAX_FILES, mb: MAX_FILE_MB }} className="tell-sec-toggle-s" /></span>
                {ic(proofOpen ? Minus : Plus, 18)}
              </button>
              <div className="tell-sec-body" id="dn-proof">
                <Pruebas lang={lang} files={draft.files} onChange={files => set({ files })} />
              </div>
            </section>
          </>
        )}

        {/* ── Paso 3 · ¿Quieres identificarte? ─────────────────────── */}
        {step === 3 && (
          <>
            <Tc as="h1" className="ds-h1" lang={lang} k="q3" ref={headRef} tabIndex={-1} />
            <div className="ident">
              <div className="ident-main">
                <fieldset className="opts">
                  <legend className="ds-vh">{t.q3}</legend>
                  <label className="opt">
                    <input type="radio" name="dn-mode" className="ds-vh" checked={draft.isAnonymous} onChange={() => { set({ isAnonymous: true }); clear('email'); }} />
                    <span className="pick-dot" aria-hidden="true" />
                    <Tc
                      lang={lang} className="opt-txt" inner="opt-txt-v"
                      pick={c => <><span className="opt-t">{c.anonT}</span><span className="opt-d">{c.anonD}</span></>}
                    />
                  </label>
                  <label className="opt">
                    <input type="radio" name="dn-mode" className="ds-vh" checked={!draft.isAnonymous} onChange={() => set({ isAnonymous: false })} />
                    <span className="pick-dot" aria-hidden="true" />
                    <Tc
                      lang={lang} className="opt-txt" inner="opt-txt-v"
                      pick={c => <><span className="opt-t">{c.identT}</span><span className="opt-d">{c.identD}</span></>}
                    />
                  </label>
                </fieldset>

                {!draft.isAnonymous && (
                  <fieldset className="ident-data">
                    <legend className="ds-vh">{t.yourData}</legend>
                    <Field
                      id="dn-email" type="email" inputMode="email" autoComplete="email" maxLength={200} label={<Tc lang={lang} k="email" />} tag={t.required}
                      value={draft.email} error={errors.email && t[errors.email]} onChange={e => { set({ email: e.target.value }); clear('email'); }}
                    />
                    <Field autoComplete="name" maxLength={200} label={<Tc lang={lang} k="name" />} tag={t.optional} value={draft.name} onChange={e => set({ name: e.target.value })} />
                    <Field type="tel" inputMode="tel" autoComplete="tel" maxLength={50} label={<Tc lang={lang} k="phone" />} tag={t.optional} value={draft.phone} onChange={e => set({ phone: e.target.value })} />
                  </fieldset>
                )}

                <label className="meet">
                  <input type="checkbox" checked={draft.meeting} onChange={e => set({ meeting: e.target.checked })} />
                  <span><b><Tc lang={lang} k="meetB" /></b> <Tc lang={lang} k="meetD" className="meet-d" /></span>
                </label>

                {/* Apartar a alguien del equipo que no debería ver el caso (C1). Solo si hay equipo que mostrar. */}
                {/* Apartar a alguien del equipo (C1). Cerrado por defecto para no alargar el paso en portátiles. */}
                {managers && managers.length > 0 && (
                  <div className={cx('exclude', excludeOpen && 'is-open')}>
                    <button
                      type="button" className="exclude-toggle" aria-expanded={excludeOpen} aria-controls="dn-exclude"
                      onClick={() => toggle('exclude')}
                    >
                      {ic(Shield, 17)}
                      <span className="exclude-toggle-txt">
                        <Tc lang={lang} k="excludeB" className="exclude-toggle-t" />
                        {draft.excluded.length > 0 && <Tc lang={lang} k="excludeCount" vars={{ n: draft.excluded.length }} className="exclude-toggle-s" />}
                      </span>
                      {ic(excludeOpen ? Minus : Plus, 18)}
                    </button>
                    {excludeOpen && (
                      <fieldset className="exclude-body" id="dn-exclude">
                        <legend className="ds-vh"><Tc lang={lang} k="excludeB" /></legend>
                        <Tc as="p" lang={lang} k="excludeD" className="exclude-d" />
                        <ul className="exclude-list">
                          {managers.map(m => (
                            <li key={m.id}>
                              <label className="exclude-row">
                                <input
                                  type="checkbox" checked={draft.excluded.includes(m.id)}
                                  onChange={e => set({ excluded: e.target.checked ? [...draft.excluded, m.id] : draft.excluded.filter(x => x !== m.id) })}
                                />
                                <span className="exclude-who">
                                  <b>{m.full_name?.trim() || t.excludeNoName}</b>
                                  <small>{m.role === 'superadmin' ? t.excludeAdmin : t.excludeManager}</small>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        {draft.excluded.length >= managers.length && (
                          <p className="exclude-all" role="note">{ic(CircleAlert, 16)}<span><Tc lang={lang} k="excludeAll" /></span></p>
                        )}
                      </fieldset>
                    )}
                  </div>
                )}
              </div>

              <Card className="ident-side">
                <Tc as="h2" lang={lang} k="review" className="ds-card-title" />
                <dl className="review">
                  <div><dt>{t.rTopic}</dt><dd>{t.cats[draft.category][0]}</dd></div>
                  <div className="is-block"><dt>{t.rTold}</dt><dd>{cut(draft.description.trim())}</dd></div>
                  {draft.department.trim() && <div><dt>{t.rWhere}</dt><dd>{draft.department.trim()}</dd></div>}
                  {draft.when.trim() && <div><dt>{t.when}</dt><dd>{draft.when.trim()}</dd></div>}
                  {draft.involvedPeople.trim() && <div><dt>{t.who}</dt><dd>{draft.involvedPeople.trim()}</dd></div>}
                  <div><dt>{t.rProof}</dt><dd>{nFiles === 0 ? t.rProof0 : nFiles === 1 ? t.rProof1 : t.rProofN.replace('{n}', nFiles)}</dd></div>
                  <div><dt>{t.rIdentity}</dt><dd>{draft.isAnonymous ? t.rAnon : t.rIdent}</dd></div>
                  {draft.meeting && <div><dt>{t.rMeeting}</dt><dd>{t.rMeetingYes}</dd></div>}
                </dl>
                <Button variant="soft" size="xs" className="review-change" onClick={() => { setErrors({}); set({ step: 2 }); }} icon={ic(Pencil, 16)}>{t.change}</Button>
              </Card>
            </div>

            {/* Lo último antes de enviar, pegado al botón */}
            <div className="consent-box">
              <label className={cx('consent', errors.privacy && 'is-invalid')}>
                <input
                  id="dn-privacy" type="checkbox" checked={draft.privacy} aria-invalid={errors.privacy ? true : undefined}
                  aria-describedby={errors.privacy ? 'dn-privacy-e' : undefined}
                  onChange={e => { set({ privacy: e.target.checked }); clear('privacy'); }}
                />
                <span>{t.consentA}<a href={`${base}/privacidad?lang=${lang}`} target="_blank" rel="noopener noreferrer">{t.consentLink}</a>{t.consentZ}</span>
              </label>
              {errors.privacy && <p className="ds-field-error" id="dn-privacy-e" role="alert">{ic(CircleAlert, 16)}{t[errors.privacy]}</p>}
            </div>

            {submitError && <p className="flow-error" role="alert">{ic(CircleAlert, 18)}{submitError.clean ? fmt(t.cleanErr, { name: submitError.clean }) : t[submitError]}</p>}
          </>
        )}

        {/* Los dos botones se quedan a la vista aunque la pantalla sea baja */}
        <div className="flow-actions">
          <Button variant="soft" size="lg" className="flow-back" onClick={back} aria-label={t.back}>
            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" className="ds-narrow" /><Tc lang={lang} k="back" className="ds-wide" />
          </Button>
          {step < 3 ? (
            <Button type="submit" variant="report" size="lg" className="flow-next" disabled={step === 1 && !draft.category} iconEnd={ic(ArrowRight, 18)}>
              <Tc lang={lang} k="next" />
            </Button>
          ) : (
            <Button type="submit" variant="report" size="lg" className="flow-next" busy={submitting} iconEnd={ic(Send, 18)}>
              <Tc lang={lang} k={submitting ? 'sending' : 'send'} />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
