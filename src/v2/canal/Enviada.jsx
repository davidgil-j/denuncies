import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Copy, Download, Printer, ListChecks, TriangleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import { fmt, Swap } from '../V2Layout.jsx';
import { Button, Dialog } from '../ui/index.js';
import { uploadAttachments } from '../../lib/supabase.js';
import { CanalHead, Tc, ic, ackDue, respDue, dayMonth, dateTime } from './shared.jsx';
import { paletteOf, rgbOf } from '../lib/brand.js';

// Subidas ya empezadas (una sola vez por envío, aunque la pantalla se vuelva a montar)
const started = new WeakSet();

/** Enviada: el código secreto lo primero, cómo guardarlo y, en tres líneas, qué pasa ahora, con las fechas reales */
export default function Enviada() {
  const { lang, setLang, org, base, sent, setSent } = useOutletContext();
  const navigate = useNavigate();
  const t = translations[lang].canal;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(null); // a dónde se iba cuando se preguntó por el código
  const codeRef = useRef(null);
  const headRef = useRef(null);
  const { code, failed, createdAt, secured, uploads, uploaded } = sent;
  const uploading = !!uploads;
  const secure = () => setSent(s => (s ? { ...s, secured: true } : s));

  useEffect(() => { headRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { document.title = `${t.docSent} · ${t.ethics} · ${org.name}`; }, [t, org]);

  // Las pruebas se suben aquí, con el código ya a la vista: si se corta, la denuncia y su código ya están
  useEffect(() => {
    if (!uploads || started.has(uploads)) return;
    started.add(uploads);
    const update = (patch) => setSent(s => (s ? { ...s, ...patch } : s));
    uploadAttachments({ complaintId: sent.complaintId, files: uploads, isAnonymous: sent.anonymous, onProgress: n => update({ uploaded: n }) })
      .then(({ failedFiles }) => update({ uploads: null, failed: failedFiles.length }))
      .catch(() => update({ uploads: null, failed: uploads.length }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads]);

  // Hasta que copia, descarga o imprime el código (y mientras se suben las pruebas), cerrar o recargar la pestaña pide confirmación
  useEffect(() => {
    if (secured && !uploading) return undefined;
    const onBefore = (e) => { if (window.__v2Exiting) return; e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [secured, uploading]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Sin acceso al portapapeles: se deja el código seleccionado
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
    }
    setCopied(true);
    secure();
    setTimeout(() => setCopied(false), 2000);
  }

  const dates = { ack: dayMonth(ackDue(createdAt), lang), resp: dayMonth(respDue(createdAt), lang) };

  // El PDF se genera en el navegador y solo se carga al pedirlo
  async function receipt() {
    if (busy) return;
    setBusy(true);
    try {
      const { downloadReceipt } = await import('../lib/receipt.js');
      await downloadReceipt({
        code, title: t.rcTitle, url: `${window.location.origin}${base}/consulta`,
        rows: [[t.rcCode, code], [t.rcSent, dateTime(createdAt, lang)], [t.rcUrl, `${window.location.origin}${base}/consulta`]],
        nextTitle: t.nextT,
        next: [[t.n1, fmt(t.byDate, { date: dates.ack })], [t.n2, t.n2d], [t.n3, fmt(t.byDate, { date: dates.resp })]],
        notes: [t.rcKeep, t.noRetaliation],
        color: rgbOf(paletteOf(org.brand_palette).light.accent),
      });
      secure();
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }

  function print() { secure(); window.print(); }

  // Salir de esta pantalla borra el código de la memoria. Si no lo ha guardado, se pregunta una vez.
  function go(to) {
    if (!secured && !sent.asked) { setSent(s => ({ ...s, asked: true })); setAsk(to); return; }
    leave(to);
  }
  function leave(to) {
    setSent(null);
    if (to === 'case') navigate(`${base}/consulta`, { replace: true, state: { code } });
    else navigate(base, { replace: true });
  }

  return (
    <div className="flow">
      <CanalHead lang={lang} setLang={setLang} org={org} />
      <div className="flow-body is-narrow">
        <div className="flow-q">
          <Tc as="h1" className="ds-h1" lang={lang} k="sentTitle" ref={headRef} tabIndex={-1} />
          <Tc as="p" className="ds-lead" lang={lang} k="sentLead" />
        </div>
        <div className="code-card" id="print-area">
          <Tc lang={lang} k="yourCode" className="code-label" />
          <span className="code-big" ref={codeRef} aria-hidden="true">{code}</span>
          <span className="ds-vh">{code.split('').join(' ')}</span>
          <div className="code-actions">
            {/* «Copiar» es el único botón principal de la pantalla */}
            <Button variant="report" size="md" onClick={copy} icon={ic(Copy, 16)}><Swap lang={lang} on={copied} pick={T => T.canal.copy} pickOn={T => T.canal.copied} /></Button>
            <Button variant="soft" size="md" onClick={receipt} busy={busy} icon={ic(Download, 16)}><Tc lang={lang} k="receipt" /></Button>
            <Button variant="soft" size="md" onClick={print} icon={ic(Printer, 16)}><Tc lang={lang} k="print" /></Button>
          </div>
          <p className="print-only">{t.rcKeep} {t.n1}: {fmt(t.byDate, { date: dates.ack })}. {t.n3}: {fmt(t.byDate, { date: dates.resp })}.</p>
        </div>
        {uploading && <p className="flow-status" role="status">{fmt(t.filesUploading, { n: uploaded ?? 0, total: uploads.length })}</p>}
        {failed > 0 && (
          <p className="flow-error" role="alert">{ic(TriangleAlert, 18)}{failed === 1 ? t.filesFailed1 : fmt(t.filesFailedN, { n: failed })}</p>
        )}

        <section className="sent-next" aria-labelledby="sent-next-t">
          <div className="flow-sec-head">{ic(ListChecks, 17)}<Tc as="h2" lang={lang} k="nextT" id="sent-next-t" /></div>
          <ol>
            {[['n1', c => fmt(c.byDate, { date: dates.ack })], ['n2', c => c.n2d], ['n3', c => fmt(c.byDate, { date: dates.resp })]].map(([k, detail], i) => (
              <li key={k}>
                <span className="sent-n" aria-hidden="true">{i + 1}.</span>
                <Tc lang={lang} inner="sent-next-v" pick={c => <><span className="sent-next-b">{c[k]}</span><span className="sent-next-d">{detail(c)}</span></>} />
              </li>
            ))}
          </ol>
          <Tc as="p" lang={lang} k="noRetaliation" className="sent-law" />
        </section>

        <div className="flow-actions sent-actions">
          <Button variant="soft" size="lg" onClick={() => go('home')}><Tc lang={lang} k="finish" /></Button>
          <Button variant="soft" size="lg" className="flow-next" onClick={() => go('case')} iconEnd={ic(ArrowRight, 18)}><Tc lang={lang} k="seeCase" /></Button>
        </div>
      </div>

      <Dialog
        open={!!ask} onClose={() => setAsk(null)} title={t.savedQ}
        actions={<>
          <Button variant="soft" size="md" onClick={() => setAsk(null)}>{t.savedBack}</Button>
          <Button variant="report" size="md" onClick={() => leave(ask)}>{t.savedGo}</Button>
        </>}
      >
        <p>{t.savedText}</p>
      </Dialog>
    </div>
  );
}
