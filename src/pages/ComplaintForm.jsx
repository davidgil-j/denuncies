import React, { useState, useCallback, useRef } from 'react';
import { translations } from '../translations.js';
import { saveComplaint } from '../lib/supabase.js';

// ── Helpers ──────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type) {
  if (!type) return '📎';
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf') return '📄';
  return '📎';
}

const MAX_FILES = 5;
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

// ── Step indicator ────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="steps-wrap">
      {steps.map((label, idx) => {
        const n = idx + 1;
        const isDone   = n < current;
        const isActive = n === current;
        return (
          <React.Fragment key={n}>
            <div className="step-item">
              <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                {isDone ? '✓' : n}
              </div>
              <span className={`step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`step-line ${isDone ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── File upload zone ──────────────────────────────────────────────
function FileUpload({ files, onChange, t }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const addFiles = useCallback((newFiles) => {
    const all = [...files];
    for (const f of newFiles) {
      if (all.length >= MAX_FILES) break;
      if (f.size > MAX_FILE_BYTES) continue; // silently skip >100MB
      if (!all.find(x => x.name === f.name && x.size === f.size)) all.push(f);
    }
    onChange(all);
  }, [files, onChange]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={(e) => addFiles(Array.from(e.target.files))}
          style={{ display: 'none' }}
        />
        <span className="upload-icon">📂</span>
        <div className="upload-main">{t.dragOrClick}</div>
        <div className="upload-sub">{t.allowedFormats}</div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-item">
              <span className="file-icon">{getFileIcon(f.type)}</span>
              <span className="file-name">{f.name}</span>
              <span className="file-size">{formatBytes(f.size)}</span>
              <button
                type="button"
                className="file-rm"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                title={t.removeFile}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <p className="upload-note">{t.step3Desc}</p>
    </div>
  );
}

// ── Main complaint form ───────────────────────────────────────────
export default function ComplaintForm({ lang, onTrack }) {
  const t = translations[lang];

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [trackingCode, setTrackingCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    isAnonymous: true,
    name: '',
    email: '',
    phone: '',
    category: '',
    department: '',
    description: '',
    incidentDate: '',
    involvedPeople: '',
    files: [],
    privacy: false,
    // honeypot
    _hp: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const clearError = (key) => setErrors(e => { const n = { ...e }; delete n[key]; return n; });

  // ── Validation ────────────────────────────────────────────────
  function validateStep(s) {
    const errs = {};
    if (s === 2) {
      if (!form.category) errs.category = t.required;
      if (!form.description || form.description.trim().length < 20)
        errs.description = t.required;
    }
    if (s === 4) {
      if (!form.privacy) errs.privacy = t.privacyRequired;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep(s => s + 1);
  }
  function handleBack() { setStep(s => s - 1); setErrors({}); }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep(4)) return;
    if (form._hp) return; // honeypot

    if (submitting) return; // protecció doble clic
    setSubmitting(true);
    try {
      const { trackingCode: code, error } = await saveComplaint({
        formData: { ...form, language: lang },
        files: form.files,
      });

      if (error) {
        // Fallback: show code even if DB is not yet connected
        console.error('[Supabase]', error);
        const fallback = 'DEMO-' + Math.random().toString(36).slice(2,6).toUpperCase();
        setTrackingCode(fallback);
      } else {
        setTrackingCode(code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(trackingCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleReset() {
    setForm({
      isAnonymous: true, name: '', email: '', phone: '',
      category: '', department: '', description: '',
      incidentDate: '', involvedPeople: '', files: [], privacy: false, _hp: '',
    });
    setStep(1);
    setTrackingCode(null);
    setErrors({});
  }

  // ── Success screen ────────────────────────────────────────────
  if (trackingCode) {
    return (
      <div className="success-wrap">
        <div className="success-icon-wrap">✓</div>
        <h2 className="success-title">{t.successTitle}</h2>
        <p className="success-desc">{t.successDesc}</p>

        <div className="tracking-box">
          <div className="tracking-label">{t.trackingLabel}</div>
          <div className="tracking-code">{trackingCode}</div>
          <button
            type="button"
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? t.copied : t.copyCode}
          </button>
        </div>

        {!form.isAnonymous && form.email && (
          <p className="success-note">📧 {t.successNote}</p>
        )}

        <div className="success-actions">
          <button type="button" className="btn-outline" onClick={() => onTrack(trackingCode)}>
            🔍 {t.trackStatus}
          </button>
          <button type="button" className="btn-link" onClick={handleReset}>
            {t.newComplaint}
          </button>
        </div>
      </div>
    );
  }

  // ── Form body steps ───────────────────────────────────────────
  const categoryLabel = form.category
    ? t.categories.find(c => c.value === form.category)?.label
    : '—';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepIndicator steps={t.steps} current={step} />

      <div className="card-body">
        {/* ── STEP 1: Identity ─────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="step-title">{t.step1Title}</div>

            <div className="mode-grid">
              <div
                className={`mode-card ${form.isAnonymous ? 'selected' : ''}`}
                onClick={() => set('isAnonymous', true)}
              >
                <span className="mode-icon">🕵️</span>
                <div className="mode-name">{t.anonymous}</div>
                <div className="mode-desc">{t.anonymousDesc}</div>
              </div>
              <div
                className={`mode-card ${!form.isAnonymous ? 'selected' : ''}`}
                onClick={() => set('isAnonymous', false)}
              >
                <span className="mode-icon">👤</span>
                <div className="mode-name">{t.identified}</div>
                <div className="mode-desc">{t.identifiedDesc}</div>
              </div>
            </div>

            {!form.isAnonymous && (
              <>
                <div className="field">
                  <label className="field-label">{t.name} <span className="opt">({t.optional})</span></label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="Anna García López"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="fields-row">
                  <div className="field">
                    <label className="field-label">{t.email} <span className="opt">({t.optional})</span></label>
                    <input
                      className="field-input"
                      type="email"
                      placeholder="correu@exemple.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t.phone} <span className="opt">({t.optional})</span></label>
                    <input
                      className="field-input"
                      type="tel"
                      placeholder="+34 600 000 000"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Honeypot (invisible anti-spam) */}
            <input
              type="text"
              name="_hp"
              value={form._hp}
              onChange={e => set('_hp', e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
          </>
        )}

        {/* ── STEP 2: Incident ─────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="step-title">{t.step2Title}</div>

            <div className="field">
              <label className="field-label">{t.category}</label>
              <select
                className={`field-input ${errors.category ? 'error' : ''}`}
                value={form.category}
                onChange={e => { set('category', e.target.value); clearError('category'); }}
              >
                <option value="">{t.selectCategory}</option>
                {t.categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && <div className="field-error">⚠ {errors.category}</div>}
            </div>

            <div className="field">
              <label className="field-label">{t.department}</label>
              <input
                className="field-input"
                type="text"
                placeholder={t.departmentPlaceholder}
                value={form.department}
                onChange={e => set('department', e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">{t.description}</label>
              <textarea
                className={`field-input ${errors.description ? 'error' : ''}`}
                placeholder={t.descriptionPlaceholder}
                value={form.description}
                onChange={e => { set('description', e.target.value); clearError('description'); }}
                rows={6}
              />
              {errors.description && <div className="field-error">⚠ {errors.description}</div>}
            </div>

            <div className="fields-row">
              <div className="field">
                <label className="field-label">{t.incidentDate} <span className="opt">({t.optional})</span></label>
                <input
                  className="field-input"
                  type="date"
                  value={form.incidentDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => set('incidentDate', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">{t.involvedPeople} <span className="opt">({t.optional})</span></label>
                <input
                  className="field-input"
                  type="text"
                  placeholder={t.involvedPeoplePlaceholder}
                  value={form.involvedPeople}
                  onChange={e => set('involvedPeople', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Documents ────────────────────────────────── */}
        {step === 3 && (
          <>
            <div className="step-title">{t.step3Title}</div>
            <FileUpload
              files={form.files}
              onChange={files => set('files', files)}
              t={t}
            />
          </>
        )}

        {/* ── STEP 4: Review ───────────────────────────────────── */}
        {step === 4 && (
          <>
            <div className="step-title">{t.step4Title}</div>

            <div className="summary-box">
              <div className="summary-row">
                <span className="summary-key">Modalitat</span>
                <span className="summary-val">
                  {form.isAnonymous
                    ? <span className="badge-anon">🕵️ {t.summaryAnonymous}</span>
                    : <span className="badge-ident">👤 {t.summaryIdentified}</span>
                  }
                </span>
              </div>
              {!form.isAnonymous && form.name && (
                <div className="summary-row">
                  <span className="summary-key">{t.name}</span>
                  <span className="summary-val">{form.name}</span>
                </div>
              )}
              <div className="summary-row">
                <span className="summary-key">{t.summaryCategory}</span>
                <span className="summary-val">{categoryLabel}</span>
              </div>
              {form.department && (
                <div className="summary-row">
                  <span className="summary-key">{t.summaryDepartment}</span>
                  <span className="summary-val">{form.department}</span>
                </div>
              )}
              {form.incidentDate && (
                <div className="summary-row">
                  <span className="summary-key">{t.summaryDate}</span>
                  <span className="summary-val">{form.incidentDate}</span>
                </div>
              )}
              <div className="summary-row">
                <span className="summary-key">{t.summaryFiles}</span>
                <span className="summary-val">{form.files.length > 0 ? `${form.files.length} arxiu${form.files.length > 1 ? 's' : ''}` : '—'}</span>
              </div>
            </div>

            <div className="privacy-row">
              <input
                type="checkbox"
                id="privacy"
                checked={form.privacy}
                onChange={e => { set('privacy', e.target.checked); clearError('privacy'); }}
              />
              <label className="privacy-text" htmlFor="privacy">{t.privacyText}</label>
            </div>
            {errors.privacy && <div className="field-error" style={{ marginBottom: 16 }}>⚠ {errors.privacy}</div>}

            <button
              type="submit"
              className="btn btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>⏳ {t.submitting}</>
              ) : (
                <>🔒 {t.submit}</>
              )}
            </button>
          </>
        )}

        {/* ── Navigation ───────────────────────────────────────── */}
        {step < 4 && (
          <div className="btn-row" style={{ marginTop: 28 }}>
            {step > 1
              ? <button type="button" className="btn btn-ghost" onClick={handleBack}>← {t.back}</button>
              : <span />
            }
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {t.next} →
            </button>
          </div>
        )}
        {step === 4 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button type="button" className="btn-link" onClick={handleBack}>
              ← {t.back}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
