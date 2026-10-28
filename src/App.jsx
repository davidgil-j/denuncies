import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { loadCanal, loadSite } from './entries.js';
import { inFrame } from './v2/lib/frame.js';
import { isOwnHost, onMainSite } from './v2/lib/domain.js';

// Cada parte se descarga cuando hace falta: quien entra al canal no baja el panel ni la web comercial, y quien entra a
// la web no baja el canal ni la librería de la base de datos. main.jsx empieza a bajar la de la página de entrada.
const Canal = lazy(loadCanal);
const V2SiteLayout = lazy(loadSite);
const Denuncia = lazy(() => import('./v2/canal/Denuncia.jsx'));
const Consulta = lazy(() => import('./v2/canal/Consulta.jsx'));
const Privacidad = lazy(() => import('./v2/canal/Privacidad.jsx'));
const V2Privacy = lazy(() => import('./v2/site/V2Privacy.jsx'));
const V2Signup = lazy(() => import('./v2/site/V2Signup.jsx'));
const V2NotFound = lazy(() => import('./v2/site/V2NotFound.jsx'));
// Lado «Gestionar»: acceso, armazón del panel, tablero, ficha del caso, registro, informe, compartir y ajustes
const acceso = () => import('./v2/panel/Acceso.jsx');
const AccessLayout = lazy(() => acceso().then(m => ({ default: m.AccessLayout })));
const contrasena = () => import('./v2/panel/Contrasena.jsx');
const Recuperar = lazy(() => contrasena().then(m => ({ default: m.Recuperar })));
const Cambiar = lazy(() => contrasena().then(m => ({ default: m.Cambiar })));
const Acceso = lazy(acceso);
const Panel = lazy(() => import('./v2/panel/Panel.jsx'));
const Tablero = lazy(() => import('./v2/panel/Tablero.jsx'));
const Caso = lazy(() => import('./v2/panel/Caso.jsx'));
const Registrar = lazy(() => import('./v2/panel/Registrar.jsx'));
const Informe = lazy(() => import('./v2/panel/Informe.jsx'));
const Compartir = lazy(() => import('./v2/panel/Compartir.jsx'));
const Accesos = lazy(() => import('./v2/panel/Accesos.jsx'));
const Ajustes = lazy(() => import('./v2/panel/Ajustes.jsx'));
const Seguridad = lazy(() => import('./v2/panel/Seguridad.jsx'));
// Si algo que no es el canal acaba dentro de un recuadro de otra web (iframe), solo se ve un aviso con un enlace
const Framed = lazy(() => import('./v2/ui/Framed.jsx'));
// Página de trabajo con las piezas del diseño: solo existe en desarrollo, no entra en el build
const DevUi = import.meta.env.DEV ? lazy(() => import('./v2/dev/DevUi.jsx')) : null;

/**
 * Solo el canal se puede poner dentro de la web de una empresa (vercel.json lo cierra para lo demás al cargar la página).
 * Esto cubre lo que se abre ya dentro del recuadro sin recargar: el panel, el acceso y la web de Reportia no se pintan.
 */
function NotFramed() {
  if (inFrame()) return page(<Framed />);
  return isOwnHost() ? <Outlet /> : <OwnDomain />;
}

/**
 * En la dirección propia de una empresa (canal.acme.es) solo vive su canal: la raíz lleva a él y lo demás (el panel, el
 * acceso y la web de Reportia) se abre en la dirección principal. Si la dirección no es de ninguna empresa, la web de siempre.
 */
function OwnDomain() {
  const { pathname, search } = useLocation();
  const [slug, setSlug] = useState(undefined); // undefined: aún no se sabe · null: de nadie
  const root = pathname === '/';
  useEffect(() => {
    if (!root) { window.location.replace(onMainSite(`${pathname}${search}`)); return undefined; }
    let alive = true;
    // La librería de la base de datos solo se baja aquí: la web de Reportia no la necesita
    import('./lib/supabase.js').then(m => m.getSlugByDomain(window.location.hostname)).then(s => { if (alive) setSlug(s); }).catch(() => { if (alive) setSlug(null); });
    return () => { alive = false; };
  }, [root, pathname, search]);
  if (root && slug) return <Navigate to={`/canal/${slug}${search}`} replace />;
  if (root && slug === null) return <Outlet />;
  return <div className="ds-page" aria-busy="true" />;
}

// La ruta con la que se abrió la aplicación (antes de cualquier navegación dentro de ella)
const BOOT_PATH = window.location.pathname;

/**
 * La portada no es parte de la aplicación: es una página estática por idioma (src/v2/landing, generada al compilar) y
 * en «/» la sirve Vercel (vercel.json). Si se llega aquí navegando dentro de la aplicación, se recarga la página. Si la
 * aplicación se abrió ya en «/» (un servidor sin las reglas de vercel.json), se va directamente a la página del idioma.
 * En la dirección propia de una empresa que no es de nadie, a la portada de la dirección principal.
 */
function ToLanding() {
  const { search, hash } = useLocation();
  useEffect(() => {
    if (!isOwnHost()) { window.location.replace(onMainSite(`/${search}${hash}`)); return; }
    if (BOOT_PATH !== '/') { window.location.replace(`/${search}${hash}`); return; }
    // El idioma, como en vercel.json: el de ?lang= o el del navegador (castellano si no es catalán ni inglés)
    const q = new URLSearchParams(search).get('lang');
    const nav = (navigator.language || '').toLowerCase();
    const lang = ['ca', 'es', 'en'].includes(q) ? q : nav.startsWith('ca') ? 'ca' : nav.startsWith('en') ? 'en' : 'es';
    window.location.replace(`/inicio-${lang}.html${hash}`);
  }, [search, hash]);
  return <div className="ds-page" aria-busy="true" />;
}

/** /canal/:slug/denuncia (la dirección de antes) → /canal/:slug/formulario, con el idioma */
function ToForm() {
  const { search } = useLocation();
  return <Navigate to={`../formulario${search}`} replace />;
}

// Cualquier dirección desconocida dentro de un canal (por larga que sea) vuelve a la entrada de ese canal
function ToChannel() {
  const { slug } = useParams();
  return <Navigate to={`/canal/${slug}`} replace />;
}

// Mientras se descarga una parte: un indicador discreto y accesible
function Loading() {
  return (
    <div className="v2-center" role="status" aria-live="polite">
      <div className="v2-spinner" />
    </div>
  );
}
const page = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;
// Dentro del canal, mientras llega la pantalla se mantiene la tarjeta azul vacía (sin indicador que parpadee)
const canalPage = (el) => <Suspense fallback={<div className="flow" role="status" aria-busy="true" />}>{el}</Suspense>;

// Con el navegador libre, se bajan por adelantado las partes a las que es más probable ir desde donde
// se ha entrado: el cambio de página es inmediato. No se hace si la persona ha pedido ahorrar datos.
function prefetchNext() {
  if (navigator.connection?.saveData) return;
  const path = window.location.pathname;
  const quiet = (p) => p.catch(() => {});
  if (path.startsWith('/canal/')) {
    quiet(import('./v2/canal/Denuncia.jsx')); quiet(import('./v2/canal/Consulta.jsx')); quiet(import('./v2/canal/Privacidad.jsx'));
  } else if (path.startsWith('/admin') && !/login|forgot-password|reset-password/.test(path)) {
    quiet(import('./v2/panel/Caso.jsx')); quiet(import('./v2/panel/Tablero.jsx')); quiet(import('./v2/panel/Informe.jsx'));
    quiet(import('./v2/panel/Compartir.jsx')); quiet(import('./v2/panel/Ajustes.jsx')); quiet(import('./v2/panel/Seguridad.jsx'));
    quiet(import('./v2/panel/Accesos.jsx'));
  } else {
    // Desde la web, el alta y el acceso (al panel casi nadie va desde aquí)
    quiet(import('./v2/site/V2Signup.jsx')); quiet(acceso());
  }
}

// Las direcciones son las de siempre: los enlaces de canal ya compartidos (/canal/<slug>) y
// las redirecciones de los correos de Supabase (/admin/login, /admin/reset-password) siguen funcionando.
// La versión anterior se puede recuperar con el tag de git "pre-rediseno".
export default function App() {
  // Espera a que la página haya cargado del todo (y el navegador esté libre): así no quita ancho de banda a lo que hace
  // falta para pintar la primera pantalla
  useEffect(() => {
    let id = null;
    const idle = () => { id = 'requestIdleCallback' in window ? window.requestIdleCallback(prefetchNext, { timeout: 4000 }) : setTimeout(prefetchNext, 2000); };
    if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
    return () => {
      window.removeEventListener('load', idle);
      if (id != null) ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : clearTimeout(id));
    };
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        {/* Canal público de cada empresa */}
        <Route path="/canal/:slug" element={<Suspense fallback={<div className="ds-page" aria-busy="true" />}><Canal /></Suspense>}>
          {/* La entrada (las dos mitades) la pinta Canal; aquí van las pantallas del lado Denunciar */}
          <Route index element={null} />
          {/* Dirección neutra: el historial del navegador no dice «denuncia». La antigua redirige aquí */}
          <Route path="formulario" element={canalPage(<Denuncia />)} />
          <Route path="denuncia" element={<ToForm />} />
          <Route path="consulta" element={canalPage(<Consulta />)} />
          <Route path="privacidad" element={canalPage(<Privacidad />)} />
          <Route path="*" element={<ToChannel />} />
        </Route>

        {DevUi && <Route path="/dev/ui" element={page(<DevUi />)} />}

        {/* Todo lo que no es el canal: nunca dentro de otra web */}
        <Route element={<NotFramed />}>
          <Route path="/" element={<ToLanding />} />
          {/* Web de Reportia y acceso */}
          <Route element={page(<V2SiteLayout />)}>
            <Route path="/crear-compte" element={page(<V2Signup />)} />
            <Route path="/privacitat" element={page(<V2Privacy />)} />
            <Route path="*" element={page(<V2NotFound />)} />
          </Route>

          {/* Gestionar · acceso: la misma tarjeta para entrar, verificar y recuperar la contraseña */}
          <Route element={page(<AccessLayout />)}>
            <Route path="/admin/login" element={page(<Acceso />)} />
            <Route path="/admin/forgot-password" element={page(<Recuperar />)} />
            <Route path="/admin/reset-password" element={page(<Cambiar />)} />
          </Route>

          {/* Panel de gestión */}
          <Route path="/admin" element={page(<Panel />)}>
            <Route index element={page(<Tablero />)} />
            <Route path="complaints/:id" element={page(<Caso />)} />
            <Route path="nueva" element={page(<Registrar />)} />
            <Route path="report" element={page(<Informe />)} />
            <Route path="integration" element={page(<Compartir />)} />
            <Route path="access" element={page(<Accesos />)} />
            <Route path="ajustes" element={page(<Ajustes />)} />
            <Route path="mfa" element={page(<Seguridad />)} />
            {/* Las direcciones de antes (gestores y cuenta) llevan a la página única de ajustes */}
            <Route path="users" element={<Navigate to="/admin/ajustes" replace />} />
            <Route path="account" element={<Navigate to="/admin/ajustes" replace />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
