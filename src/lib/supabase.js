import { createClient } from '@supabase/supabase-js';
import { stripImageMetadata } from './cleanImage.js';

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
// Mode demo: sense credencials, i només en desenvolupament o si es demana explícitament
// (VITE_DEMO=1, per ensenyar la web). Un build de producció mal configurat no accepta denúncies falses.
const NO_CREDENTIALS = !SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY';
const DEMO_MODE = NO_CREDENTIALS && (import.meta.env.DEV || import.meta.env.VITE_DEMO === '1');
const DEMO_ORG  = { id: 'demo-org', name: 'Empresa Demo', slug: 'demo' };
// Dades de demostració del panell (denúncies, missatges, registre, usuaris). Import dinàmic:
// només es descarrega en mode demo, mai en producció.
const demo = () => import('./demoStore.js');
const DEMO_SESSION_KEY = 'reportia-demo-session';
const DEMO_USER = { id: 'demo-user', email: 'admin@empresa-demo.es' };
const DEMO_SESSION = { user: DEMO_USER, access_token: 'demo' };
export const IS_DEMO = DEMO_MODE;

// El canal d'exemple (/canal/demo) funciona sempre, també a la web publicada: viu en dades de mostra
// dins del navegador (demoStore) i mai no arriba a la base de dades real. Només afecta les funcions
// públiques del canal (enviar, consultar i missatges de qui informa); el panell no hi entra.
let exampleChannel = false;
const channelDemo = () => DEMO_MODE || exampleChannel;

// ── Complaints ─────────────────────────────────────────────────────────

/**
 * Save a new complaint to the database.
 * Returns { trackingCode, error }
 */
export async function saveComplaint({ formData, files, organizationId }) {
  const id           = crypto.randomUUID();
  const trackingCode = generateTrackingCode();
  // En una denúncia anònima, les fotos s'envien sense dades ocultes (ubicació, dispositiu, data)
  if (formData.isAnonymous && files?.length) files = await Promise.all([...files].map(stripImageMetadata));

  if (channelDemo()) {
    // En la demo, la denúncia enviada apareix al panell i es pot consultar amb el seu codi
    (await demo()).addComplaint({ id, trackingCode, formData, files: files ?? [] });
    return { trackingCode, error: null };
  }

  // 1. Insert complaint record (ID generated client-side to avoid SELECT after INSERT).
  // El codi de seguiment no surt mai del navegador: només se n'envia el hash (migració 010).
  const { error: dbError } = await supabase
    .from('complaints')
    .insert({
      id,
      tracking_hash:   await codeHash(trackingCode),
      organization_id: organizationId ?? null,
      is_anonymous:    formData.isAnonymous,
      reporter_name:   formData.isAnonymous ? null : clean(formData.name),
      reporter_email:  formData.isAnonymous ? null : clean(formData.email),
      reporter_phone:  formData.isAnonymous ? null : clean(formData.phone),
      category:        formData.category,
      department:      clean(formData.department),
      description:     formData.description.trim(),
      incident_date:   formData.incidentDate || null,
      involved_people: clean(formData.involvedPeople),
      language:        formData.language ?? 'ca',
      status:          'received',
      priority:        'normal',
    });

  if (dbError) return { trackingCode: null, error: dbError };

  const complaint = { id };

  // 2. Upload attachments (if any). La ruta del bucket no porta el nom original: Storage rebutja
  // accents i caràcters especials, i el nom pot identificar qui denuncia. El nom es desa a la taula.
  const failedFiles = [];
  for (const [i, file] of (files ?? []).entries()) {
    const ext  = (file.name.includes('.') ? file.name.split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const path = `${complaint.id}/${i + 1}-${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

    const { error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });

    if (uploadError) { failedFiles.push(file.name); continue; }

    const { error: rowError } = await supabase.from('attachments').insert({
      complaint_id: complaint.id,
      // En una denúncia anònima el nom original no es desa: pot identificar qui denuncia
      filename:     formData.isAnonymous ? neutralName(file.name, i) : file.name,
      storage_path: path,
      file_size:    file.size,
      mime_type:    file.type,
    });
    if (rowError) failedFiles.push(file.name);
  }

  // 3. Write audit log entry
  await supabase.from('audit_logs').insert({
    complaint_id:    complaint.id,
    organization_id: organizationId ?? null,
    action:          'created',
    details:         { channel: 'web', language: formData.language ?? 'ca' },
  });

  return { trackingCode, failedFiles, error: null };
}

const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

/** Nom neutre per a un adjunt d'una denúncia anònima: "document-1.pdf" */
export function neutralName(name, i) {
  const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return `document-${i + 1}${ext ? `.${ext}` : ''}`;
}

/** Hash del codi de seguiment, igual que code_hash() de la base de dades (SHA-256 en hexadecimal) */
async function codeHash(code) {
  const norm = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch complaint status by tracking code.
 * Returns { complaint, error }
 */
export async function getComplaintByCode(trackingCode) {
  if (channelDemo()) {
    // Un codi que no existeix es tracta igual que en producció: no hi ha cap denúncia
    return { complaint: (await demo()).findByCode(trackingCode) ?? null, error: null };
  }
  // La funció retorna estat, categoria i dates; mai l'id intern ni l'organització
  const { data, error } = await supabase.rpc('get_complaint_by_tracking_code', {
    p_code: trackingCode.toUpperCase(),
  });
  return { complaint: data?.[0] ?? null, error };
}

export async function getOrganizationBySlug(slug) {
  // A la demo només existeix el canal "demo": qualsevol altra adreça es comporta com en producció
  exampleChannel = slug === DEMO_ORG.slug;
  if (channelDemo()) return { organization: exampleChannel ? { ...DEMO_ORG, name: (await demo()).getOrganization().name, is_example: true } : null, error: null };
  const { data, error } = await supabase.rpc('get_organization_by_slug', { p_slug: slug });
  return { organization: data?.[0] ?? null, error };
}

/**
 * Organització de l'usuari autenticat. Amb la migració 009 inclou el pla (plan, trial_ends_at,
 * paid_until), la persona responsable del sistema i les dades de facturació.
 */
export async function getMyOrganization() {
  if (DEMO_MODE) return { organization: (await demo()).getOrganization(), error: null };
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .single();
  return { organization: data ?? null, error };
}

// Camps que l'administrador pot editar des del panell. El pla, les dates i l'adreça del canal
// només els canvia Reportia (i la base de dades ho impedeix: migració 009).
const ORG_EDITABLE = ['name', 'responsible_name', 'responsible_role', 'billing_name', 'billing_tax_id', 'billing_email'];

/** Desa les dades de l'organització pròpia. Returns { organization, error } */
export async function updateMyOrganization(organizationId, updates) {
  const clean = Object.fromEntries(
    Object.entries(updates)
      .filter(([k]) => ORG_EDITABLE.includes(k))
      .map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || (k === 'name' ? '' : null)) : v]),
  );
  if (DEMO_MODE) return (await demo()).updateOrganization(clean);
  const { data, error } = await supabase.from('organizations').update(clean).eq('id', organizationId).select('*');
  if (error) return { organization: null, error };
  if (!data?.length) return { organization: null, error: new Error('not-allowed') };
  return { organization: data[0], error: null };
}

// Columnes de la denúncia que el panell pot llegir (migració 011). No hi ha la identitat de qui
// informa: només es consulta amb getReporterIdentity, i cada consulta queda al registre d'activitat
const COMPLAINT_COLUMNS = [
  'id', 'reference', 'organization_id', 'is_anonymous', 'category', 'department', 'description', 'incident_date',
  'involved_people', 'status', 'priority', 'language', 'created_at', 'updated_at',
  'acknowledged_at', 'answered_at', 'extended_until', 'extension_reason', 'anonymized_at',
  'channel', 'meeting_requested', 'meeting_held_at', 'outcome', 'investigation_started_at', 'fiscal_referral_at',
].join(', ');

/**
 * Fetch all complaints (for admin panel — requires service role or RLS policy).
 */
export async function getAllComplaints({ status, page = 1, limit = 20 } = {}) {
  if (DEMO_MODE) return (await demo()).getAllComplaints({ status, page, limit });
  let query = supabase
    .from('complaints')
    .select(COMPLAINT_COLUMNS, { count: 'exact' })
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
export async function sendMessage(complaintId, content, sender = 'reporter', actorName = '') {
  if (DEMO_MODE) return (await demo()).sendMessage(complaintId, content, sender, actorName);
  const { error } = await supabase
    .from('messages')
    .insert({ complaint_id: complaintId, sender, content });

  return { error };
}

/**
 * Portal de seguiment: missatges d'una denúncia a partir del codi (sense sessió).
 * Passa per una funció de la base de dades; la taula de missatges no és llegible sense sessió.
 * Returns { messages, error }
 */
export async function getReporterMessages(trackingCode) {
  if (channelDemo()) return (await demo()).getMessagesByCode(trackingCode);
  const { data, error } = await supabase.rpc('get_messages_by_tracking_code', { p_code: trackingCode });
  return { messages: data ?? [], error };
}

/** Portal de seguiment: qui denuncia envia un missatge amb el seu codi. Returns { error } */
export async function sendReporterMessage(trackingCode, content) {
  if (channelDemo()) return (await demo()).sendReporterMessage(trackingCode, content);
  const { error } = await supabase.rpc('send_reporter_message', { p_code: trackingCode, p_content: content });
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

// ── Gestió d'una denúncia (migració 010) ──────────────────────────────
// El registre d'activitat dels canvis d'estat, prioritat i missatges l'escriu la base de dades.

/**
 * Canvia estat i/o prioritat. Si RLS no ho permet no s'actualitza cap fila: es retorna error
 * (abans es mostrava "Canvis desats" sense haver desat res).
 */
export async function updateComplaint(id, { status, priority }, actorName = '') {
  if (DEMO_MODE) return (await demo()).updateComplaint(id, { status, priority }, actorName);
  const patch = {};
  if (status) patch.status = status;
  if (priority) patch.priority = priority;
  const { data, error } = await supabase.from('complaints').update(patch).eq('id', id).select('id, status, priority, acknowledged_at, answered_at, updated_at');
  if (error) return { complaint: null, error };
  if (!data?.length) return { complaint: null, error: new Error('not-allowed') };
  return { complaint: data[0], error: null };
}

/** Nota interna al registre (no la veu qui denuncia). Returns { error } */
export async function addComplaintNote(complaintId, note, actorName = '') {
  if (DEMO_MODE) return (await demo()).addNote(complaintId, note, actorName);
  const { error } = await supabase.from('audit_logs').insert({ complaint_id: complaintId, action: 'note_added', details: { note } });
  return { error };
}

/** Marca com a llegits els missatges de qui denuncia */
export async function markMessagesRead(complaintId) {
  if (DEMO_MODE) return (await demo()).markRead(complaintId);
  const { error } = await supabase.from('messages').update({ is_read: true })
    .eq('complaint_id', complaintId).eq('sender', 'reporter').eq('is_read', false);
  return { error };
}

/** Amplia el termini de resposta fins a 6 mesos des de la recepció (art. 9.2 d). Returns { until, error } */
export async function extendDeadline(complaintId, reason, actorName = '') {
  if (DEMO_MODE) return (await demo()).extendDeadline(complaintId, reason, actorName);
  const { data, error } = await supabase.rpc('extend_response_deadline', { p_complaint: complaintId, p_reason: reason });
  return { until: data ?? null, error };
}

/**
 * Suprimeix les dades d'una denúncia (art. 32): primer els arxius del bucket, després el contingut.
 * La fila es conserva anonimitzada al llibre registre. Returns { error }
 */
export async function anonymizeComplaint(complaintId, reason, actorName = '') {
  if (DEMO_MODE) return (await demo()).anonymize(complaintId, reason, actorName);
  const { data: files } = await supabase.from('attachments').select('storage_path').eq('complaint_id', complaintId);
  const paths = (files ?? []).map(f => f.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: rmError } = await supabase.storage.from('attachments').remove(paths);
    if (rmError) return { error: rmError };
  }
  const { error } = await supabase.rpc('anonymize_complaint', { p_complaint: complaintId, p_reason: reason });
  return { error };
}

/** Denúncies que s'han de suprimir (3 mesos sense investigació, o 10 anys). Només administrador. */
export async function getRetentionDue() {
  if (DEMO_MODE) return (await demo()).retentionDue();
  const { data, error } = await supabase.rpc('retention_due');
  return { items: data ?? [], error };
}

/**
 * Fetch a single complaint by ID (admin).
 */
export async function getComplaintById(id) {
  if (DEMO_MODE) return (await demo()).getComplaintById(id);
  const { data, error } = await supabase
    .from('complaints')
    .select(`${COMPLAINT_COLUMNS}, attachments(*)`)
    .eq('id', id)
    .single();

  return { complaint: data, error };
}

/**
 * Identitat de qui informa, en una denúncia identificada. La base de dades comprova el permís i
 * anota la consulta al registre d'activitat. Returns { identity: { reporter_name, reporter_email, reporter_phone } | null, error }
 */
export async function getReporterIdentity(complaintId) {
  if (DEMO_MODE) return (await demo()).getReporterIdentity(complaintId);
  const { data, error } = await supabase.rpc('get_reporter_identity', { p_complaint: complaintId });
  return { identity: error ? null : (data?.[0] ?? null), error };
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
  const cols = 'id, reference, category, status, priority, is_anonymous, department, incident_date, language, created_at, updated_at, acknowledged_at, answered_at, extended_until, anonymized_at';
  // Es llegeix per pàgines: sense límit de 1.000 files
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from('complaints').select(cols).order('created_at', { ascending: false }).range(from, from + 999);
    if (categories) query = query.in('category', categories);
    const { data, error } = await query;
    if (error) return { complaints: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // Missatges de qui denuncia encara no llegits, per marcar-los al llistat
  const { data: unread } = await supabase.from('messages').select('complaint_id').eq('sender', 'reporter').eq('is_read', false);
  const counts = (unread ?? []).reduce((m, r) => m.set(r.complaint_id, (m.get(r.complaint_id) ?? 0) + 1), new Map());
  return { complaints: rows.map(c => ({ ...c, unread: counts.get(c.id) ?? 0 })), error: null };
}

/** Registre d'activitat d'una denúncia. Returns { logs, error } */
export async function getAuditLogs(complaintId) {
  if (DEMO_MODE) return (await demo()).getAuditLogs(complaintId);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, details, created_at, actor_id, actor:profiles(full_name)')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  // L'autor surt del perfil (actor_id el posa la base de dades), no d'un text del navegador
  return { logs: (data ?? []).map(l => ({ ...l, details: { ...(l.details ?? {}), actor_name: l.actor?.full_name ?? l.details?.actor_name } })), error };
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
 * Elimina una denúncia, amb els seus missatges, adjunts i fitxers. Si RLS no ho permet,
 * no s'esborra cap fila i es retorna error. Returns { error }
 */
export async function deleteComplaint(id) {
  if (DEMO_MODE) return (await demo()).deleteComplaint(id);
  // Els fitxers del bucket no s'esborren en cascada: s'eliminen abans, mentre les files
  // d'adjunts encara existeixen (la política de storage les necessita per autoritzar-ho).
  const { data: files } = await supabase.from('attachments').select('storage_path').eq('complaint_id', id);
  const paths = (files ?? []).map(f => f.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from('attachments').remove(paths);
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

/**
 * Estat de la verificació en dos passos de la sessió.
 * Returns { level: 'aal1'|'aal2'|null, needsCode, needsSetup, error }
 *  needsCode: té un factor verificat però la sessió encara no ha passat el codi
 *  needsSetup: no té cap factor: ha de configurar-ne un abans de veure denúncies
 */
export async function getMfaState() {
  if (DEMO_MODE) return (await demo()).mfaState();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { level: null, needsCode: false, needsSetup: false, error };
  const needsCode = data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  const needsSetup = data.nextLevel !== 'aal2';
  return { level: data.currentLevel, needsCode, needsSetup, error: null };
}

/** Segon pas de l'accés: comprova el codi de 6 xifres amb el factor verificat. Returns { error } */
export async function verifyLoginCode(code) {
  if (DEMO_MODE) return (await demo()).verifyLoginCode(code);
  const { data, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: listError };
  const factor = (data?.totp ?? []).find(f => f.status === 'verified');
  if (!factor) return { error: new Error('no-factor') };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
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
      // Queda constància de l'acceptació de la política i de la data (es pot consultar a Supabase Auth)
      data: { company_name: companyName, full_name: fullName, privacy_accepted_at: new Date().toISOString() },
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
  if (DEMO_MODE) { sessionStorage.removeItem(DEMO_SESSION_KEY); (await demo()).resetAal(); return { error: null }; }
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
  // Amb la migració 008, el correu i l'últim accés venen d'una funció limitada a l'administrador
  const members = await supabase.rpc('list_org_members');
  if (!members.error) {
    return {
      profiles: (members.data ?? []).map(m => ({ ...m, email: m.email ?? '', invited: !m.last_sign_in_at })),
      error: null,
    };
  }
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
  // Una sola transacció a la base de dades: si falla, el gestor conserva els permisos que tenia
  const { error } = await supabase.rpc('set_manager_permissions', { p_manager: managerId, p_permissions: permissionsArray });
  return { error };
}

export async function inviteManager(email, fullName) {
  // Uses the Edge Function to send invite email securely
  if (DEMO_MODE) return (await demo()).inviteManager(email, fullName);
  return callFunction('invite-manager', { email, full_name: fullName });
}

export async function updateProfile(userId, updates) {
  if (DEMO_MODE) return (await demo()).updateProfile(userId, updates);
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select('id');
  if (error) return { error };
  return { error: data?.length ? null : new Error('not-allowed') };
}

export async function deleteManager(userId) {
  if (DEMO_MODE) return (await demo()).deleteManager(userId);
  return callFunction('delete-manager', { user_id: userId });
}

/** Crida una funció del servidor amb la sessió actual. Mai llança: retorna { userId, error } */
async function callFunction(name, body) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: new Error('no-session') };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => ({ error: `http-${res.status}` }));
    if (!res.ok || result.error) return { error: new Error(result.error || `http-${res.status}`) };
    return { userId: result.user?.id ?? null, error: null };
  } catch (err) {
    return { error: err };
  }
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
