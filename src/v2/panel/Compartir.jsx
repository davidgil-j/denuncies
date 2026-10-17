import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, CircleAlert, Ellipsis, Download, Link2, QrCode, Code, AlignLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import './texts.js'; // textos del panel (lado Gestionar)
import { LANGS, AIPI_URL, Swap, fmt } from '../V2Layout.jsx';
import { copyText } from '../admin/adminKit.jsx';
import { Button, IconButton, Card, Dialog, Menu, MenuItem, Segmented, Skeleton, cx } from '../ui/index.js';
import { CONTACT_EMAIL } from '../site/plans.js';
import { usePanel, Tp } from './kit.jsx';
import { STEPS, MANUAL, hasOnboarding, onboardingState } from './primeros.jsx';
import { paletteOf } from '../lib/brand.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Estilos en línea: el fragmento tiene que funcionar pegado en cualquier web, sin hojas de estilo nuestras. El botón lleva
// el color de la empresa («Tu marca»: el principal de su paleta en claro, con texto blanco, que pasa el contraste en las ocho)
const btnStyle = (color) => `display:inline-flex;align-items:center;padding:12px 18px;border-radius:10px;background:${color};color:#ffffff;font:600 15px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-decoration:none`;

function snippet(kind, url, label, color) {
  const style = kind === 'button' ? ` style="${btnStyle(color)}"` : '';
  // noreferrer: el canal no recibe la dirección de la página desde la que se llega
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${style}>${esc(label)}</a>`;
}

// Las otras formas de ponerlo en la web (la guía): el script que pinta el botón y el canal dentro de un recuadro (iframe)
const scriptSnippet = (origin, slug, lang, color) => `<script src="${esc(origin)}/boton-canal.js" data-canal="${esc(slug)}" data-idioma="${lang}" data-color="${color}" async></script>`;
const iframeSnippet = (url, lang, title) => `<iframe src="${esc(url)}?lang=${lang}" title="${esc(title)}" style="width:100%;height:760px;border:0" loading="lazy" referrerpolicy="no-referrer"></iframe>`;

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

const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const ti = (Icon) => <Icon size={16} strokeWidth={2} aria-hidden="true" />;

/**
 * Compartir el canal, como una lista: la puesta en marcha en una línea (que se despliega) y cuatro filas, cada
 * una con qué es, su vista previa y su acción a la derecha.
 */
export default function Compartir() {
  const { lang, p, org, saveOrg, members, isSuperadmin, channelPath, channelUrl, notify } = usePanel();
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
  const [stepsOpen, setStepsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => { document.title = `${p.nav.share} · ${org?.name ?? ''}`; }, [p, org]);

  const url = channelUrl;
  const shown = url.replace(/^https?:\/\//, '');
  const color = paletteOf(org?.brand_palette).light.accent;
  const code = useMemo(() => snippet(kind, url, translations[snipLang].canal.ethics, color), [kind, url, snipLang, color]);
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
    return <div className="pn-page"><p className="pn-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" /><span>{p.loadErr}</span></p></div>;
  }

  // El generador de PDF se carga solo al pedir el cartel
  async function savePoster() {
    if (posterBusy) return;
    setPosterBusy(true);
    try {
      const { exportChannelPoster } = await import('../lib/exportV2.js');
      await exportChannelPoster({ orgName: org?.name ?? '', url, lang: posterLang, slug: org?.slug ?? '', palette: org?.brand_palette, logo: org?.brand_logo });
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
    responsible: <Button variant="soft" size="sm" to="/admin/ajustes">{o.goSettings}</Button>,
    web: <CopyButton variant="soft" size="sm" lang={lang} text={url} k="copyLink" kOn="linkCopied" />,
    invite: <Button variant="soft" size="sm" to="/admin/ajustes?invitar=1">{o.inviteNow}</Button>,
    poster: <Button variant="soft" size="sm" onClick={savePoster} busy={posterBusy}>{o.getPoster}</Button>,
    aipi: <Button variant="soft" size="sm" to="/admin/ajustes">{o.goSettings}</Button>,
  };

  return (
    <div className="pn-page sh">
      <div className="pn-hello">
        <Tp as="h1" className="ds-h1" lang={lang} pick={x => x.share.title} />
        <Tp as="p" className="pn-lead" lang={lang} pick={x => x.share.lead} />
      </div>

      {hasOnboarding(org) && (
        <section className={cx('sh-steps', stepsOpen && 'is-open')} aria-labelledby="sh-steps-t">
          {!steps ? (
            <div role="status" aria-live="polite"><span className="ds-vh">{p.loading}</span><Skeleton height={20} width={260} /></div>
          ) : (
            <>
              {/* Plegada: cuánto va, la barra y lo siguiente. «Ver los pasos» la despliega */}
              <div className="sh-steps-head">
                <h2 className="sh-steps-t" id="sh-steps-t">{o.title}:</h2>
                <span>{fmt(o.of, { n: steps.count })}</span>
                <div className="sh-progress" role="img" aria-label={fmt(o.ringAria, { n: steps.count })}><i style={{ transform: `translateX(-${100 - (steps.count / STEPS.length) * 100}%)` }} /></div>
                <p className="sh-steps-next">{next ? fmt(o.nextIs, { step: lower(o.steps[next]) }) : o.allDone}</p>
                <button type="button" className="sh-steps-see" aria-expanded={stepsOpen} aria-controls="sh-steps-b" onClick={() => setStepsOpen(v => !v)}>
                  {stepsOpen ? o.hideSteps : o.seeSteps}<ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              {stepsOpen && (
                <div className="sh-steps-body" id="sh-steps-b">
                  <ol className="sh-list">
                    {STEPS.map(step => {
                      const done = steps.done[step];
                      const manual = MANUAL.includes(step);
                      const dot = <span className="sh-dot" aria-hidden="true">{done && <Check size={12} strokeWidth={3} />}</span>;
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
                          {next === 'aipi' && <Button variant="soft" size="sm" href={AIPI_URL} target="_blank" rel="noopener noreferrer" iconEnd={<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />}>{o.howAipi}</Button>}
                          {MANUAL.includes(next) && <Button variant="soft" size="sm" onClick={() => mark(next, true)} busy={marking === next}>{o.done}</Button>}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="sh-next-label">{o.allDone}</span>
                        <p>{o.allDoneText}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <Card className="sh-cards">
        <section className="sh-item" aria-labelledby="sh-link-t">
          <div className="sh-what"><h2 className="pn-sec-t" id="sh-link-t">{ti(Link2)}{s.link}</h2><p>{s.linkText}</p></div>
          <div className="sh-body"><p className="sh-box sh-url">{shown}</p></div>
          <div className="sh-acts">
            <CopyButton variant="report" size="md" lang={lang} text={url} k="copyLink" kOn="linkCopied" />
            <Button variant="soft" size="md" href={channelPath} target="_blank" rel="noopener noreferrer" iconEnd={<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />}>{s.open}</Button>
          </div>
        </section>

        <section className="sh-item sh-poster" aria-labelledby="sh-poster-t">
          <div className="sh-what">
            <h2 className="pn-sec-t" id="sh-poster-t">{ti(QrCode)}{s.poster}</h2>
            {qrErr ? <p className="sh-err" role="alert">{s.qrErr}</p> : <p>{s.posterText}</p>}
          </div>
          <div className="sh-body is-row">
            <div className="sh-qr">
              {qr ? <img src={qr.png} alt={s.qrAlt} width="72" height="72" /> : !qrErr && <Skeleton width={56} height={56} />}
            </div>
            <Segmented tone="plain" label={s.posterLang} value={posterLang} onChange={setPosterLang} options={langOptions} />
          </div>
          <div className="sh-acts">
            <Button variant="soft" size="md" onClick={savePoster} busy={posterBusy} icon={<Download size={16} strokeWidth={1.8} aria-hidden="true" />}>{posterBusy ? s.posterBusy : s.posterGet}</Button>
            <Menu label={s.qrMore} trigger={props => <IconButton variant="soft" size="md" label={s.qrMore} disabled={!qr} {...props}><Ellipsis size={16} strokeWidth={1.8} aria-hidden="true" /></IconButton>}>
              <MenuItem icon={<Download size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => saveQr('png')}>{s.qrPng}</MenuItem>
              <MenuItem icon={<Download size={16} strokeWidth={1.8} aria-hidden="true" />} onClick={() => saveQr('svg')}>{s.qrSvg}</MenuItem>
            </Menu>
          </div>
        </section>

        <section className="sh-item" aria-labelledby="sh-btn-t">
          <div className="sh-what"><h2 className="pn-sec-t" id="sh-btn-t">{ti(Code)}{s.button}</h2><p>{s.buttonText}</p></div>
          <div className="sh-body">
            <div className="sh-row">
              {/* El fragmento lo generamos nosotros y se escapa en snippet(): la vista previa es exactamente lo que se copia */}
              <div className="sh-preview" lang={snipLang} dangerouslySetInnerHTML={{ __html: code }} />
              <Segmented label={s.kind} value={kind} onChange={setKind} options={[{ value: 'button', label: s.kindButton }, { value: 'link', label: s.kindLink }]} />
              <Segmented tone="plain" label={s.lang} value={snipLang} onChange={setSnipLang} options={langOptions} />
            </div>
            <details className="sh-code">
              <summary>{s.seeCode}</summary>
              <pre tabIndex={0}><code>{code}</code></pre>
            </details>
            <button type="button" className="pn-link" onClick={() => setGuide(true)}>{s.guideOpen}</button>
          </div>
          <div className="sh-acts"><CopyButton variant="soft" size="md" lang={lang} text={code} k="copyCode" kOn="codeCopied" /></div>
        </section>

        <section className="sh-item" aria-labelledby="sh-legal-t">
          <div className="sh-what"><h2 className="pn-sec-t" id="sh-legal-t">{ti(AlignLeft)}{s.legal}</h2><p>{s.legalNote}</p></div>
          <div className="sh-body">
            <p className={cx('sh-legal', !legalOpen && 'is-short')} id="sh-legal-p" lang={legalLang}>{legal}</p>
            <div className="sh-row">
              <button type="button" className="pn-link" aria-expanded={legalOpen} aria-controls="sh-legal-p" onClick={() => setLegalOpen(v => !v)}>{legalOpen ? p.seeLess : s.seeText}</button>
              <Segmented tone="plain" label={s.lang} value={legalLang} onChange={setLegalLang} options={langOptions} />
            </div>
          </div>
          <div className="sh-acts"><CopyButton variant="soft" size="md" lang={lang} text={legal} k="copyText" kOn="textCopied" /></div>
        </section>
      </Card>

      <details className="sh-why">
        <summary>{s.whyTitle.replace(/\.$/, '')}</summary>
        <p>{s.whyText}</p>
      </details>

      <Guide open={guide} onClose={() => setGuide(false)} url={url} color={color} lang={lang} snipLang={snipLang} />
    </div>
  );
}

/**
 * Guía para ponerlo en la web, con las cuatro formas (fase 4): el enlace o el botón (lo de esta pantalla), el script que
 * pinta el botón, el canal dentro de una página (iframe) y una dirección propia (la activa Reportia).
 */
function Guide({ open, onClose, url, color, lang, snipLang }) {
  const { p, org } = usePanel();
  const s = p.share;
  const origin = new URL(url).origin;
  const ethics = translations[snipLang].canal.ethics;
  const script = scriptSnippet(origin, org?.slug ?? '', snipLang, color);
  const frame = iframeSnippet(url, snipLang, ethics);
  const mail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(fmt(s.g4Subject, { org: org?.name ?? '' }))}&body=${encodeURIComponent(fmt(s.g4Body, { org: org?.name ?? '' }))}`;
  return (
    <Dialog side open={open} onClose={onClose} title={s.guideT} closeLabel={p.close} className="sh-guide">
      <p>{s.guideLead}</p>
      <ol className="sh-guide-list">
        <li><h3>{s.g1T}</h3><p>{s.g1D}</p></li>
        <li>
          <h3>{s.g2T}</h3><p>{s.g2D}</p>
          <pre tabIndex={0}><code>{script}</code></pre>
          <CopyButton variant="soft" size="sm" lang={lang} text={script} k="copyCode" kOn="codeCopied" />
        </li>
        <li>
          <h3>{s.g3T}</h3><p>{s.g3D}</p>
          <pre tabIndex={0}><code>{frame}</code></pre>
          <CopyButton variant="soft" size="sm" lang={lang} text={frame} k="copyCode" kOn="codeCopied" />
        </li>
        <li>
          <h3>{s.g4T}</h3><p>{s.g4D}</p>
          <Button variant="soft" size="sm" href={mail}>{s.g4Mail}</Button>
        </li>
      </ol>
    </Dialog>
  );
}
