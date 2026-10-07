import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  EyeOff, UserRound, X, KeyRound, Check, Eye, ShieldAlert, ChevronLeft, ArrowRight,
  CircleAlert, Upload, Paperclip, Trash2, TriangleAlert, Copy, Download, CircleCheck, Search,
} from 'lucide-react';
import { translations } from '../translations.js';
import { saveComplaint, IS_DEMO } from '../lib/supabase.js';
import { ICON, fmt, stableOf, Swap } from './V2Layout.jsx';
import { EMAIL_RE } from './site/fields.jsx';

const TOTAL_STEPS = 4;
const MAX_FILES = 5;
// Límit per arxiu, en MB. El marca el pla de Supabase (50 al gratuït) i es canvia amb VITE_MAX_FILE_MB
const MAX_FILE_MB = Number(import.meta.env.VITE_MAX_FILE_MB) > 0 ? Number(import.meta.env.VITE_MAX_FILE_MB) : 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MIN_DESC = 20;
// Verificació antibot: només amb clau configurada i fora de la demo (sense clau de proves per defecte)
const HAS_CAPTCHA = !IS_DEMO && !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
// Tipus admesos: els que anuncia el text de límits (PDF, imatges, vídeo, àudio i documents d'oficina)
const EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp',
  'mp4', 'mov', 'm4v', 'avi', 'webm', '3gp', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'opus', 'amr',
  'zip', 'eml', 'msg',
];
const ACCEPT = EXTENSIONS.map(e => `.${e}`).join(',');
const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

// Esborrany en memòria del mòdul, MAI a l'emmagatzematge del navegador (en un equip de l'empresa
// seria un risc per a l'anonimat). Sobreviu a la navegació dins del canal (enrere i endavant,
// tornar a l'inici), no a recarregar ni a tancar la pestanya. Clau: l'adreça del canal.
const drafts = new Map();

const EMPTY_FORM = {
  isAnonymous: true, name: '', email: '', phone: '',
  category: '', department: '', description: '', incidentDate: '', involvedPeople: '',
  files: [], privacy: false,
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
// Data local d'avui en format AAAA-MM-DD (toISOString donaria la d'UTC)
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function longDate(iso, lang) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE[lang] ?? 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function FieldError({ id, children }) {
  if (!children) return null;
  return <p className="v2-err" id={id}><CircleAlert {...ICON} />{children}</p>;
}

// ── Progrés: barres + noms de pas + mode actiu (es repeteix als 4 passos) ──
// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, el formulari no es mou
const S = stableOf(T => T.v2);

function Progress({ t, steps, step, isAnonymous }) {
  return (
    <div className="v2-task-head">
      <div className="v2-task-top">
        <S className="v2-step-count" pick={x => fmt(x.stepOf, { n: step, total: TOTAL_STEPS })} />
        {isAnonymous
          ? <span className="v2-mode is-anon"><EyeOff {...ICON} />{t.modeAnon}</span>
          : <span className="v2-mode is-ident"><UserRound {...ICON} />{t.modeIdent}</span>}
      </div>
      <nav className="v2-steps" aria-label={t.progress}>
        <ol>
          {steps.map((label, i) => {
            const n = i + 1;
            return (
              <li key={n} className={n < step ? 'is-done' : undefined} aria-current={n === step ? 'step' : undefined}>
                <span className="bar" />
                <span className="lbl"><span className="n">{n}</span><S pick={(x, T) => T.steps[i]} /></span>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// ── Adjunts ──────────────────────────────────────────────────────
function Files({ t, files, onChange }) {
  const [over, setOver] = useState(false);
  const [skipped, setSkipped] = useState([]); // [{ name, reason }]
  const inputRef = useRef(null);
  const pickRef = useRef(null);
  const listRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const all = [...files];
    const rejected = [];
    for (const f of incoming) {
      const reason = !EXTENSIONS.includes(extOf(f.name)) ? 'rejType'
        : f.size === 0 ? 'rejEmpty'
        : f.size > MAX_FILE_BYTES ? 'rejSize'
        : all.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified) ? 'rejDup'
        : all.length >= MAX_FILES ? 'rejMax'
        : null;
      if (reason) rejected.push({ name: f.name, reason });
      else all.push(f);
    }
    setSkipped(rejected);
    onChange(all);
  }, [files, onChange]);

  // En treure un arxiu, el focus passa al següent (o al botó de triar) i no es perd
  function remove(i) {
    setSkipped([]);
    onChange(files.filter((_, j) => j !== i));
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll('button') ?? [];
      (buttons[Math.min(i, buttons.length - 1)] ?? pickRef.current)?.focus();
    });
  }

  return (
    <>
      <div
        className={`v2-drop${over ? ' is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        <Upload {...ICON} />
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="v2-vh"
          tabIndex={-1}
          aria-hidden="true"
          onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }}
        />
        <button
          ref={pickRef}
          type="button"
          className="v2-btn v2-btn-secondary icon-lead"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <Paperclip {...ICON} />{t.pick}
        </button>
        <p className="v2-drop-hint">{t.drop}</p>
        <p className="v2-limits">{fmt(t.limits, { mb: MAX_FILE_MB })}</p>
      </div>

      {skipped.length > 0 && (
        <div className="v2-note is-error" role="alert">
          <CircleAlert {...ICON} />
          <div>
            <p>{t.skipped}</p>
            <ul className="v2-rejected">
              {skipped.map((r, i) => <li key={`${r.name}-${i}`}><span className="v2-rejected-name">{r.name}</span>: {fmt(t[r.reason], { mb: MAX_FILE_MB })}</li>)}
            </ul>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <>
          <ul className="v2-files" ref={listRef}>
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}-${f.lastModified}`} className="v2-file">
                <Paperclip {...ICON} />
                <span className="v2-file-name" title={f.name}>{f.name}</span>
                <span className="v2-file-size">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  className="v2-icon-btn"
                  aria-label={fmt(t.remove, { name: f.name })}
                  onClick={() => remove(i)}
                >
                  <Trash2 {...ICON} />
                </button>
              </li>
            ))}
          </ul>
          <p className="v2-files-count">{fmt(t.filesCount, { n: files.length })}</p>
        </>
      )}

      <div className="v2-note is-quiet"><TriangleAlert {...ICON} /><p>{t.metaWarn}</p></div>
    </>
  );
}

// ── Pantalla d'èxit ──────────────────────────────────────────────
function Success({ t, code, base, lang, failed = 0, onTrack, onHome }) {
  const [copied, setCopied] = useState(false);
  const [secured, setSecured] = useState(false); // ha copiat o descarregat el codi
  const codeRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => { headRef.current?.focus(); }, []);

  // Fins que no copia o descarrega el codi, tancar o recarregar la pestanya demana confirmació
  useEffect(() => {
    if (secured) return undefined;
    const onBefore = (e) => {
      if (window.__v2Exiting) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [secured]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Sense API de porta-retalls (http o navegadors antics): seleccionem el codi
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
    }
    setCopied(true);
    setSecured(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function download() {
    const locale = lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES';
    const url = `${window.location.origin}${base}/consulta`;
    const text = [
      t.receiptTitle,
      '',
      `${t.fCode}: ${code}`,
      `${t.receiptDate}: ${new Date().toLocaleString(locale)}`,
      `${t.receiptUrl}: ${url}`,
      '',
      t.codeWarn,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${code}.txt`; // nom neutre, sense paraules com "denúncia"
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setSecured(true);
  }

  return (
    <div className="v2-wrap is-narrow">
      <div className="v2-done">
        <div className="v2-done-icon"><CircleCheck {...ICON} /></div>
        <S as="h1" className="v2-h1" ref={headRef} tabIndex={-1} k="okTitle" />
        <S as="p" className="v2-lead" k="okLead" />
        <div className="v2-bigcode" ref={codeRef} aria-hidden="true">{code}</div>
        <p className="v2-vh">{code.split('').join(' ')}</p>
        <div className="v2-done-actions">
          <button type="button" className="v2-btn v2-btn-primary icon-lead" onClick={copy}>
            {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
            <Swap lang={lang} on={copied} pick={T => T.v2.copy} pickOn={T => T.v2.copied} />
          </button>
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={download}>
            <Download {...ICON} />{t.download}
          </button>
        </div>
        <div className="v2-note"><KeyRound {...ICON} /><p>{t.codeWarn}</p></div>
        {failed > 0 && (
          <div className="v2-note is-error" role="alert">
            <TriangleAlert {...ICON} />
            <p>{failed === 1 ? t.filesFailedOne : fmt(t.filesFailed, { n: failed })}</p>
          </div>
        )}
        <div className="v2-done-links">
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={onTrack}>
            <Search {...ICON} />{t.trackNow}
          </button>
          <Link className="v2-btn v2-btn-quiet" to={base} replace onClick={onHome}>{t.goHome}</Link>
        </div>
      </div>
    </div>
  );
}

// ── Formulari ────────────────────────────────────────────────────
export default function V2Form() {
  const { lang, org, base } = useOutletContext();
  // El canal d'exemple no envia res a cap servidor: no cal la comprovació contra robots
  const needsCaptcha = HAS_CAPTCHA && !org.is_example;
  const navigate = useNavigate();
  const root = translations[lang];
  const t = root.v2;

  const saved = drafts.get(base);
  const [step, setStep] = useState(saved?.step ?? 1);
  const [form, setForm] = useState(saved?.form ?? EMPTY_FORM);
  const [errors, setErrors] = useState({}); // { camp: clau del text }: es tradueix en pintar, així canvia amb l'idioma
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [trackingCode, setTrackingCode] = useState(saved?.trackingCode ?? null);
  const [failedFiles, setFailedFiles] = useState(saved?.failedFiles ?? 0);
  const [toSummary, setToSummary] = useState(false); // s'ha entrat a editar des del resum
  const headRef = useRef(null);
  const firstRender = useRef(true);

  // L'esborrany (i el codi, un cop enviada) es guarda en memòria a cada canvi
  useEffect(() => { drafts.set(base, { step, form, trackingCode, failedFiles }); }, [base, step, form, trackingCode, failedFiles]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const clearError = (key) => setErrors(e => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });

  // Títol neutre a la pantalla d'èxit: l'historial no ha de dir que s'ha enviat una denúncia
  useEffect(() => { document.title = `${trackingCode ? t.channelName : t.ctaSubmit} · ${org.name}`; }, [t, org, trackingCode]);

  // En canviar de pas: a dalt de tot i focus al títol (lectors de pantalla)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo(0, 0);
    headRef.current?.focus();
  }, [step]);

  // Avís si es tanca la pestanya amb dades escrites (no en "Sortir ràpidament")
  const dirty = !trackingCode && (step > 1 || form.name || form.email || form.phone);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => {
      if (window.__v2Exiting) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  function validate(s) {
    const errs = {};
    if (s === 1 && !form.isAnonymous && !EMAIL_RE.test(form.email.trim())) errs.email = 'errEmail';
    if (s === 2) {
      if (!form.category) errs.category = 'errCategory';
      if (form.description.trim().length < MIN_DESC) errs.description = 'errDescription';
      if (form.incidentDate) {
        const d = new Date(`${form.incidentDate}T12:00:00`);
        if (Number.isNaN(d.getTime()) || d.getFullYear() < 1950 || form.incidentDate > todayIso()) errs.date = 'errDate';
      }
    }
    if (s === 4 && !form.privacy) errs.privacy = 'consentErr';
    setErrors(errs);
    return errs;
  }

  function focusFirstError(errs) {
    const first = Object.keys(errs)[0];
    if (!first) return;
    // Al centre de la pantalla: al mòbil, la barra fixa de Tornar / Continuar no el tapa
    requestAnimationFrame(() => {
      const el = document.getElementById(`v2-f-${first}`);
      el?.scrollIntoView({ block: 'center', behavior: 'auto' });
      el?.focus({ preventScroll: true });
    });
  }

  function next() {
    const errs = validate(step);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }
    // Si s'ha vingut a editar des del resum, es torna al resum
    if (toSummary) { setToSummary(false); setStep(4); return; }
    setStep(s => s + 1);
  }

  function back() {
    setErrors({});
    // Dins del canal es navega substituint l'entrada de l'historial: el canal només n'ocupa una
    if (step === 1) navigate(base, { replace: true });
    else setStep(s => s - 1);
  }

  function goTo(s) { setErrors({}); setToSummary(true); setStep(s); }

  // Sortir de la pantalla d'èxit per decisió pròpia esborra el codi de la memòria
  function forget() { drafts.delete(base); }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(4);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }
    if ((needsCaptcha && !turnstileToken) || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const { trackingCode: code, failedFiles: failed, error } = await saveComplaint({
        formData: { ...form, language: lang },
        files: form.files,
        organizationId: org.id,
      });
      if (error) { console.error('[Supabase]', error); setSubmitError(true); }
      else { setFailedFiles(failed?.length ?? 0); setTrackingCode(code); }
    } catch (err) {
      console.error(err);
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (trackingCode) {
    return (
      <Success
        t={t}
        code={trackingCode}
        base={base}
        lang={lang}
        failed={failedFiles}
        onHome={forget}
        onTrack={() => { forget(); navigate(`${base}/consulta`, { replace: true, state: { code: trackingCode } }); }}
      />
    );
  }

  const categoryLabel = root.categories.find(c => c.value === form.category)?.label;
  const descLen = form.description.trim().length;

  return (
    <div className="v2-wrap is-narrow">
      <form className="v2-task" onSubmit={step === 4 ? submit : (e) => { e.preventDefault(); next(); }} noValidate>
        <Progress t={t} steps={root.steps} step={step} isAnonymous={form.isAnonymous} />

        {/* ── PAS 1 · Identitat ─────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="v2-q">
              <S as="h1" className="v2-h1" ref={headRef} tabIndex={-1} k="s1Title" />
              <S as="p" className="v2-lead" k="s1Lead" />
            </div>

            <div className="v2-options" role="radiogroup" aria-label={t.s1Title}>
              <label className={`v2-opt${form.isAnonymous ? ' is-on' : ''}`}>
                <input type="radio" name="v2-mode" checked={form.isAnonymous} onChange={() => { set('isAnonymous', true); clearError('email'); }} aria-describedby="v2-d-anon" />
                <span className="v2-radio" aria-hidden="true" />
                <span>
                  <span className="v2-opt-head"><S className="v2-opt-title" k="anonTitle" /><span className="v2-badge">{t.recommended}</span></span>
                  <S block className="v2-opt-desc" k="anonDesc" />
                  <span className="v2-facts" id="v2-d-anon">
                    <span className="v2-fact"><X {...ICON} /><S k="anonF1" /></span>
                    <span className="v2-fact"><KeyRound {...ICON} /><S k="anonF2" /></span>
                  </span>
                </span>
              </label>

              <label className={`v2-opt${!form.isAnonymous ? ' is-on' : ''}`}>
                <input type="radio" name="v2-mode" checked={!form.isAnonymous} onChange={() => set('isAnonymous', false)} aria-describedby="v2-d-ident" />
                <span className="v2-radio" aria-hidden="true" />
                <span>
                  <span className="v2-opt-head"><S className="v2-opt-title" k="identTitle" /></span>
                  <S block className="v2-opt-desc" k="identDesc" />
                  <span className="v2-facts" id="v2-d-ident">
                    <span className="v2-fact"><Check {...ICON} /><S k="identF1" /></span>
                    <span className="v2-fact"><Eye {...ICON} /><S k="identF2" /></span>
                  </span>
                </span>
              </label>
            </div>

            {form.isAnonymous ? (
              <div className="v2-note" role="note">
                <ShieldAlert {...ICON} />
                <p>{t.anonWarn}<small>{t.anonWarnEx}</small></p>
              </div>
            ) : (
              <fieldset className="v2-panel">
                <legend className="v2-vh">{t.yourData}</legend>
                <p className="v2-panel-title" aria-hidden="true">{t.yourData}</p>
                <p className="v2-panel-help">{t.yourDataHelp}</p>
                <div className="v2-fields is-two">
                  <div className="v2-field is-full">
                    <label htmlFor="v2-f-email">{t.fEmail} <span className="tag">{t.requiredTag}</span></label>
                    <input
                      id="v2-f-email" className="v2-input" type="email" inputMode="email" autoComplete="email" enterKeyHint="next"
                      value={form.email}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'v2-e-email' : undefined}
                      onChange={e => { set('email', e.target.value); clearError('email'); }}
                    />
                    <FieldError id="v2-e-email">{t[errors.email]}</FieldError>
                  </div>
                  <div className="v2-field">
                    <label htmlFor="v2-f-name">{t.fName} <span className="tag">{t.optionalTag}</span></label>
                    <input id="v2-f-name" className="v2-input" autoComplete="name" enterKeyHint="next" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="v2-field">
                    <label htmlFor="v2-f-phone">{t.fPhone} <span className="tag">{t.optionalTag}</span></label>
                    <input id="v2-f-phone" className="v2-input" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>
              </fieldset>
            )}
          </>
        )}

        {/* ── PAS 2 · Incident ──────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="v2-q">
              <S as="h1" className="v2-h1" ref={headRef} tabIndex={-1} k="s2Title" />
              <S as="p" className="v2-lead" k="s2Lead" />
            </div>

            {Object.keys(errors).length > 1 && (
              <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{t.errorSummary}</p></div>
            )}

            <div className="v2-fields">
              <fieldset className="v2-field" aria-describedby={errors.category ? 'v2-e-category' : undefined}>
                <legend className="v2-label">{t.category} <span className="tag">{t.requiredTag}</span></legend>
                <div className={`v2-choices${errors.category ? ' is-invalid' : ''}`}>
                  {root.categories.map((c, i) => (
                    <label key={c.value} className={`v2-choice${form.category === c.value ? ' is-on' : ''}`}>
                      <input
                        type="radio" name="v2-category" value={c.value}
                        id={i === 0 ? 'v2-f-category' : undefined}
                        checked={form.category === c.value}
                        aria-invalid={!!errors.category || undefined}
                        onChange={() => { set('category', c.value); clearError('category'); }}
                      />
                      <span className="v2-radio" aria-hidden="true" />
                      {c.label}
                    </label>
                  ))}
                </div>
                <FieldError id="v2-e-category">{t[errors.category]}</FieldError>
              </fieldset>

              <div className="v2-field">
                <label htmlFor="v2-f-description">{t.description} <span className="tag">{t.requiredTag}</span></label>
                <p className="v2-help" id="v2-h-description">{t.descriptionHelp}</p>
                <textarea
                  id="v2-f-description" className="v2-input" rows={7}
                  value={form.description}
                  aria-invalid={!!errors.description}
                  aria-describedby={`v2-h-description${errors.description ? ' v2-e-description' : ''}`}
                  onChange={e => { set('description', e.target.value); if (e.target.value.trim().length >= MIN_DESC) clearError('description'); }}
                />
                <div className="v2-field-meta">
                  <span>{fmt(t.minChars, { n: MIN_DESC })}</span>
                  <span>{descLen === 1 ? t.charCountOne : fmt(t.charCount, { n: descLen })}</span>
                </div>
                <FieldError id="v2-e-description">{t[errors.description]}</FieldError>
                {form.isAnonymous && (
                  <div className="v2-note" role="note"><ShieldAlert {...ICON} /><p>{t.anonWarn}<small>{t.anonWarnEx}</small></p></div>
                )}
              </div>

              <div className="v2-fields is-two is-flush">
                <div className="v2-field is-full">
                  <label htmlFor="v2-f-department">{t.department} <span className="tag">{t.optionalTag}</span></label>
                  <input id="v2-f-department" className="v2-input" value={form.department} onChange={e => set('department', e.target.value)} />
                </div>
                <div className="v2-field">
                  <label htmlFor="v2-f-date">{t.incidentDate} <span className="tag">{t.optionalTag}</span></label>
                  <input
                    id="v2-f-date" className="v2-input" type="date" min="1950-01-01" max={todayIso()} value={form.incidentDate}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? 'v2-e-date' : undefined}
                    onChange={e => { set('incidentDate', e.target.value); clearError('date'); }}
                  />
                  <FieldError id="v2-e-date">{t[errors.date]}</FieldError>
                </div>
                <div className="v2-field">
                  <label htmlFor="v2-f-involved">{t.involved} <span className="tag">{t.optionalTag}</span></label>
                  <input id="v2-f-involved" className="v2-input" placeholder={t.involvedPh} value={form.involvedPeople} onChange={e => set('involvedPeople', e.target.value)} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── PAS 3 · Documents ─────────────────────────────── */}
        {step === 3 && (
          <>
            <div className="v2-q">
              <S as="h1" className="v2-h1" ref={headRef} tabIndex={-1} k="s3Title" />
              <S as="p" className="v2-lead" k="s3Lead" />
            </div>
            <Files t={t} files={form.files} onChange={files => set('files', files)} />
          </>
        )}

        {/* ── PAS 4 · Revisió i enviament ───────────────────── */}
        {step === 4 && (
          <>
            <div className="v2-q">
              <S as="h1" className="v2-h1" ref={headRef} tabIndex={-1} k="s4Title" />
              <S as="p" className="v2-lead" k="s4Lead" />
            </div>

            <dl className="v2-summary">
              <div className="v2-sum-row">
                <dt>{t.sumMode}</dt>
                <dd>
                  {form.isAnonymous
                    ? <span className="v2-pill"><EyeOff {...ICON} />{t.sumAnon}</span>
                    : <span className="v2-pill"><UserRound {...ICON} />{t.sumIdent}: {[form.name, form.email, form.phone].map(v => v.trim()).filter(Boolean).join(' · ')}</span>}
                </dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumMode}`} onClick={() => goTo(1)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumCategory}</dt>
                <dd>{categoryLabel}</dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumCategory}`} onClick={() => goTo(2)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDescription}</dt>
                <dd className="v2-sum-desc">{form.description.trim()}</dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumDescription}`} onClick={() => goTo(2)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDepartment}</dt>
                <dd className={form.department.trim() ? undefined : 'is-empty'}>{form.department.trim() || t.none}</dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumDepartment}`} onClick={() => goTo(2)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDate}</dt>
                <dd className={form.incidentDate ? undefined : 'is-empty'}>{form.incidentDate ? longDate(form.incidentDate, lang) : t.none}</dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumDate}`} onClick={() => goTo(2)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumInvolved}</dt>
                <dd className={form.involvedPeople.trim() ? undefined : 'is-empty'}>{form.involvedPeople.trim() || t.none}</dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumInvolved}`} onClick={() => goTo(2)}>{t.edit}</button></dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumFiles}</dt>
                <dd className={form.files.length ? undefined : 'is-empty'}>
                  {form.files.length ? form.files.map(f => f.name).join('\n') : t.noFiles}
                </dd>

                <dd className="v2-sum-act"><button type="button" className="v2-btn v2-btn-quiet" aria-label={`${t.edit}: ${t.sumFiles}`} onClick={() => goTo(3)}>{t.edit}</button></dd>
              </div>
            </dl>

            <label className={`v2-check${form.privacy ? ' is-on' : ''}${errors.privacy ? ' is-invalid' : ''}`}>
              <input
                id="v2-f-privacy" type="checkbox" checked={form.privacy}
                aria-invalid={!!errors.privacy}
                aria-describedby={errors.privacy ? 'v2-e-privacy' : undefined}
                onChange={e => { set('privacy', e.target.checked); clearError('privacy'); }}
              />
              <span className="v2-box" aria-hidden="true"><Check strokeWidth={3} aria-hidden="true" /></span>
              <span>{t.consent}</span>
            </label>
            <FieldError id="v2-e-privacy">{t[errors.privacy]}</FieldError>
            <p className="v2-consent-link">
              <a className="v2-link" href={`${base}/privacidad?lang=${lang}`} target="_blank" rel="noopener noreferrer">{t.privacyRead}</a>
            </p>

            {needsCaptcha && <div className="v2-turnstile" aria-label={t.verifying}>
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                options={{ language: lang }}
                onSuccess={token => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>}

            {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{t.submitError}</p></div>}
          </>
        )}

        {/* ── Navegació: Tornar sempre visible i a la mateixa altura que Continuar ── */}
        <div className="v2-actionbar">
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={back}>
            <ChevronLeft {...ICON} /><S k="back" />
          </button>
          {step < 4 ? (
            <button type="submit" className="v2-btn v2-btn-primary icon-trail">
              <S k="next" /><ArrowRight {...ICON} />
            </button>
          ) : (
            <button
              type="submit"
              className="v2-btn v2-btn-primary icon-trail"
              disabled={needsCaptcha && !turnstileToken}
              aria-busy={submitting}
            >
              <S k={submitting ? 'submitting' : 'submit'} /><ArrowRight {...ICON} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
