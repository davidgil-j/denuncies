import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowUpRight, Check, CircleAlert, Ellipsis, Download, FileText, Link2, ShieldCheck } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS, AIPI_URL, Swap, fmt } from '../V2Layout.jsx';
import { copyText } from '../admin/adminKit.jsx';
import { Button, IconButton, Card, Menu, MenuItem, Segmented, Skeleton } from '../ui/index.js';
import { usePanel, Tp } from './kit.jsx';
import { STEPS, MANUAL, hasOnboarding, onboardingState } from './primeros.jsx';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Estilos en línea: el fragmento tiene que funcionar pegado en cualquier web, sin hojas de estilo nuestras
const BTN_STYLE = "display:inline-flex;align-items:center;padding:12px 18px;border-radius:999px;background:#2F54EB;color:#ffffff;font:700 15px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-decoration:none";

function snippet(kind, url, label) {
  const style = kind === 'button' ? ` style="${BTN_STYLE}"` : '';
  // noreferrer: el canal no recibe la dirección de la página desde la que se llega
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${style}>${esc(label)}</a>`;
}

function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Botón que copia y lo dice («Copiar enlace» → «Enlace copiado») sin cambiar de tamaño */
function CopyButton({ lang, text, k, kOn, onCopied, ...rest }) {
  const [done, setDone] = useState(false);
  async function copy() {
    if (!(await copyText(text))) return;
    setDone(true);
    onCopied?.();
    setTimeout(() => setDone(false), 2000);
  }
  return <Button onClick={copy} {...rest}><Swap lang={lang} on={done} pick={T => T.panel.share[k]} pickOn={T => T.panel.share[kOn]} /></Button>;
}

const langOptions = LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }));

/** Compartir el canal: los primeros pasos y las cuatro piezas para que la plantilla lo encuentre */
export default function Compartir() {
  const { lang, p, org, saveOrg, members, isSuperadmin, channelPath, notify } = usePanel();
  const s = p.share;
  const o = p.onb;
  const [kind, setKind] = useState('button');
  // Cada pieza tiene su idioma: el botón, el cartel y el texto legal pueden ir en lenguas distintas
  const [snipLang, setSnipLang] = useState(lang);
  const [posterLang, setPosterLang] = useState(lang);
  const [legalLang, setLegalLang] = useState(lang);
  const [qr, setQr] = useState(null); // { png, svg }
  const [qrErr, setQrErr] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [marking, setMarking] = useState('');

  useEffect(() => { document.title = `${p.nav.share} · ${org?.name ?? ''}`; }, [p, org]);

  const url = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`;
  const shown = url.replace(/^https?:\/\//, '');
  const code = useMemo(() => snippet(kind, url, translations[snipLang].canal.ethics), [kind, url, snipLang]);
  const legal = fmt(translations[legalLang].v2admin.iLegalBody, { org: org?.name ?? '', url });

  useEffect(() => {
    if (!channelPath) return undefined;
    let alive = true;
    setQr(null);
    setQrErr(false);
    import('qrcode')
      .then(async ({ default: QRCode }) => {
        const opts = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0D1530', light: '#ffffff' } };
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(url, { ...opts, width: 1024 }),
          QRCode.toString(url, { ...opts, type: 'svg' }),
        ]);
        if (alive) setQr({ png, svg });
      })
      .catch(() => { if (alive) setQrErr(true); });
    return () => { alive = false; };
  }, [url, channelPath]);

  // «Compartir el canal» es cosa de quien administra
  if (!isSuperadmin) return <Navigate to="/admin" replace />;
  if (!channelPath) {
    return <div className="pn-page"><div className="pn-error" role="alert"><CircleAlert size={20} strokeWidth={2.2} aria-hidden="true" /><span>{p.loadErr}</span></div></div>;
  }

  // El generador de PDF se carga solo al pedir el cartel
  async function savePoster() {
    if (posterBusy) return;
    setPosterBusy(true);
    try {
      const { exportChannelPoster } = await import('../lib/exportV2.js');
      await exportChannelPoster({ orgName: org?.name ?? '', url, lang: posterLang, slug: org?.slug ?? '' });
      notify(s.posterOk);
    } catch {
      notify(s.posterErr, 'err');
    }
    setPosterBusy(false);
  }

  const fileBase = `${s.qrFile}-${org?.slug ?? 'demo'}`;
  function saveQr(type) {
    if (type === 'png') download(qr.png, `${fileBase}.png`);
    else {
      const href = URL.createObjectURL(new Blob([qr.svg], { type: 'image/svg+xml' }));
      download(href, `${fileBase}.svg`);
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
    notify(s.qrSaved);
  }

  // Los pasos que se marcan a mano se guardan en la empresa: los ve igual cualquier persona que administre
  async function mark(step, value) {
    if (marking) return;
    setMarking(step);
    const { error } = await saveOrg({ onboarding: { ...(org.onboarding ?? {}), [step]: value } });
    setMarking('');
    if (error) notify(o.saveErr, 'err');
  }

  const steps = onboardingState(org, members);
  const next = steps?.next;
  const nextAction = {
    responsible: <Button variant="white" size="sm" to="/admin/ajustes">{o.goSettings}</Button>,
    web: <CopyButton variant="white" size="sm" lang={lang} text={url} k="copyLink" kOn="linkCopied" />,
    invite: <Button variant="white" size="sm" to="/admin/ajustes?invitar=1">{o.inviteNow}</Button>,
    poster: <Button variant="white" size="sm" onClick={savePoster} busy={posterBusy}>{o.getPoster}</Button>,
    aipi: <Button variant="white" size="sm" to="/admin/ajustes">{o.goSettings}</Button>,
  };

  return (
    <div className="pn-page sh">
      <div className="pn-hello">
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.share.title} />
        <Tp as="p" className="pn-lead" lang={lang} pick={x => x.share.lead} />
      </div>

      <div className="sh-grid">
        {hasOnboarding(org) && (
          <Card as="section" tone="ink" className="sh-steps" aria-labelledby="sh-steps-t">
            {!steps ? (
              <div role="status" aria-live="polite"><span className="ds-vh">{p.loading}</span><Skeleton height={260} className="sh-steps-skel" /></div>
            ) : (
              <>
                <div className="sh-steps-head">
                  <h2 className="ds-card-title" id="sh-steps-t">{o.title}</h2>
                  <span>{fmt(o.of, { n: steps.count })}</span>
                </div>
                <div className="sh-progress" role="img" aria-label={fmt(o.ringAria, { n: steps.count })}><i style={{ transform: `translateX(-${100 - (steps.count / STEPS.length) * 100}%)` }} /></div>
                <ol className="sh-list">
                  {STEPS.map(step => {
                    const done = steps.done[step];
                    const manual = MANUAL.includes(step);
                    const dot = <span className="sh-dot" aria-hidden="true">{done && <Check size={12} strokeWidth={3.5} />}</span>;
                    return (
                      <li key={step} className={done ? 'is-done' : undefined}>
                        {manual ? (
                          <button
                            type="button" className="sh-step" aria-pressed={done} disabled={!!marking}
                            title={fmt(done ? o.undo : o.mark, { step: o.steps[step] })} onClick={() => mark(step, !done)}
                          >
                            {dot}<span>{o.steps[step]}</span>
                          </button>
                        ) : (
                          <span className="sh-step">{dot}<span>{o.steps[step]}<span className="ds-vh">: {done ? o.stDone : o.stTodo}</span></span></span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <div className="sh-next" aria-live="polite">
                  {next ? (
                    <>
                      <span className="sh-next-label">{o.next}</span>
                      <p>{o.nextText[next]}</p>
                      <div className="sh-next-btns">
                        {nextAction[next]}
                        {next === 'aipi' && <Button variant="glass" size="sm" href={AIPI_URL} target="_blank" rel="noopener noreferrer" iconEnd={<ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />}>{o.howAipi}</Button>}
                        {MANUAL.includes(next) && <Button variant="glass" size="sm" onClick={() => mark(next, true)} busy={marking === next}>{o.done}</Button>}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="sh-next-label">{o.allDone}</span>
                      <p>{o.allDoneText}</p>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        <div className="sh-cards">
          <Card as="section" tone="bg" aria-labelledby="sh-link-t">
            <div className="sh-card-head">
              <span className="sh-ico" aria-hidden="true"><Link2 size={18} strokeWidth={2} /></span>
              <h2 className="ds-card-title" id="sh-link-t">{s.link}</h2>
            </div>
            <p className="sh-box sh-url">{shown}</p>
            <div className="sh-row is-end">
              <CopyButton variant="ink" size="sm" className="sh-grow" lang={lang} text={url} k="copyLink" kOn="linkCopied" />
              <Button variant="white" size="sm" href={channelPath} target="_blank" rel="noopener noreferrer" iconEnd={<ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />}>{s.open}</Button>
            </div>
          </Card>

          <Card as="section" tone="bg" className="sh-poster" aria-labelledby="sh-poster-t">
            <div className="sh-qr">
              {qr ? <img src={qr.png} alt={s.qrAlt} width="120" height="120" /> : !qrErr && <Skeleton width={92} height={92} />}
            </div>
            <div className="sh-poster-main">
              <h2 className="ds-card-title" id="sh-poster-t">{s.poster}</h2>
              {qrErr ? <p className="sh-err" role="alert">{s.qrErr}</p> : <p className="sh-text">{s.posterText}</p>}
              <Segmented tone="white" label={s.posterLang} value={posterLang} onChange={setPosterLang} options={langOptions} />
              <div className="sh-row is-end">
                <Button variant="white" size="sm" onClick={savePoster} busy={posterBusy} icon={<FileText size={16} strokeWidth={2.2} aria-hidden="true" />}>{posterBusy ? s.posterBusy : s.posterGet}</Button>
                <Menu label={s.qrMore} trigger={props => <IconButton variant="white" label={s.qrMore} disabled={!qr} {...props}><Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" /></IconButton>}>
                  <MenuItem icon={<Download size={16} aria-hidden="true" />} onClick={() => saveQr('png')}>{s.qrPng}</MenuItem>
                  <MenuItem icon={<Download size={16} aria-hidden="true" />} onClick={() => saveQr('svg')}>{s.qrSvg}</MenuItem>
                </Menu>
              </div>
            </div>
          </Card>

          <Card as="section" tone="bg" aria-labelledby="sh-btn-t">
            <h2 className="ds-card-title" id="sh-btn-t">{s.button}</h2>
            {/* El fragmento lo generamos nosotros y se escapa en snippet(): la vista previa es exactamente lo que se copia */}
            <div className="sh-box sh-preview" lang={snipLang} dangerouslySetInnerHTML={{ __html: code }} />
            <div className="sh-row">
              <Segmented tone="white" label={s.kind} value={kind} onChange={setKind} options={[{ value: 'button', label: s.kindButton }, { value: 'link', label: s.kindLink }]} />
              <Segmented tone="white" label={s.lang} value={snipLang} onChange={setSnipLang} options={langOptions} />
            </div>
            <details className="sh-code">
              <summary>{s.seeCode}</summary>
              <pre tabIndex={0}><code>{code}</code></pre>
            </details>
            <CopyButton variant="white" size="sm" className="sh-end" lang={lang} text={code} k="copyCode" kOn="codeCopied" />
          </Card>

          <Card as="section" tone="bg" aria-labelledby="sh-legal-t">
            <h2 className="ds-card-title" id="sh-legal-t">{s.legal}</h2>
            <p className="sh-box sh-legal" lang={legalLang}>{legal}</p>
            <Segmented tone="white" label={s.lang} value={legalLang} onChange={setLegalLang} options={langOptions} />
            <p className="sh-note">{s.legalNote}</p>
            <CopyButton variant="white" size="sm" className="sh-end" lang={lang} text={legal} k="copyText" kOn="textCopied" />
          </Card>
        </div>
      </div>

      <p className="sh-why"><ShieldCheck size={20} strokeWidth={2} aria-hidden="true" /><span><b>{s.whyTitle}</b> {s.whyText}</span></p>
    </div>
  );
}
