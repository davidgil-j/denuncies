import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY') {
  console.warn('[Supabase] ⚠️  Missing credentials — running in offline/demo mode.');
}

// createClient llança error si la URL és buida; amb un placeholder la UI carrega
// i les crides a la BD simplement fallen (mode offline/demo).
export const supabase = createClient(SUPABASE_URL || 'http://localhost:54321', SUPABASE_ANON || 'offline-demo-key', {
  auth: {
    storage:          typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession:   true,
    autoRefreshToken: true,
  },
});

export { SUPABASE_URL };

// Mode demo: només si no hi ha credencials (mai en producció). Permet treballar la UI sense BD.
const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY';
const DEMO_ORG  = { id: 'demo-org', name: 'Empresa Demo', slug: 'demo' };
// Dades de demostració del panell (denúncies, missatges, registre, usuaris). Import dinàmic:
// només es descarrega en mode demo, mai en producció.
const demo = () => import('./demoStore.js');
const DEMO_SESSION_KEY = 'reportia-demo-session';
const DEMO_USER = { id: 'demo-user', email: 'admin@empresa-demo.es' };
const DEMO_SESSION = { user: DEMO_USER, access_token: 'demo' };
export const IS_DEMO = DEMO_MODE;

// ── Complaints ─────────────────────────────────────────────────────────

/**
 * Save a new complaint to the database.
 * Returns { trackingCode, error }
 */
export async function saveComplaint({ formData, files, organizationId }) {
  const id           = crypto.randomUUID();
  const trackingCode = generateTrackingCode();

  if (DEMO_MODE) {
    // En la demo, la denúncia enviada apareix al panell i es pot consultar amb el seu codi
    (await demo()).addComplaint({ id, trackingCode, formData, files: files ?? [] });
    return { trackingCode, error: null };
  }

  // 1. Insert complaint record (ID generated client-side to avoid SELECT after INSERT)
  const { error: dbError } = await supabase
    .from('complaints')
    .insert({
      id,
      tracking_code:   trackingCode,
      organization_id: organizationId ?? null,
      is_anonymous:    formData.isAnonymous,
      reporter_name:   formData.isAnonymous ? null : formData.name  || null,
      reporter_email:  formData.isAnonymous ? null : formData.email || null,
      reporter_phone:  formData.isAnonymous ? null : formData.phone || null,
      category:        formData.category,
      department:      formData.department  || null,
      description:     formData.description,
      incident_date:   formData.incidentDate || null,
      involved_people: formData.involvedPeople || null,
      language:        formData.language ?? 'ca',
      status:          'received',
      priority:        'normal',
    });

  if (dbError) return { trackingCode: null, error: dbError };

  const complaint = { id };

  // 2. Upload attachments (if any)
  for (const file of files) {
    const ext  = file.name.split('.').pop();
    const path = `${complaint.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(path, file, { upsert: false });

    if (!uploadError) {
      await supabase.from('attachments').insert({
        complaint_id: complaint.id,
        filename:     file.name,
        storage_path: path,
        file_size:    file.size,
        mime_type:    file.type,
      });
    }
  }

  // 3. Write audit log entry
  await supabase.from('audit_logs').insert({
    complaint_id:    complaint.id,
    organization_id: organizationId ?? null,
    action:          'created',
    details:         { channel: 'web', language: formData.language ?? 'ca' },
  });

  return { trackingCode, error: null };
}

/**
 * Fetch complaint status by tracking code.
 * Returns { complaint, error }
 */
export async function getComplaintByCode(trackingCode) {
  if (DEMO_MODE) {
    const found = (await demo()).findByCode(trackingCode);
    if (found) return { complaint: found, error: null };
    return { complaint: {
      id: 'demo-complaint', tracking_code: trackingCode.toUpperCase(), status: 'reviewing', category: 'other',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, error: null };
  }
  const { data, error } = await supabase.rpc('get_complaint_by_tracking_code', {
    p_code: trackingCode.toUpperCase(),
  });
  return { complaint: data?.[0] ?? null, error };
}

export async function getOrganizationBySlug(slug) {
  if (DEMO_MODE) return { organization: { ...DEMO_ORG, slug }, error: null };
  const { data, error } = await supabase.rpc('get_organization_by_slug', { p_slug: slug });
  return { organization: data?.[0] ?? null, error };
}

export async function getMyOrganization() {
  if (DEMO_MODE) return { organization: { ...DEMO_ORG }, error: null };
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .single();
  return { organization: data ?? null, error };
}

/**
 * Fetch all complaints (for admin panel — requires service role or RLS policy).
 */
export async function getAllComplaints({ status, page = 1, limit = 20 } = {}) {
  if (DEMO_MODE) return (await demo()).getAllComplaints({ status, page, limit });
  let query = supabase
    .from('complaints')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  return { data, count, error };
}

/**
 * Fetch messages for a complaint (both reporter and manager messages).
 * Returns { messages, error }
 */
export async function getMessages(complaintId) {
  if (DEMO_MODE) return (await demo()).getMessages(complaintId);
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, content, is_read, created_at')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  return { messages: data ?? [], error };
}

/**
 * Send a message. sender = 'reporter' | 'manager'
 * Returns { error }
 */
export async function sendMessage(complaintId, content, sender = 'reporter') {
  if (DEMO_MODE) return (await demo()).sendMessage(complaintId, content, sender);
  const { error } = await supabase
    .from('messages')
    .insert({ complaint_id: complaintId, sender, content });

  return { error };
}

/**
 * Update complaint status (admin action).
 */
export async function updateComplaintStatus(id, status, adminNote = null, priority = null) {
  if (DEMO_MODE) return (await demo()).updateComplaintStatus(id, status, adminNote, priority);
  const updates = { status, updated_at: new Date().toISOString() };
  if (priority) updates.priority = priority;

  const { error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', id);

  if (!error && adminNote) {
    await supabase.from('audit_logs').insert({
      complaint_id: id,
      action:       `status_changed_to_${status}`,
      details:      { note: adminNote },
    });
  }

  return { error };
}

/**
 * Fetch a single complaint by ID (admin).
 */
export async function getComplaintById(id) {
  if (DEMO_MODE) return (await demo()).getComplaintById(id);
  const { data, error } = await supabase
    .from('complaints')
    .select('*, attachments(*)')
    .eq('id', id)
    .single();

  return { complaint: data, error };
}

// ── Panell v2 ──────────────────────────────────────────────────────────

/**
 * Totes les denúncies que l'usuari pot veure, sense dades del denunciant (només les
 * columnes del llistat). categories = null (superadmin, totes) o la llista permesa.
 * El panell filtra, ordena i calcula els terminis legals a partir d'aquí.
 * Returns { complaints, error }
 */
export async function listComplaints({ categories = null } = {}) {
  if (DEMO_MODE) return (await demo()).listComplaints({ categories });
  if (categories && categories.length === 0) return { complaints: [], error: null };
  let query = supabase
    .from('complaints')
    .select('id, tracking_code, category, status, priority, is_anonymous, department, incident_date, language, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (categories) query = query.in('category', categories);
  const { data, error } = await query;
  return { complaints: data ?? [], error };
}

/** Registre d'activitat d'una denúncia. Returns { logs, error } */
export async function getAuditLogs(complaintId) {
  if (DEMO_MODE) return (await demo()).getAuditLogs(complaintId);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, details, created_at')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  return { logs: data ?? [], error };
}

/**
 * Afegeix una entrada al registre d'activitat (canvi d'estat, de prioritat, resposta…).
 * details: { from, to, note, actor_name, … }. Returns { error }
 */
export async function logComplaintEvent({ complaintId, organizationId = null, action, details = {} }) {
  if (DEMO_MODE) return (await demo()).logComplaintEvent({ complaintId, action, details });
  const { error } = await supabase.from('audit_logs').insert({
    complaint_id: complaintId, organization_id: organizationId, action, details,
  });
  return { error };
}

/**
 * Elimina una denúncia (missatges i adjunts en cascada). Si RLS no ho permet, no s'esborra
 * cap fila i es retorna error. Returns { error }
 */
export async function deleteComplaint(id) {
  if (DEMO_MODE) return (await demo()).deleteComplaint(id);
  const { data, error } = await supabase.from('complaints').delete().eq('id', id).select('id');
  if (error) return { error };
  if (!data?.length) return { error: new Error('not-allowed') };
  return { error: null };
}

/** Enllaç temporal (60 s) per descarregar un adjunt del bucket privat. Returns { url, demo, error } */
export async function getAttachmentUrl(storagePath) {
  if (DEMO_MODE) return { url: null, demo: true, error: null };
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(storagePath, 60);
  return { url: data?.signedUrl ?? null, demo: false, error };
}

// ── Verificació en dos passos (alta i baixa des del panell) ────────────

/** Factors TOTP de l'usuari. Returns { factors, error } */
export async function listMfaFactors() {
  if (DEMO_MODE) return (await demo()).listMfaFactors();
  const { data, error } = await supabase.auth.mfa.listFactors();
  return { factors: data?.totp ?? [], error };
}

/** Inicia l'alta d'un factor TOTP. Returns { factorId, qrCode, secret, error } */
export async function enrollMfaFactor() {
  if (DEMO_MODE) return (await demo()).enrollMfaFactor();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Reportia Canal Ètic' });
  return { factorId: data?.id ?? null, qrCode: data?.totp?.qr_code ?? null, secret: data?.totp?.secret ?? null, error };
}

/** Confirma l'alta amb el primer codi de 6 xifres. Returns { error } */
export async function verifyMfaEnrollment(factorId, code) {
  if (DEMO_MODE) return (await demo()).verifyMfaEnrollment(factorId, code);
  const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chalErr) return { error: chalErr };
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  return { error };
}

/** Dona de baixa un factor TOTP. Returns { error } */
export async function unenrollMfaFactor(factorId) {
  if (DEMO_MODE) return (await demo()).unenrollMfaFactor(factorId);
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error };
}

// ── Auth (admin) ───────────────────────────────────────────────────────

export async function signInAdmin(email, password) {
  if (DEMO_MODE) {
    sessionStorage.setItem(DEMO_SESSION_KEY, '1');
    return { session: DEMO_SESSION, error: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session, error };
}

/**
 * Self-signup for a new organization. Creates the auth.users row with
 * company_name + full_name in raw_user_meta_data; the database trigger
 * (migration 006) provisions the organization + superadmin profile.
 * Returns { user, needsConfirmation, error }.
 */
export async function signUpOrganization({ companyName, fullName, email, password }) {
  if (DEMO_MODE) return { user: { ...DEMO_USER, email }, needsConfirmation: true, error: null };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName, full_name: fullName },
      emailRedirectTo: `${window.location.origin}/admin/login`,
    },
  });

  return {
    user: data?.user ?? null,
    needsConfirmation: !!data?.user && !data?.session,
    error,
  };
}

export async function signOutAdmin() {
  if (DEMO_MODE) { sessionStorage.removeItem(DEMO_SESSION_KEY); return { error: null }; }
  return supabase.auth.signOut();
}

function clearStaleAuthToken() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    sessionStorage.removeItem(`sb-${ref}-auth-token`);
  } catch {
    // ignore
  }
}

export async function getAdminSession() {
  if (DEMO_MODE) return sessionStorage.getItem(DEMO_SESSION_KEY) ? DEMO_SESSION : null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('session-timeout')), 5000)),
    ]);
    return data?.session ?? null;
  } catch {
    // Stale/corrupted session token stuck refreshing — clear it so login works again
    clearStaleAuthToken();
    return null;
  }
}

export async function sendPasswordReset(email) {
  if (DEMO_MODE) return { error: null };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  return { error };
}

export async function updatePassword(newPassword) {
  if (DEMO_MODE) return { error: null };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

/**
 * Escolta els esdeveniments d'autenticació (PASSWORD_RECOVERY, SIGNED_IN…) perquè
 * les pàgines no cridin supabase.auth directament. Retorna la funció per deixar d'escoltar.
 * En mode demo emet PASSWORD_RECOVERY perquè la pàgina de restabliment es pugui revisar.
 */
export function onAuthEvent(callback) {
  if (DEMO_MODE) {
    const id = setTimeout(() => callback('PASSWORD_RECOVERY', null), 0);
    return () => clearTimeout(id);
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

// ── Profiles & permissions ─────────────────────────────────────────────

export async function getProfile(userId) {
  if (DEMO_MODE) return { profile: { id: DEMO_USER.id, full_name: 'Administrador Demo', role: 'superadmin', created_at: '2026-01-15T09:00:00Z' }, error: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile: data, error };
}

export async function getAllProfiles() {
  if (DEMO_MODE) return (await demo()).getAllProfiles();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at')
    .order('created_at', { ascending: true });

  if (error) return { profiles: [], error };

  // Enrich with email from auth (via a join-like approach)
  const { data: users } = await supabase.auth.admin?.listUsers?.() ?? { data: null };

  const profiles = data.map(p => {
    const authUser = users?.users?.find(u => u.id === p.id);
    return { ...p, email: authUser?.email ?? '' };
  });

  return { profiles, error: null };
}

export async function getManagerPermissions(managerId) {
  if (DEMO_MODE) return (await demo()).getManagerPermissions(managerId);
  const { data, error } = await supabase
    .from('manager_permissions')
    .select('*')
    .eq('manager_id', managerId);
  return { permissions: data ?? [], error };
}

export async function setManagerPermissions(managerId, permissionsArray) {
  // permissionsArray: [{ category, can_view, can_edit, can_reply, can_delete }]
  if (DEMO_MODE) return (await demo()).setManagerPermissions(managerId, permissionsArray);
  const rows = permissionsArray.map(p => ({ ...p, manager_id: managerId }));

  // Delete existing and re-insert
  await supabase.from('manager_permissions').delete().eq('manager_id', managerId);

  if (rows.length === 0) return { error: null };

  const { error } = await supabase.from('manager_permissions').insert(rows);
  return { error };
}

export async function inviteManager(email, fullName) {
  // Uses the Edge Function to send invite email securely
  if (DEMO_MODE) return (await demo()).inviteManager(email, fullName);
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-manager`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  const result = await res.json();
  return { userId: result.user?.id, error: result.error ? new Error(result.error) : null };
}

export async function updateProfile(userId, updates) {
  if (DEMO_MODE) return (await demo()).updateProfile(userId, updates);
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  return { error };
}

export async function deleteManager(userId) {
  if (DEMO_MODE) return (await demo()).deleteManager(userId);
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-manager`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });
  const result = await res.json();
  return { error: result.error ? new Error(result.error) : null };
}

// ── Stats ──────────────────────────────────────────────────────────────

/**
 * Global complaint counts (total, open, resolved) for the dashboard stat cards.
 * allowedCategories = null means superadmin (all), [] means no access.
 */
export async function getComplaintStats(allowedCategories = null) {
  const openStatuses     = ['received', 'reviewing', 'investigating', 'waiting'];
  const resolvedStatuses = ['resolved', 'closed'];
  if (DEMO_MODE) return (await demo()).getComplaintStats(allowedCategories);

  if (allowedCategories !== null && allowedCategories.length === 0) {
    return { total: 0, open: 0, resolved: 0 };
  }

  const applyFilter = (q) => {
    if (allowedCategories !== null && allowedCategories.length > 0) {
      q = q.in('category', allowedCategories);
    }
    return q;
  };

  const [{ count: total }, { count: open }, { count: resolved }] = await Promise.all([
    applyFilter(supabase.from('complaints').select('id', { count: 'exact', head: true })),
    applyFilter(supabase.from('complaints').select('id', { count: 'exact', head: true }).in('status', openStatuses)),
    applyFilter(supabase.from('complaints').select('id', { count: 'exact', head: true }).in('status', resolvedStatuses)),
  ]);

  return { total: total ?? 0, open: open ?? 0, resolved: resolved ?? 0 };
}

// ── Helpers ────────────────────────────────────────────────────────────

function generateTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[bytes[i] % chars.length]; // 256 % 32 === 0, no modulo bias
  }
  return code; // e.g. "A3B7-C9X2"
}
