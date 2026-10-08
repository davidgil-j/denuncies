import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { getOrganizationBySlug } from '../../lib/supabase.js';
import { detectLang, savedLang, LANGS, Stable } from '../V2Layout.jsx';
import { SplitShell, SideTab, Button, Card, Dialog, Skeleton } from '../ui/index.js';
import { EntryTop, EntryReport, EntryManage, EntryBottom } from './Entrada.jsx';
import { EMPTY_DRAFT, isDirty, Tc } from './shared.jsx';
import './canal.css';

/**
 * El canal de una empresa (/canal/:slug): las dos mitades. Carga la organización una sola vez y guarda
 * aquí el idioma y el borrador de la denuncia. El borrador vive SOLO en memoria: no se escribe nada en
 * el navegador (en un ordenador de la empresa sería un riesgo para el anonimato) y se pierde al recargar.
 */
export default function Canal() {
  const { slug } = useParams();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlLang = params.get('lang');
  // El idioma vive en la dirección (?lang=): sobrevive a recargar y no deja rastro en el navegador
  const [lang, setLang] = useState(() => (LANGS.includes(urlLang) ? urlLang : savedLang() ?? detectLang()));
  const [org, setOrg] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [sent, setSent] = useState(null); // { code, failed, createdAt, secured, asked }
  const [leaving, setLeaving] = useState(null); // 'draft' | 'code': se ha pulsado «Gestionar» con algo a medias
  const t = translations[lang].canal;
  const base = `/canal/${slug}`;
  const sub = pathname.slice(base.length).replace(/^\/+|\/+$/g, '');
  // En el canal de ejemplo «Gestionar» no lleva al acceso real: no hay cuenta detrás, se invita a crear una
  const loginTo = org?.is_example ? `/crear-compte?lang=${lang}` : `/admin/login?from=${encodeURIComponent(slug)}&lang=${lang}`;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getOrganizationBySlug(slug).then(({ organization }) => {
      if (cancelled) return;
      if (organization) { setOrg(organization); setStatus('ready'); } else setStatus('notfound');
    });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { if (status === 'notfound') document.title = translations[lang].v2.notFoundDoc; }, [status, lang]);

  // Cada pantalla empieza arriba, con el foco en el contenido (los lectores de pantalla lo anuncian)
  const firstPath = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstPath.current) { firstPath.current = false; return; }
    document.getElementById('ds-main')?.focus({ preventScroll: true });
  }, [pathname]);

  // Mantiene ?lang= en la dirección al cambiar de idioma o de pantalla (sustituyendo, sin añadir entradas)
  useEffect(() => {
    if (urlLang === lang) return;
    const next = new URLSearchParams(location.search);
    next.set('lang', lang);
    navigate({ pathname, search: `?${next}`, hash: location.hash }, { replace: true, state: location.state });
  }, [lang, urlLang, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const banner = org?.is_example && status === 'ready' && (
    <>
      <Link to={`/?lang=${lang}`}><ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" /><Stable lang={lang} pick={T => T.v2.exampleBack} /></Link>
      <Tc lang={lang} k="exampleNote" />
    </>
  );

  if (status !== 'ready') {
    return (
      <div className="ds ds-page canal-plain">
        {status === 'loading' ? (
          <div className="canal-loading" role="status" aria-live="polite">
            <span className="ds-vh">{translations[lang].v2.loading}</span>
            <Card radius="xl" tone="report" aria-hidden="true"><Skeleton width="55%" height={56} /><Skeleton width="80%" /></Card>
            <Card radius="xl" aria-hidden="true"><Skeleton width="55%" height={56} /><Skeleton width="80%" /></Card>
          </div>
        ) : (
          <Card as="main" radius="xl" className="canal-lost">
            <Tc as="h1" className="ds-h1 is-sm" lang={lang} k="nfTitle" />
            <Tc as="p" className="ds-lead" lang={lang} k="nfText" />
            <div className="canal-lost-go">
              <Button variant="ink" size="md" to={`/?lang=${lang}`}><Tc lang={lang} k="nfHome" /></Button>
              <Tc as="p" lang={lang} pick={c => <>{c.nfCompany} <Link to={`/crear-compte?lang=${lang}`}>{c.nfCreate}</Link></>} />
            </div>
          </Card>
        )}
      </div>
    );
  }

  const ctx = { lang, setLang, org, base, draft, setDraft, sent, setSent, banner };

  // La política de privacidad no va en las dos mitades: es una página de lectura
  if (sub === 'privacidad') return <Outlet context={ctx} />;

  const isEntry = sub === '';
  // «Gestionar» desde la denuncia: si hay algo escrito o un código sin guardar, se pregunta antes
  function onManage(e) {
    if (!sent && isDirty(draft)) { e.preventDefault(); setLeaving('draft'); }
    else if (sent && !sent.secured && !sent.asked) { e.preventDefault(); setSent(s => ({ ...s, asked: true })); setLeaving('code'); }
  }
  const leaveText = leaving === 'code' ? ['savedQ', 'savedText', 'savedBack', 'savedGo'] : ['leaveQ', 'leaveText', 'leaveStay', 'leaveGo'];

  return (
    <>
      <SplitShell
        active={isEntry ? null : 'report'}
        skip={translations[lang].v2.skip}
        banner={banner}
        reportLabel={t.report} manageLabel={t.manage}
        top={isEntry && <EntryTop lang={lang} setLang={setLang} org={org} />}
        bottom={isEntry && <EntryBottom lang={lang} org={org} base={base} />}
        report={isEntry ? <EntryReport lang={lang} base={base} /> : <Outlet context={ctx} />}
        manage={isEntry ? <EntryManage lang={lang} org={org} to={loginTo} example={!!org.is_example} /> : null}
        manageTab={<SideTab side="manage" label={<Tc lang={lang} k="manage" />} icon="forward" to={loginTo} onClick={onManage} />}
      />
      <Dialog
        open={!!leaving} onClose={() => setLeaving(null)} title={t[leaveText[0]]}
        actions={<>
          <Button variant="soft" size="md" onClick={() => setLeaving(null)}>{t[leaveText[2]]}</Button>
          <Button variant="ink" size="md" onClick={() => { setLeaving(null); navigate(loginTo); }}>{t[leaveText[3]]}</Button>
        </>}
      >
        <p>{t[leaveText[1]]}</p>
      </Dialog>
    </>
  );
}
