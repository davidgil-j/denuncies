import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import V2Canal from './v2/V2Canal.jsx';
import V2Home from './v2/V2Home.jsx';
import V2Form from './v2/V2Form.jsx';
import V2Track from './v2/V2Track.jsx';
import V2SiteLayout from './v2/site/V2SiteLayout.jsx';
import V2Landing from './v2/site/V2Landing.jsx';
import V2Signup from './v2/site/V2Signup.jsx';
import V2Login from './v2/site/V2Login.jsx';
import V2Forgot from './v2/site/V2Forgot.jsx';
import V2Reset from './v2/site/V2Reset.jsx';
import V2Privacy from './v2/site/V2Privacy.jsx';
import V2Admin from './v2/admin/V2Admin.jsx';
import V2Dashboard from './v2/admin/V2Dashboard.jsx';
import V2Detail from './v2/admin/V2Detail.jsx';
import V2Users from './v2/admin/V2Users.jsx';
import V2Mfa from './v2/admin/V2Mfa.jsx';

// Les adreces són les de sempre: els enllaços de canal ja compartits (/canal/<slug>) i
// les redireccions dels correus de Supabase (/admin/login, /admin/reset-password) continuen funcionant.
// La versió anterior es pot recuperar amb el tag de git "pre-rediseno".
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Canal públic de cada empresa */}
        <Route path="/canal/:slug" element={<V2Canal />}>
          <Route index element={<V2Home />} />
          <Route path="denuncia" element={<V2Form />} />
          <Route path="consulta" element={<V2Track />} />
        </Route>

        {/* Web de Reportia i accés */}
        <Route element={<V2SiteLayout />}>
          <Route path="/" element={<V2Landing />} />
          <Route path="/crear-compte" element={<V2Signup />} />
          <Route path="/admin/login" element={<V2Login />} />
          <Route path="/admin/forgot-password" element={<V2Forgot />} />
          <Route path="/admin/reset-password" element={<V2Reset />} />
          <Route path="/privacitat" element={<V2Privacy />} />
        </Route>

        {/* Panell de gestió */}
        <Route path="/admin" element={<V2Admin />}>
          <Route index element={<V2Dashboard />} />
          <Route path="complaints/:id" element={<V2Detail />} />
          <Route path="users" element={<V2Users />} />
          <Route path="mfa" element={<V2Mfa />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
