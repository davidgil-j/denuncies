import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import V2Canal from './v2/V2Canal.jsx';
import V2Home from './v2/V2Home.jsx';
import V2SiteLayout from './v2/site/V2SiteLayout.jsx';
import V2Landing from './v2/site/V2Landing.jsx';

// Cada part es descarrega quan cal: qui entra al canal no baixa el panell ni la web comercial
const V2Form = lazy(() => import('./v2/V2Form.jsx'));
const V2Track = lazy(() => import('./v2/V2Track.jsx'));
const V2Privacy = lazy(() => import('./v2/site/V2Privacy.jsx'));
const V2Signup = lazy(() => import('./v2/site/V2Signup.jsx'));
const V2Login = lazy(() => import('./v2/site/V2Login.jsx'));
const V2Forgot = lazy(() => import('./v2/site/V2Forgot.jsx'));
const V2Reset = lazy(() => import('./v2/site/V2Reset.jsx'));
const V2NotFound = lazy(() => import('./v2/site/V2NotFound.jsx'));
const V2Admin = lazy(() => import('./v2/admin/V2Admin.jsx'));
const V2Dashboard = lazy(() => import('./v2/admin/V2Dashboard.jsx'));
const V2Detail = lazy(() => import('./v2/admin/V2Detail.jsx'));
const V2Users = lazy(() => import('./v2/admin/V2Users.jsx'));
const V2Mfa = lazy(() => import('./v2/admin/V2Mfa.jsx'));
const V2Integrate = lazy(() => import('./v2/admin/V2Integrate.jsx'));
const V2Account = lazy(() => import('./v2/admin/V2Account.jsx'));
const V2Report = lazy(() => import('./v2/admin/V2Report.jsx'));

// Mentre es descarrega una part: un indicador discret i accessible
function Loading() {
  return (
    <div className="v2-center" role="status" aria-live="polite">
      <div className="v2-spinner" />
    </div>
  );
}
const page = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;

// Amb el navegador lliure, es baixen per endavant les parts on és més probable anar des d'on
// s'ha entrat: el canvi de pàgina és immediat. No es fa si la persona ha demanat estalviar dades.
function prefetchNext() {
  if (navigator.connection?.saveData) return;
  const path = window.location.pathname;
  const quiet = (p) => p.catch(() => {});
  if (path.startsWith('/canal/')) {
    quiet(import('./v2/V2Form.jsx')); quiet(import('./v2/V2Track.jsx')); quiet(import('./v2/site/V2Privacy.jsx'));
  } else if (path.startsWith('/admin') && !/login|forgot-password|reset-password/.test(path)) {
    quiet(import('./v2/admin/V2Detail.jsx')); quiet(import('./v2/admin/V2Dashboard.jsx')); quiet(import('./v2/admin/V2Report.jsx'));
    quiet(import('./v2/admin/V2Users.jsx')); quiet(import('./v2/admin/V2Integrate.jsx')); quiet(import('./v2/admin/V2Account.jsx')); quiet(import('./v2/admin/V2Mfa.jsx'));
  } else {
    quiet(import('./v2/site/V2Signup.jsx')); quiet(import('./v2/site/V2Login.jsx')); quiet(import('./v2/admin/V2Admin.jsx'));
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
        <Route path="/canal/:slug" element={<V2Canal />}>
          <Route index element={<V2Home />} />
          <Route path="denuncia" element={page(<V2Form />)} />
          <Route path="consulta" element={page(<V2Track />)} />
          <Route path="privacidad" element={page(<V2Privacy />)} />
          <Route path="*" element={<Navigate to=".." relative="path" replace />} />
        </Route>

        {/* Web de Reportia i accés */}
        <Route element={<V2SiteLayout />}>
          <Route path="/" element={<V2Landing />} />
          <Route path="/crear-compte" element={page(<V2Signup />)} />
          <Route path="/admin/login" element={page(<V2Login />)} />
          <Route path="/admin/forgot-password" element={page(<V2Forgot />)} />
          <Route path="/admin/reset-password" element={page(<V2Reset />)} />
          <Route path="/privacitat" element={page(<V2Privacy />)} />
          <Route path="*" element={page(<V2NotFound />)} />
        </Route>

        {/* Panell de gestió */}
        <Route path="/admin" element={page(<V2Admin />)}>
          <Route index element={page(<V2Dashboard />)} />
          <Route path="complaints/:id" element={page(<V2Detail />)} />
          <Route path="report" element={page(<V2Report />)} />
          <Route path="users" element={page(<V2Users />)} />
          <Route path="integration" element={page(<V2Integrate />)} />
          <Route path="account" element={page(<V2Account />)} />
          <Route path="mfa" element={page(<V2Mfa />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
