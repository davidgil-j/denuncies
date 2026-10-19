import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { getOrganizationBySlug } from '../../lib/supabase.js';
import { detectLang, savedLang, LANGS, Stable } from '../V2Layout.jsx';
import { SplitShell, Button, Card, Dialog, Skeleton, Offline } from '../ui/index.js';
import { EntryTop, EntryReport, EntryManage, EntryLegal, EntryLinks } from './Entrada.jsx';
import { EMPTY_DRAFT, isDirty, Tc } from './shared.jsx';
import { useBrandTheme } from '../lib/brand.js';
import { inFrame } from '../lib/frame.js';
import { leaveCanal } from '../lib/domain.js';
import './canal.css';

/**
 * El canal de una empresa (/canal/:slug): la entrada en dos mitades iguales y, al elegir Denunciar, sus
 * pantallas a página completa. Carga la organización una sola vez y guarda aquí el idioma y el borrador
 * de la denuncia. El borrador vive SOLO en memoria: no se escribe nada en
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
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [tries, setTries] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [sent, setSent] = useState(null); // { code, failed, createdAt, secured, asked }
  const [leaving, setLeaving] = useState(false); // se ha pulsado «Acceder» con una denuncia a medias
  const t = translations[lang].canal;
  // La marca de la empresa (su paleta) y el modo claro u oscuro del sistema de quien entra: no se guarda nada
  useBrandTheme(org?.brand_palette, 'system');
  const base = `/canal/${slug}`;
  const sub = pathname.slice(base.length).replace(/^\/+|\/+$/g, '');
  // En el canal de ejemplo «Gestionar» no lleva al acceso real: no hay cuenta detrás, se invita a crear una. En la
  // dirección propia de una empresa (canal.acme.es), el acceso está en la dirección principal
  const loginTo = leaveCanal(org?.is_example ? `/crear-compte?lang=${lang}` : `/admin/login?from=${encodeURIComponent(slug)}&lang=${lang}`);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getOrganizationBySlug(slug).then(({ organization, error }) => {
      if (cancelled) return;
      if (organization) { setOrg(organization); setStatus('ready'); } else setStatus(error ? 'error' : 'notfound');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [slug, tries]);

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
      <Link reloadDocument to={leaveCanal(`/?lang=${lang}`)} {...(inFrame() ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><ArrowLeft size={15} strokeWidth={2.2} aria-hidden="true" /><Stable lang={lang} pick={T => T.v2.exampleBack} /></Link>
      <Tc lang={lang} k="exampleNote" />
    </>
  );

  if (status !== 'ready') {
    // Cargando: la forma de lo que va a salir (las dos mitades en la entrada; la página blanca en el resto)
    if (status === 'loading') {
      return (
        <div className={`ds ds-split canal-loading ${sub === '' ? 'is-entry' : 'is-report'}`} role="status" aria-live="polite">
          <span className="ds-vh">{translations[lang].v2.loading}</span>
          <div className="ds-split-panes" aria-hidden="true">
            <div className="ds-pane is-report"><div className="ds-pane-body"><Skeleton width="50%" height={44} /><Skeleton width="80%" /><Skeleton width="60%" /></div></div>
            {sub === '' && <div className="ds-pane is-manage"><div className="ds-pane-body"><Skeleton width="50%" height={44} /><Skeleton width="80%" /><Skeleton width="60%" /></div></div>}
          </div>
        </div>
      );
    }
    return (
      <div className="ds ds-page canal-plain">
        {status === 'error' ? (
          <Card as="main" className="canal-lost">
            <Tc as="h1" className="ds-h1 is-sm" lang={lang} k="loadErrT" />
            <Tc as="p" className="ds-lead" lang={lang} k="loadErrD" />
            <div className="canal-lost-go">
              <Button variant="report" size="md" onClick={() => setTries(n => n + 1)}><Tc lang={lang} k="retry" /></Button>
            </div>
          </Card>
        ) : (
          // Un canal que no existe no enseña nada más: ni la marca de Reportia ni una invitación a contratar
          <Card as="main" className="canal-lost">
            <Tc as="h1" className="ds-h1 is-sm" lang={lang} k="nfTitle" />
            <Tc as="p" className="ds-lead" lang={lang} k="nfText" />
          </Card>
        )}
      </div>
    );
  }

  const ctx = { lang, setLang, org, base, draft, setDraft, sent, setSent, banner };

  // La política de privacidad no va en las dos mitades: es una página de lectura
  if (sub === 'privacidad') return <Outlet context={ctx} />;

  const isEntry = sub === '';
  // «Acceder» con una denuncia a medias: salir del canal la borra de la memoria, así que se pregunta antes. Dentro de
  // la web de una empresa (iframe) el acceso se abre en una ventana nueva y la denuncia a medias sigue aquí
  function onManage(e) {
    if (!sent && isDirty(draft) && !inFrame()) { e.preventDefault(); setLeaving(true); }
  }

  return (
    <>
      <SplitShell
        active={isEntry ? null : 'report'}
        skip={translations[lang].v2.skip}
        banner={banner}
        reportLabel={t.report} manageLabel={t.manage}
        top={isEntry && <EntryTop lang={lang} setLang={setLang} org={org} />}
        report={isEntry ? <EntryReport lang={lang} base={base} /> : <Outlet context={ctx} />}
        manage={isEntry ? <EntryManage lang={lang} org={org} to={loginTo} example={!!org.is_example} onGo={onManage} /> : null}
        reportFoot={<EntryLegal lang={lang} org={org} />}
        manageFoot={<EntryLinks lang={lang} org={org} base={base} />}
        bottom={!isEntry && <><EntryLegal lang={lang} org={org} /><EntryLinks lang={lang} org={org} base={base} full /></>}
        className={isEntry ? undefined : 'canal-flow'}
      />
      <Offline lang={lang} />
      <Dialog
        open={leaving} onClose={() => setLeaving(false)} title={t.leaveQ}
        actions={<>
          <Button variant="soft" size="md" onClick={() => setLeaving(false)}>{t.leaveStay}</Button>
          <Button variant="report" size="md" onClick={() => { setLeaving(false); navigate(loginTo); }}>{t.leaveGo}</Button>
        </>}
      >
        <p>{t.leaveText}</p>
      </Dialog>
    </>
  );
}
