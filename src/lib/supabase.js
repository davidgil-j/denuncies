import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY') {
  console.warn('[Supabase] ⚠️  Missing credentials — running in offline/demo mode.');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON ?? '');

export { SUPABASE_URL };

// ── Complaints ─────────────────────────────────────────────────────────

/**
 * Save a new complaint to the database.
 * Returns { trackingCode, error }
 */
export async function saveComplaint({ formData, files }) {
  const trackingCode = generateTrackingCode();

  // 1. Insert complaint record
  const { data: complaint, error: dbError } = await supabase
    .from('complaints')
    .insert({
      tracking_code:   trackingCode,
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
    })
    .select()
    .single();

  if (dbError) return { trackingCode: null, error: dbError };

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
    complaint_id: complaint.id,
    action:       'created',
    details:      { channel: 'web', language: formData.language ?? 'ca' },
  });

  return { trackingCode, error: null };
}

/**
 * Fetch complaint status by tracking code.
 * Returns { complaint, error }
 */
export async function getComplaintByCode(trackingCode) {
  const { data, error } = await supabase
    .from('complaints')
    .select('id, tracking_code, status, category, created_at, updated_at')
    .eq('tracking_code', trackingCode.toUpperCase())
    .single();

  return { complaint: data, error };
}

/**
 * Fetch all complaints (for admin panel — requires service role or RLS policy).
 */
export async function getAllComplaints({ status, page = 1, limit = 20 } = {}) {
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
  const { error } = await supabase
    .from('messages')
    .insert({ complaint_id: complaintId, sender, content });

  return { error };
}

/**
 * Update complaint status (admin action).
 */
export async function updateComplaintStatus(id, status, adminNote = null, priority = null) {
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
  const { data, error } = await supabase
    .from('complaints')
    .select('*, attachments(*)')
    .eq('id', id)
    .single();

  return { complaint: data, error };
}

// ── Auth (admin) ───────────────────────────────────────────────────────

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session, error };
}

export async function signOutAdmin() {
  return supabase.auth.signOut();
}

export async function getAdminSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  return { error };
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

// ── Profiles & permissions ─────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile: data, error };
}

export async function getAllProfiles() {
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
  const { data, error } = await supabase
    .from('manager_permissions')
    .select('*')
    .eq('manager_id', managerId);
  return { permissions: data ?? [], error };
}

export async function setManagerPermissions(managerId, permissionsArray) {
  // permissionsArray: [{ category, can_view, can_edit, can_reply, can_delete }]
  const rows = permissionsArray.map(p => ({ ...p, manager_id: managerId }));

  // Delete existing and re-insert
  await supabase.from('manager_permissions').delete().eq('manager_id', managerId);

  if (rows.length === 0) return { error: null };

  const { error } = await supabase.from('manager_permissions').insert(rows);
  return { error };
}

export async function inviteManager(email, fullName) {
  // Uses the Edge Function to send invite email securely
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
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  return { error };
}

// ── Helpers ────────────────────────────────────────────────────────────

function generateTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // e.g. "A3B7-C9X2"
}
