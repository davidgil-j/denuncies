import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getProfile, getManagerPermissions } from '../lib/supabase.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession]         = useState(undefined);
  const [profile, setProfile]         = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setLoading(false);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setPermissions([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    setLoading(true);
    const { profile: p } = await getProfile(userId);
    setProfile(p);
    if (p?.role === 'manager') {
      const { permissions: perms } = await getManagerPermissions(userId);
      setPermissions(perms);
    } else {
      setPermissions([]);
    }
    setLoading(false);
  }

  function refresh() { if (session) loadProfile(session.user.id); }

  const isSuperadmin = profile?.role === 'superadmin';

  // Check if manager can perform action on a category
  function can(action, category) {
    if (isSuperadmin) return true;
    const perm = permissions.find(p => p.category === category);
    if (!perm) return false;
    return perm[`can_${action}`] === true;
  }

  // Categories the manager can view
  const allowedCategories = isSuperadmin
    ? null // null = all
    : permissions.filter(p => p.can_view).map(p => p.category);

  return (
    <AdminAuthContext.Provider value={{
      session, profile, permissions, loading,
      isSuperadmin, can, allowedCategories, refresh,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
