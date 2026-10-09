import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { ArrowRight, ArrowLeft, Check, Plus, Send, Shield, CircleAlert, Pencil } from 'lucide-react';
import { translations } from '../../translations.js';
import { saveComplaint, IS_DEMO } from '../../lib/supabase.js';
import { cleanForAnonymous } from '../../lib/cleanImage.js';
import { fmt } from '../V2Layout.jsx';
import { EMAIL_RE } from '../site/fields.jsx';
import { Button, Card, Chip, Field, StepBar, cx } from '../ui/index.js';
import Pruebas from './Pruebas.jsx';
import Enviada from './Enviada.jsx';
import { CATEGORIES, CAT_ICON, EMPTY_DRAFT, CanalHead, Tc } from './shared.jsx';

const MIN_DESC = 20;
// Verificación contra robots: solo con clave configurada y fuera de la demo
const HAS_CAPTCHA = !IS_DEMO && !!import.meta.env.VITE_TURNSTILE_SITE_KEY;

// «Ayuda»: qué cubre ya lo escrito. Es una pista con palabras clave en los tres idiomas; nunca bloquea.
const HINTS = {
  where: /\b(almac[eé]n|oficina|planta|departamento|turno|sede|f[aá]brica|taller|tienda|obra|pasillo|despacho|magatzem|departament|torn|seu|botiga|passad[ií]s|office|warehouse|department|floor|site|plant|shift|store|shop)\w*/i,
  when: /\b(ayer|hoy|anoche|semanas?|mes(es)?|años?|desde|hace|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ahir|avui|setman\w+|any|anys|des de|fa \d+|dilluns|dimarts|dimecres|dijous|divendres|dissabte|diumenge|gener|febrer|març|maig|juny|juliol|agost|setembre|novembre|desembre|yesterday|today|last night|weeks?|months?|years?|since|ago|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[/.-]\d{1,2}|20\d\d)\b/i,
  who: /\b(jef[ea]s?|responsables?|director\w*|gerentes?|compañer\w+|supervisor\w*|encargad\w+|coordinador\w*|cap de|company\w*|encarregad\w+|manager|boss|supervisor|director|colleagues?|coworkers?|head of)\b/i,
};
function covered(d) {
  const text = d.description;
  return [
    text.trim().length >= MIN_DESC,
    !!d.department.trim() || HINTS.where.test(text),
    !!d.when.trim() || HINTS.when.test(text),
    !!d.involvedPeople.trim() || HINTS.who.test(text),
  ];
}

const cut = (text, n = 110) => (text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, '')}…` : text);

export default function Denuncia() {
  const { lang, org, base, draft, setDraft, sent, setSent } = useOutletContext();
  const navigate = useNavigate();
  const T = translations[lang];
  const t = T.canal;
  // El canal de ejemplo no envía nada a ningún servidor: no hace falta la comprobación contra robots
  const needsCaptcha = HAS_CAPTCHA && !org.is_example;
  const [errors, setErrors] = useState({});
  const [more, setMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // sendErr | sendLimit | { clean: nombre del archivo }
  // Código e id del primer intento de envío: si la red falla después de guardar, el reintento usa los
  // mismos y la base de datos no crea una denuncia repetida
  const attemptRef = useRef(null);
  const [token, setToken] = useState(null);
  const headRef = useRef(null);
  const groupRef = useRef(null);
  const first = useRef(true);
  const step = draft.step;
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));
  const clear = (k) => setErrors(e => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });

  // Título neutro: el historial del navegador no debe decir que se está enviando una denuncia
  useEffect(() => { document.title = `${t.ethics} · ${org.name}`; }, [t, org]);

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
    if ((needsCaptcha && !token) || submitting) return;

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

  const done = covered(draft);
  const hasExtras = !!(draft.when || draft.department || draft.involvedPeople || draft.files.length);
  const nFiles = draft.files.length;

  return (
    <form className="flow" onSubmit={next} noValidate>
      <CanalHead lang={lang} org={org} anon={draft.isAnonymous} />
      <div className="flow-body">
        <StepBar lang={lang} total={3} current={step} />

        {/* ── Paso 1 · ¿Qué ha pasado? ─────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="flow-q">
              <Tc as="h1" className="ds-h1" lang={lang} k="q1" ref={headRef} tabIndex={-1} />
              <Tc as="p" className="ds-lead" lang={lang} k="q1Lead" />
            </div>
            <div className="cats" role="radiogroup" aria-label={t.q1Group} ref={groupRef} onKeyDown={onCatKey}>
              {CATEGORIES.map((value) => {
                const Icon = CAT_ICON[value];
                const on = draft.category === value;
                return (
                  <button
                    key={value} type="button" role="radio" aria-checked={on} className={cx('cat', value === 'other' && 'is-other')}
                    onClick={() => set({ category: value })}
                  >
                    <span className="cat-ico" aria-hidden="true"><Icon size={24} strokeWidth={1.8} /></span>
                    <Tc
                      lang={lang} className="cat-txt" inner="cat-txt-v"
                      pick={c => <><span className="cat-name">{c.cats[value][0]}</span><span className="cat-ex">{c.cats[value][1]}</span></>}
                    />
                    {on && <span className="cat-badge" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Paso 2 · Cuéntalo ────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="flow-q is-tight">
              <Chip tone="shade" size="md">{t.cats[draft.category][0]}</Chip>
              <Tc as="h1" className="ds-h1" lang={lang} k="q2" ref={headRef} tabIndex={-1} />
            </div>
            <div className="tell">
              <Card className="tell-main">
                <Field
                  as="textarea" id="dn-description" rows={9} label={<Tc lang={lang} k="what" />} value={draft.description}
                  error={errors.description && t[errors.description]}
                  onChange={e => { set({ description: e.target.value }); if (e.target.value.trim().length >= MIN_DESC) clear('description'); }}
                />
                <p className="helps">
                  <Tc lang={lang} k="help" />
                  {done.map((ok, i) => (
                    <Chip key={i} size="md" tone={ok ? 'ok' : 'neutral'} icon={ok ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}>
                      {t.helps[i]}<span className="ds-vh">: {ok ? t.helpDone : t.helpTodo}</span>
                    </Chip>
                  ))}
                </p>
                {draft.isAnonymous && (
                  <p className="warnbox" role="note">
                    <Shield size={18} strokeWidth={2} aria-hidden="true" />
                    <Tc lang={lang} k="anonWarn" className="ds-wide" /><Tc lang={lang} k="anonWarnShort" className="ds-narrow" />
                  </p>
                )}
              </Card>

              {/* En el móvil, los detalles opcionales y las pruebas se abren con un botón */}
              <button type="button" className="tell-more" aria-expanded={more || hasExtras} aria-controls="dn-extras" onClick={() => setMore(m => !m)} hidden={hasExtras}>
                <Plus size={18} strokeWidth={2.4} aria-hidden="true" /><Tc lang={lang} k="more" />
              </button>
              <div className={cx('tell-side', !(more || hasExtras) && 'is-closed')} id="dn-extras">
                <Card>
                  <span className="ds-card-title is-sm"><Tc lang={lang} k="ifKnown" /> <span className="tell-opt">· <Tc lang={lang} k="optional" /></span></span>
                  <Field size="sm" label={<Tc lang={lang} k="when" />} placeholder={t.whenPh} value={draft.when} maxLength={120} onChange={e => set({ when: e.target.value })} />
                  <Field size="sm" label={<Tc lang={lang} k="where" />} value={draft.department} maxLength={160} onChange={e => set({ department: e.target.value })} />
                  <Field size="sm" label={<Tc lang={lang} k="who" />} placeholder={t.whoPh} value={draft.involvedPeople} maxLength={300} onChange={e => set({ involvedPeople: e.target.value })} />
                </Card>
                <Pruebas lang={lang} files={draft.files} onChange={files => set({ files })} />
              </div>
            </div>
          </>
        )}

        {/* ── Paso 3 · ¿Quieres dar tu nombre? ─────────────────────── */}
        {step === 3 && (
          <>
            <Tc as="h1" className="ds-h1" lang={lang} k="q3" ref={headRef} tabIndex={-1} />
            <div className="ident">
              <div className="ident-main">
                <fieldset className="opts">
                  <legend className="ds-vh">{t.q3}</legend>
                  <label className="opt">
                    <input type="radio" name="dn-mode" className="ds-vh" checked={draft.isAnonymous} onChange={() => { set({ isAnonymous: true }); clear('email'); }} />
                    <span className="opt-dot" aria-hidden="true" />
                    <Tc
                      lang={lang} className="opt-txt" inner="opt-txt-v"
                      pick={c => <><span className="opt-t">{c.anonT}<Chip tone="report" className="opt-chip">{c.recommended}</Chip></span><span className="opt-d">{c.anonD}</span></>}
                    />
                  </label>
                  <label className="opt">
                    <input type="radio" name="dn-mode" className="ds-vh" checked={!draft.isAnonymous} onChange={() => set({ isAnonymous: false })} />
                    <span className="opt-dot" aria-hidden="true" />
                    <Tc
                      lang={lang} className="opt-txt" inner="opt-txt-v"
                      pick={c => <><span className="opt-t">{c.identT}</span><span className="opt-d">{c.identD}</span></>}
                    />
                  </label>
                </fieldset>

                {!draft.isAnonymous && (
                  <Card as="fieldset" className="ident-data">
                    <legend className="ds-vh">{t.yourData}</legend>
                    <Field
                      id="dn-email" type="email" inputMode="email" autoComplete="email" label={<Tc lang={lang} k="email" />} tag={t.required}
                      value={draft.email} error={errors.email && t[errors.email]} onChange={e => { set({ email: e.target.value }); clear('email'); }}
                    />
                    <div className="ident-two">
                      <Field autoComplete="name" label={<Tc lang={lang} k="name" />} tag={t.optional} value={draft.name} onChange={e => set({ name: e.target.value })} />
                      <Field type="tel" inputMode="tel" autoComplete="tel" label={<Tc lang={lang} k="phone" />} tag={t.optional} value={draft.phone} onChange={e => set({ phone: e.target.value })} />
                    </div>
                  </Card>
                )}

                <label className="meet">
                  <input type="checkbox" checked={draft.meeting} onChange={e => set({ meeting: e.target.checked })} />
                  <span><b><Tc lang={lang} k="meetB" /></b> <Tc lang={lang} k="meetD" className="meet-d" /></span>
                </label>
              </div>

              <Card className="ident-side">
                <Tc lang={lang} k="review" className="ds-card-title is-sm" />
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
                <Button variant="soft" size="xs" className="review-change" onClick={() => { setErrors({}); set({ step: 2 }); }} icon={<Pencil size={14} strokeWidth={2.4} aria-hidden="true" />}>{t.change}</Button>
                <label className={cx('consent', errors.privacy && 'is-invalid')}>
                  <input
                    id="dn-privacy" type="checkbox" checked={draft.privacy} aria-invalid={errors.privacy ? true : undefined}
                    aria-describedby={errors.privacy ? 'dn-privacy-e' : undefined}
                    onChange={e => { set({ privacy: e.target.checked }); clear('privacy'); }}
                  />
                  <span>{t.consentA}<a href={`${base}/privacidad?lang=${lang}`} target="_blank" rel="noopener noreferrer">{t.consentLink}</a>{t.consentZ}</span>
                </label>
                {errors.privacy && <p className="ds-field-error" id="dn-privacy-e" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{t[errors.privacy]}</p>}
              </Card>
            </div>

            {needsCaptcha && (
              <div className="flow-captcha" aria-label={T.v2.verifying}>
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} options={{ language: lang }}
                  onSuccess={setToken} onError={() => setToken(null)} onExpire={() => setToken(null)}
                />
              </div>
            )}
            {submitError && <p className="flow-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{submitError.clean ? fmt(t.cleanErr, { name: submitError.clean }) : t[submitError]}</p>}
          </>
        )}

        <div className="flow-actions">
          <Button variant="shade" size="lg" className="flow-back" onClick={back} aria-label={t.back}>
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" className="ds-narrow" /><Tc lang={lang} k="back" className="ds-wide" />
          </Button>
          {step < 3 ? (
            <Button type="submit" variant="white" size="lg" className="flow-next" disabled={step === 1 && !draft.category} iconEnd={<ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />}>
              <Tc lang={lang} k="next" />
            </Button>
          ) : (
            <Button type="submit" variant="white" size="lg" className="flow-next" disabled={needsCaptcha && !token} busy={submitting} iconEnd={<Send size={20} strokeWidth={2.2} aria-hidden="true" />}>
              <Tc lang={lang} k={submitting ? 'sending' : 'send'} />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
