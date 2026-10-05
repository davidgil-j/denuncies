import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, Check, Download, FileText, Info, ShieldCheck, CircleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import { ICON, LANGS, fmt } from '../V2Layout.jsx';
import { useAdmin, L, SwapL, Select, Empty, copyText } from './adminKit.jsx';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Estils en línia: el fragment ha de funcionar enganxat a qualsevol web, sense fulls d'estil nostres
const BTN_STYLE = "display:inline-flex;align-items:center;padding:12px 18px;border-radius:8px;background:#0F2242;color:#ffffff;font:600 15px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-decoration:none";

function snippet(kind, url, label) {
  const style = kind === 'button' ? ` style="${BTN_STYLE}"` : '';
  // noreferrer: el canal no rep l'adreça de la pàgina des d'on s'hi arriba
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

function CopyBtn({ text, k }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="v2-mini-btn"
      onClick={async () => { if (await copyText(text)) { setDone(true); setTimeout(() => setDone(false), 2000); } }}
    >
      {done ? <Check {...ICON} /> : <Copy {...ICON} />}<SwapL on={done} k={k} kOn="copied" />
    </button>
  );
}

/** Integració del canal a la web de l'empresa: enllaç, botó, codi QR i text per a la pàgina d'inici */
export default function V2Integrate() {
  const { t, lang, org, channelPath, notify } = useAdmin();
  const [kind, setKind] = useState('button');
  // Cada peça té el seu idioma: el botó, el cartell i el text legal poden anar en llengües diferents
  const [snipLang, setSnipLang] = useState(lang);
  const [posterLang, setPosterLang] = useState(lang);
  const [legalLang, setLegalLang] = useState(lang);
  const [qr, setQr] = useState(null); // { png, svg }
  const [qrErr, setQrErr] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);

  useEffect(() => { document.title = `${t.iTitle} · ${t.panelName}`; }, [t]);

  const url = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`;
  const st = translations[snipLang].v2admin;
  const code = useMemo(() => snippet(kind, url, st.iSnipLabel), [kind, url, st]);
  const legal = fmt(translations[legalLang].v2admin.iLegalBody, { org: org?.name ?? '', url });

  useEffect(() => {
    let alive = true;
    setQr(null);
    setQrErr(false);
    import('qrcode')
      .then(async ({ default: QRCode }) => {
        const opts = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0A1830', light: '#ffffff' } };
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(url, { ...opts, width: 1024 }),
          QRCode.toString(url, { ...opts, type: 'svg' }),
        ]);
        if (alive) setQr({ png, svg });
      })
      .catch(() => { if (alive) setQrErr(true); });
    return () => { alive = false; };
  }, [url]);

  // El generador de PDF es carrega només en demanar el cartell
  async function savePoster() {
    if (posterBusy) return;
    setPosterBusy(true);
    try {
      const { exportChannelPoster } = await import('../lib/exportV2.js');
      await exportChannelPoster({ orgName: org?.name ?? '', url, lang: posterLang, slug: org?.slug ?? '' });
      notify(t.iPosterOk);
    } catch {
      notify(t.iPosterErr, 'err');
    }
    setPosterBusy(false);
  }

  const fileBase = `${t.iQrFile}-${org?.slug ?? 'demo'}`;
  function saveSvg() {
    const href = URL.createObjectURL(new Blob([qr.svg], { type: 'image/svg+xml' }));
    download(href, `${fileBase}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    notify(t.iQrSaved);
  }

  if (!channelPath) {
    return (
      <div className="v2-page v2-narrow">
        <Empty icon={CircleAlert} title={t.loadErrTitle}>{t.loadErrText}</Empty>
      </div>
    );
  }

  return (
    <div className="v2-page v2-narrow">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <L as="h1" className="v2-ph-title" k="iTitle" />
          <L as="p" className="v2-ph-lead" k="iLead" />
        </div>
      </header>

      <section className="v2-sec" aria-labelledby="v2-int-url">
        <L as="h2" className="v2-sec-h" id="v2-int-url" k="iUrlTitle" />
        <L as="p" className="v2-sec-lead" k="iUrlText" />
        <div className="v2-int-row">
          <code className="v2-int-url">{url.replace(/^https?:\/\//, '')}</code>
          <CopyBtn text={url} k="iCopyUrl" />
          <a className="v2-mini-btn" href={channelPath} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight {...ICON} /><L k="iOpen" />
          </a>
        </div>
      </section>

      <section className="v2-sec" aria-labelledby="v2-int-web">
        <L as="h2" className="v2-sec-h" id="v2-int-web" k="iWebTitle" />
        <L as="p" className="v2-sec-lead" k="iWebText" />
        <div className="v2-int-controls">
          <Select
            label={t.iKind}
            value={kind}
            onChange={setKind}
            options={[{ value: 'button', label: t.iKindButton }, { value: 'link', label: t.iKindLink }]}
          />
          <Select
            label={t.iSnipLang}
            value={snipLang}
            onChange={setSnipLang}
            options={LANGS.map(l => ({ value: l, label: t.langs[l] }))}
          />
        </div>
        <L as="p" className="v2-int-cap" k="iPreview" />
        {/* El fragment el generem nosaltres i s'escapa a snippet(); així la previsualització és exactament el que es copia */}
        <div className="v2-int-preview" lang={snipLang} dangerouslySetInnerHTML={{ __html: code }} />
        <div className="v2-int-caprow">
          <L as="p" className="v2-int-cap" k="iCode" />
          <CopyBtn text={code} k="iCopyCode" />
        </div>
        <pre className="v2-snip" tabIndex={0}><code>{code}</code></pre>
      </section>

      <section className="v2-sec" aria-labelledby="v2-int-qr">
        <L as="h2" className="v2-sec-h" id="v2-int-qr" k="iQrTitle" />
        <L as="p" className="v2-sec-lead" k="iQrText" />
        <div className="v2-qr-row">
          <div className="v2-qr">
            {qr ? <img src={qr.png} alt={t.iQrAlt} width="168" height="168" /> : <span className="v2-skel v2-int-qrskel" aria-hidden="true" />}
          </div>
          <div className="v2-qr-key">
            {qrErr ? <L as="p" className="v2-err" role="alert" k="iQrErr" /> : <L as="p" k="iQrHint" />}
            <div className="v2-int-row">
              <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" disabled={!qr} onClick={() => { download(qr.png, `${fileBase}.png`); notify(t.iQrSaved); }}>
                <Download {...ICON} /><L k="iQrPng" />
              </button>
              <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" disabled={!qr} onClick={saveSvg}>
                <Download {...ICON} /><L k="iQrSvg" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="v2-sec" aria-labelledby="v2-int-poster">
        <L as="h2" className="v2-sec-h" id="v2-int-poster" k="iPosterTitle" />
        <L as="p" className="v2-sec-lead" k="iPosterText" />
        <div className="v2-int-controls is-end">
          <Select
            label={t.iSnipLang}
            value={posterLang}
            onChange={setPosterLang}
            options={LANGS.map(l => ({ value: l, label: t.langs[l] }))}
          />
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={savePoster} aria-busy={posterBusy}>
            <FileText {...ICON} /><L k={posterBusy ? 'iPosterBusy' : 'iPosterBtn'} />
          </button>
        </div>
      </section>

      <section className="v2-sec" aria-labelledby="v2-int-legal">
        <L as="h2" className="v2-sec-h" id="v2-int-legal" k="iLegalTitle" />
        <L as="p" className="v2-sec-lead" k="iLegalText" />
        <div className="v2-int-controls is-end">
          <Select
            label={t.iSnipLang}
            value={legalLang}
            onChange={setLegalLang}
            options={LANGS.map(l => ({ value: l, label: t.langs[l] }))}
          />
          <CopyBtn text={legal} k="iCopyText" />
        </div>
        <p className="v2-int-legal" lang={legalLang}>{legal}</p>
        <p className="v2-sec-empty"><Info {...ICON} /><L k="iLegalNote" /></p>
      </section>

      <div className="v2-note is-quiet">
        <ShieldCheck {...ICON} />
        <L as="p" pick={x => <><strong>{x.iWhyTitle}</strong> {x.iWhyText}</>} />
      </div>
    </div>
  );
}
