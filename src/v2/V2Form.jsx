import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  EyeOff, UserRound, X, KeyRound, Check, Eye, ShieldAlert, ChevronLeft, ArrowRight,
  CircleAlert, Upload, Paperclip, Trash2, TriangleAlert, Copy, Download, CircleCheck, Search,
} from 'lucide-react';
import { translations } from '../translations.js';
import { saveComplaint, IS_DEMO } from '../lib/supabase.js';
import { ICON, fmt } from './V2Layout.jsx';

const TOTAL_STEPS = 4;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const MIN_DESC = 20;
const NEEDS_CAPTCHA = !IS_DEMO; // en mode demo no es mostra el giny de proves de Cloudflare
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';

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

function FieldError({ id, children }) {
  if (!children) return null;
  return <p className="v2-err" id={id}><CircleAlert {...ICON} />{children}</p>;
}

// ── Progrés: barres + noms de pas + mode actiu (es repeteix als 4 passos) ──
function Progress({ t, steps, step, isAnonymous }) {
  return (
    <div className="v2-task-head">
      <div className="v2-task-top">
        <span className="v2-step-count">{fmt(t.stepOf, { n: step, total: TOTAL_STEPS })}</span>
        {isAnonymous
          ? <span className="v2-mode is-anon"><EyeOff {...ICON} />{t.modeAnon}</span>
          : <span className="v2-mode is-ident"><UserRound {...ICON} />{t.modeIdent}</span>}
      </div>
      <nav className="v2-steps" aria-label={t.progress}>
        <ol>
          {steps.map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className={n < step ? 'is-done' : undefined} aria-current={n === step ? 'step' : undefined}>
                <span className="bar" />
                <span className="lbl"><span className="n">{n}</span>{label}</span>
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
  const [skipped, setSkipped] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const all = [...files];
    let rejected = false;
    for (const f of incoming) {
      if (all.length >= MAX_FILES || f.size > MAX_FILE_BYTES) { rejected = true; continue; }
      if (!all.find(x => x.name === f.name && x.size === f.size)) all.push(f);
    }
    setSkipped(rejected);
    onChange(all);
  }, [files, onChange]);

  return (
    <>
      <div
        className={`v2-drop${over ? ' is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
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
          onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }}
        />
        <button
          type="button"
          className="v2-btn v2-btn-secondary icon-lead"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <Paperclip {...ICON} />{t.pick}
        </button>
        <p>{t.drop}</p>
        <p className="v2-limits">{t.limits}</p>
      </div>

      {skipped && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{t.skipped}</p></div>}

      {files.length > 0 && (
        <>
          <ul className="v2-files">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className="v2-file">
                <Paperclip {...ICON} />
                <span className="v2-file-name" title={f.name}>{f.name}</span>
                <span className="v2-file-size">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  className="v2-icon-btn"
                  aria-label={fmt(t.remove, { name: f.name })}
                  onClick={() => { setSkipped(false); onChange(files.filter((_, j) => j !== i)); }}
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
function Success({ t, code, base, lang, onTrack }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => { headRef.current?.focus(); }, []);

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
  }

  return (
    <div className="v2-wrap is-narrow">
      <div className="v2-done">
        <div className="v2-done-icon"><CircleCheck {...ICON} /></div>
        <h1 className="v2-h1" ref={headRef} tabIndex={-1}>{t.okTitle}</h1>
        <p className="v2-lead">{t.okLead}</p>
        <div className="v2-bigcode" ref={codeRef} aria-label={code.split('').join(' ')}>{code}</div>
        <div className="v2-done-actions">
          <button type="button" className="v2-btn v2-btn-primary icon-lead" onClick={copy}>
            {copied ? <Check {...ICON} /> : <Copy {...ICON} />}
            <span aria-live="polite">{copied ? t.copied : t.copy}</span>
          </button>
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={download}>
            <Download {...ICON} />{t.download}
          </button>
        </div>
        <div className="v2-note"><KeyRound {...ICON} /><p>{t.codeWarn}</p></div>
        <div className="v2-done-links">
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={onTrack}>
            <Search {...ICON} />{t.trackNow}
          </button>
          <Link className="v2-btn v2-btn-quiet" to={base}>{t.goHome}</Link>
        </div>
      </div>
    </div>
  );
}

// ── Formulari ────────────────────────────────────────────────────
export default function V2Form() {
  const { lang, org, base } = useOutletContext();
  const navigate = useNavigate();
  const root = translations[lang];
  const t = root.v2;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [trackingCode, setTrackingCode] = useState(null);
  const headRef = useRef(null);
  const firstRender = useRef(true);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const clearError = (key) => setErrors(e => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });

  useEffect(() => { document.title = `${t.ctaSubmit} · ${org.name}`; }, [t, org]);

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
    if (s === 1 && !form.isAnonymous && !EMAIL_RE.test(form.email.trim())) errs.email = t.errEmail;
    if (s === 2) {
      if (!form.category) errs.category = t.errCategory;
      if (form.description.trim().length < MIN_DESC) errs.description = t.errDescription;
    }
    if (s === 4 && !form.privacy) errs.privacy = t.consentErr;
    setErrors(errs);
    return errs;
  }

  function focusFirstError(errs) {
    const first = Object.keys(errs)[0];
    if (!first) return;
    requestAnimationFrame(() => document.getElementById(`v2-f-${first}`)?.focus());
  }

  function next() {
    const errs = validate(step);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }
    setStep(s => s + 1);
  }

  function back() {
    setErrors({});
    if (step === 1) navigate(base);
    else setStep(s => s - 1);
  }

  function goTo(s) { setErrors({}); setStep(s); }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(4);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }
    if ((NEEDS_CAPTCHA && !turnstileToken) || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { trackingCode: code, error } = await saveComplaint({
        formData: { ...form, language: lang },
        files: form.files,
        organizationId: org.id,
      });
      if (error) { console.error('[Supabase]', error); setSubmitError(t.submitError); }
      else setTrackingCode(code);
    } catch (err) {
      console.error(err);
      setSubmitError(t.submitError);
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
        onTrack={() => navigate(`${base}/consulta`, { state: { code: trackingCode } })}
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
              <h1 className="v2-h1" ref={headRef} tabIndex={-1}>{t.s1Title}</h1>
              <p className="v2-lead">{t.s1Lead}</p>
            </div>

            <div className="v2-options" role="radiogroup" aria-label={t.s1Title}>
              <label className={`v2-opt${form.isAnonymous ? ' is-on' : ''}`}>
                <input type="radio" name="v2-mode" checked={form.isAnonymous} onChange={() => { set('isAnonymous', true); clearError('email'); }} aria-describedby="v2-d-anon" />
                <span className="v2-radio" aria-hidden="true" />
                <span>
                  <span className="v2-opt-head"><span className="v2-opt-title">{t.anonTitle}</span><span className="v2-badge">{t.recommended}</span></span>
                  <span className="v2-opt-desc">{t.anonDesc}</span>
                  <span className="v2-facts" id="v2-d-anon">
                    <span className="v2-fact"><X {...ICON} /><span>{t.anonF1}</span></span>
                    <span className="v2-fact"><KeyRound {...ICON} /><span>{t.anonF2}</span></span>
                  </span>
                </span>
              </label>

              <label className={`v2-opt${!form.isAnonymous ? ' is-on' : ''}`}>
                <input type="radio" name="v2-mode" checked={!form.isAnonymous} onChange={() => set('isAnonymous', false)} aria-describedby="v2-d-ident" />
                <span className="v2-radio" aria-hidden="true" />
                <span>
                  <span className="v2-opt-head"><span className="v2-opt-title">{t.identTitle}</span></span>
                  <span className="v2-opt-desc">{t.identDesc}</span>
                  <span className="v2-facts" id="v2-d-ident">
                    <span className="v2-fact"><Check {...ICON} /><span>{t.identF1}</span></span>
                    <span className="v2-fact"><Eye {...ICON} /><span>{t.identF2}</span></span>
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
                    <FieldError id="v2-e-email">{errors.email}</FieldError>
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
              <h1 className="v2-h1" ref={headRef} tabIndex={-1}>{t.s2Title}</h1>
              <p className="v2-lead">{t.s2Lead}</p>
            </div>

            {Object.keys(errors).length > 1 && (
              <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{t.errorSummary}</p></div>
            )}

            <div className="v2-fields">
              <fieldset className="v2-field">
                <legend className="v2-label">{t.category} <span className="tag">{t.requiredTag}</span></legend>
                <div className={`v2-choices${errors.category ? ' is-invalid' : ''}`} role="radiogroup" aria-describedby={errors.category ? 'v2-e-category' : undefined}>
                  {root.categories.map((c, i) => (
                    <label key={c.value} className={`v2-choice${form.category === c.value ? ' is-on' : ''}`}>
                      <input
                        type="radio" name="v2-category" value={c.value}
                        id={i === 0 ? 'v2-f-category' : undefined}
                        checked={form.category === c.value}
                        onChange={() => { set('category', c.value); clearError('category'); }}
                      />
                      <span className="v2-radio" aria-hidden="true" />
                      {c.label}
                    </label>
                  ))}
                </div>
                <FieldError id="v2-e-category">{errors.category}</FieldError>
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
                  <span>{fmt(t.charCount, { n: descLen })}</span>
                </div>
                <FieldError id="v2-e-description">{errors.description}</FieldError>
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
                  <input id="v2-f-date" className="v2-input" type="date" max={new Date().toISOString().split('T')[0]} value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)} />
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
              <h1 className="v2-h1" ref={headRef} tabIndex={-1}>{t.s3Title}</h1>
              <p className="v2-lead">{t.s3Lead}</p>
            </div>
            <Files t={t} files={form.files} onChange={files => set('files', files)} />
          </>
        )}

        {/* ── PAS 4 · Revisió i enviament ───────────────────── */}
        {step === 4 && (
          <>
            <div className="v2-q">
              <h1 className="v2-h1" ref={headRef} tabIndex={-1}>{t.s4Title}</h1>
              <p className="v2-lead">{t.s4Lead}</p>
            </div>

            <dl className="v2-summary">
              <div className="v2-sum-row">
                <dt>{t.sumMode}</dt>
                <dd>
                  {form.isAnonymous
                    ? <span className="v2-pill"><EyeOff {...ICON} />{t.sumAnon}</span>
                    : <span className="v2-pill"><UserRound {...ICON} />{t.sumIdent}: {[form.name, form.email, form.phone].filter(Boolean).join(' · ')}</span>}
                </dd>
                <button type="button" className="v2-btn v2-btn-quiet" onClick={() => goTo(1)}>{t.edit}</button>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumCategory}</dt>
                <dd>{categoryLabel}</dd>
                <button type="button" className="v2-btn v2-btn-quiet" onClick={() => goTo(2)}>{t.edit}</button>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDescription}</dt>
                <dd className="v2-sum-desc">{form.description.trim()}</dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDepartment}</dt>
                <dd className={form.department ? undefined : 'is-empty'}>{form.department || t.none}</dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumDate}</dt>
                <dd className={form.incidentDate ? undefined : 'is-empty'}>{form.incidentDate || t.none}</dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumInvolved}</dt>
                <dd className={form.involvedPeople ? undefined : 'is-empty'}>{form.involvedPeople || t.none}</dd>
              </div>
              <div className="v2-sum-row">
                <dt>{t.sumFiles}</dt>
                <dd className={form.files.length ? undefined : 'is-empty'}>
                  {form.files.length ? form.files.map(f => f.name).join('\n') : t.noFiles}
                </dd>
                <button type="button" className="v2-btn v2-btn-quiet" onClick={() => goTo(3)}>{t.edit}</button>
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
            <FieldError id="v2-e-privacy">{errors.privacy}</FieldError>

            {NEEDS_CAPTCHA && <div className="v2-turnstile" aria-label={t.verifying}>
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                options={{ language: lang }}
                onSuccess={token => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>}

            {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{submitError}</p></div>}
          </>
        )}

        {/* ── Navegació: Tornar sempre visible i a la mateixa altura que Continuar ── */}
        <div className="v2-actionbar">
          <button type="button" className="v2-btn v2-btn-secondary icon-lead" onClick={back}>
            <ChevronLeft {...ICON} />{t.back}
          </button>
          {step < 4 ? (
            <button type="submit" className="v2-btn v2-btn-primary icon-trail">
              {t.next}<ArrowRight {...ICON} />
            </button>
          ) : (
            <button
              type="submit"
              className="v2-btn v2-btn-primary icon-trail"
              disabled={NEEDS_CAPTCHA && !turnstileToken}
              aria-busy={submitting}
            >
              {submitting ? t.submitting : t.submit}<ArrowRight {...ICON} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
