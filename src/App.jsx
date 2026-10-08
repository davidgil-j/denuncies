import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Canal from './v2/canal/Canal.jsx';
import V2SiteLayout from './v2/site/V2SiteLayout.jsx';
import V2Landing from './v2/site/V2Landing.jsx';

// Cada part es descarrega quan cal: qui entra al canal no baixa el panell ni la web comercial
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
const Ajustes = lazy(() => import('./v2/panel/Ajustes.jsx'));
const Seguridad = lazy(() => import('./v2/panel/Seguridad.jsx'));
// Página de trabajo con las piezas del diseño: solo existe en desarrollo, no entra en el build
const DevUi = import.meta.env.DEV ? lazy(() => import('./v2/dev/DevUi.jsx')) : null;

// Mentre es descarrega una part: un indicador discret i accessible
function Loading() {
  return (
    <div className="v2-center" role="status" aria-live="polite">
      <div className="v2-spinner" />
    </div>
  );
}
const page = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;
// Dins del canal, mentre arriba la pantalla es manté la targeta blava buida (sense indicador que parpellegi)
const canalPage = (el) => <Suspense fallback={<div className="flow" role="status" aria-busy="true" />}>{el}</Suspense>;

// Amb el navegador lliure, es baixen per endavant les parts on és més probable anar des d'on
// s'ha entrat: el canvi de pàgina és immediat. No es fa si la persona ha demanat estalviar dades.
function prefetchNext() {
  if (navigator.connection?.saveData) return;
  const path = window.location.pathname;
  const quiet = (p) => p.catch(() => {});
  if (path.startsWith('/canal/')) {
    quiet(import('./v2/canal/Denuncia.jsx')); quiet(import('./v2/canal/Consulta.jsx')); quiet(import('./v2/canal/Privacidad.jsx'));
  } else if (path.startsWith('/admin') && !/login|forgot-password|reset-password/.test(path)) {
    quiet(import('./v2/panel/Caso.jsx')); quiet(import('./v2/panel/Tablero.jsx')); quiet(import('./v2/panel/Informe.jsx'));
    quiet(import('./v2/panel/Compartir.jsx')); quiet(import('./v2/panel/Ajustes.jsx')); quiet(import('./v2/panel/Seguridad.jsx'));
  } else {
    quiet(import('./v2/site/V2Signup.jsx')); quiet(acceso()); quiet(import('./v2/panel/Panel.jsx'));
  }
}

// Les adreces són les de sempre: els enllaços de canal ja compartits (/canal/<slug>) i
// les redireccions dels correus de Supabase (/admin/login, /admin/reset-password) continuen funcionant.
// La versió anterior es pot recuperar amb el tag de git "pre-rediseno".
export default function App() {
  useEffect(() => {
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(prefetchNext, { timeout: 4000 }) : setTimeout(prefetchNext, 2000);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        {/* Canal públic de cada empresa */}
        <Route path="/canal/:slug" element={<Canal />}>
          {/* La entrada (les dues meitats) la pinta Canal; aquí hi van les pantalles del costat Denunciar */}
          <Route index element={null} />
          <Route path="denuncia" element={canalPage(<Denuncia />)} />
          <Route path="consulta" element={canalPage(<Consulta />)} />
          <Route path="privacidad" element={canalPage(<Privacidad />)} />
          <Route path="*" element={<Navigate to=".." relative="path" replace />} />
        </Route>

        {DevUi && <Route path="/dev/ui" element={page(<DevUi />)} />}

        {/* Web de Reportia i accés */}
        <Route element={<V2SiteLayout />}>
          <Route path="/" element={<V2Landing />} />
          <Route path="/crear-compte" element={page(<V2Signup />)} />
          <Route path="/privacitat" element={page(<V2Privacy />)} />
          <Route path="*" element={page(<V2NotFound />)} />
        </Route>

        {/* Gestionar · accés: la mateixa targeta per entrar, verificar i recuperar la contrasenya */}
        <Route element={page(<AccessLayout />)}>
          <Route path="/admin/login" element={page(<Acceso />)} />
          <Route path="/admin/forgot-password" element={page(<Recuperar />)} />
          <Route path="/admin/reset-password" element={page(<Cambiar />)} />
        </Route>

        {/* Panell de gestió */}
        <Route path="/admin" element={page(<Panel />)}>
          <Route index element={page(<Tablero />)} />
          <Route path="complaints/:id" element={page(<Caso />)} />
          <Route path="nueva" element={page(<Registrar />)} />
          <Route path="report" element={page(<Informe />)} />
          <Route path="integration" element={page(<Compartir />)} />
          <Route path="ajustes" element={page(<Ajustes />)} />
          <Route path="mfa" element={page(<Seguridad />)} />
          {/* Las direcciones de antes (gestores y cuenta) llevan a la página única de ajustes */}
          <Route path="users" element={<Navigate to="/admin/ajustes" replace />} />
          <Route path="account" element={<Navigate to="/admin/ajustes" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
