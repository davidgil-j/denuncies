import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminSession, getProfile, getManagerPermissions } from '../lib/supabase.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession]         = useState(undefined);
  const [profile, setProfile]         = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  async function loadAuth() {
    const s = await getAdminSession();
    setSession(s);
    if (s) {
      const { profile: p } = await getProfile(s.user.id);
      setProfile(p);
      if (p?.role === 'manager') {
        const { permissions: perms } = await getManagerPermissions(s.user.id);
        setPermissions(perms);
      }
    }
    setLoading(false);
  }

  function refresh() { loadAuth(); }

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
