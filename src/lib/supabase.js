import { createClient } from '@supabase/supabase-js';
import { insertWithWhen, withWhen, isMissingSchema } from './whenFallback.js';
import { solveProofOfWork } from './pow.js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY') {
  console.warn('[Supabase] ⚠️  Missing credentials — running in offline/demo mode.');
}

// Enlace de un correo (recuperar la contraseña o invitación). Se lee AHORA, antes de crear el cliente:
// Supabase procesa el permiso de la dirección al arrancar, borra su rastro y avisa (PASSWORD_RECOVERY)
// mucho antes de que la pantalla «Contraseña nueva» se haya descargado y pueda escucharlo.
const LINK_KEY = 'reportia-auth-link';
function readAuthLink() {
  const none = { type: '', error: '', code: '', tokenHash: '' };
  if (typeof window === 'undefined') return none;
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const error = hash.get('error_code') || hash.get('error') || query.get('error_code') || query.get('error') || '';
    const kind = hash.get('type') || query.get('type') || '';
    // Tres formatos: #access_token=…&type=recovery|invite (implícito), ?code=… (PKCE) y
    // ?token_hash=…&type=… (plantilla de correo propia, que funciona aunque se abra en otro navegador)
    const code = query.get('code') || '';
    const tokenHash = query.get('token_hash') || '';
    const arrived = hash.has('access_token') || !!code || !!tokenHash;
    if (error) { window.sessionStorage.removeItem(LINK_KEY); return { ...none, error }; }
    if (arrived) {
      const type = kind === 'invite' ? 'invite' : 'recovery';
      window.sessionStorage.setItem(LINK_KEY, type); // sobrevive a una recarga de la página dentro de la misma pestaña
      return { type, error: '', code, tokenHash };
    }
    return { ...none, type: window.sessionStorage.getItem(LINK_KEY) || '' };
  } catch { return none; }
}
const authLink = readAuthLink();

// createClient lanza un error si la URL está vacía; con un valor de relleno la interfaz carga
// y las llamadas a la base de datos simplemente fallan (modo sin conexión o demo).
export const supabase = createClient(SUPABASE_URL || 'http://localhost:54321', SUPABASE_ANON || 'offline-demo-key', {
  auth: {
    storage:          typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession:   true,
    autoRefreshToken: true,
  },
});

export { SUPABASE_URL };

// Si el aviso de recuperación llega antes de que nadie lo escuche, queda apuntado aquí
let recoveryEventSeen = false;
supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') recoveryEventSeen = true; });

// Modo demo: solo si no hay credenciales (nunca en producción). Permite trabajar la interfaz sin base de datos.
// Modo demo: sin credenciales, y solo en desarrollo o si se pide explícitamente
// (VITE_DEMO=1, para enseñar la web). Un build de producción mal configurado no acepta denuncias falsas.
const NO_CREDENTIALS = !SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'PENDING_REPLACE_WITH_ANON_KEY';
const DEMO_MODE = NO_CREDENTIALS && (import.meta.env.DEV || import.meta.env.VITE_DEMO === '1');
const DEMO_ORG  = { id: 'demo-org', name: 'Empresa Demo', slug: 'demo' };
// Datos de demostración del panel (denuncias, mensajes, registro, usuarios). Import dinámico:
// solo se descarga en modo demo, nunca en producción.
const demo = () => import('./demoStore.js');
const DEMO_SESSION_KEY = 'reportia-demo-session';
const DEMO_USER = { id: 'demo-user', email: 'l.puig@empresa-demo.es' };
const DEMO_SESSION = { user: DEMO_USER, access_token: 'demo' };
export const IS_DEMO = DEMO_MODE;
// Ayudas de IA para quien gestiona (resumen y borradores): APAGADAS si no hay VITE_AI_ENABLED=1.
// Apagadas, el panel no enseña nada de ellas ni pide nada de más. Ver docs/IA.md.
export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === '1';

// El canal de ejemplo (/canal/demo) funciona siempre, también en la web publicada: vive en datos de muestra
// dentro del navegador (demoStore) y nunca llega a la base de datos real. Solo afecta a las funciones
// públicas del canal (enviar, consultar y mensajes de quien informa); el panel no entra.
let exampleChannel = false;
const channelDemo = () => DEMO_MODE || exampleChannel;

// ── Denuncias ──────────────────────────────────────────────────────────

/**
 * Guarda una denuncia nueva (solo la fila; los adjuntos se suben después con uploadAttachments, para que
 * quien informa vea su código aunque la subida se interrumpa).
 * attempt: { id, trackingCode } de un intento anterior del mismo envío. Si la red cae después de
 * guardar, al volver a intentarlo se usa el mismo código y la base de datos no crea otra.
 * Devuelve { trackingCode, complaintId, attempt, error }
 */
export async function saveComplaint({ formData, files, organizationId, attempt }) {
  const id           = attempt?.id ?? crypto.randomUUID();
  const trackingCode = attempt?.trackingCode ?? generateTrackingCode();
  // El «id de envío» (A1): la idempotencia va por aquí, no por el código. Se reutiliza al reintentar.
  const submissionId = attempt?.submissionId ?? crypto.randomUUID();
  const next = { id, trackingCode, submissionId };
  // Personas del panel que quien denuncia aparta del caso (C1, migración 020)
  const excluded = Array.isArray(formData.excluded) ? formData.excluded.filter(Boolean) : [];

  if (channelDemo()) {
    // En la demo, la denuncia enviada aparece en el panel y se puede consultar con su código
    (await demo()).addComplaint({ id, trackingCode, formData, files: files ?? [], excluded });
    return { trackingCode, complaintId: id, attempt: next, error: null };
  }

  const anon = formData.isAnonymous;
  // 1. Con la migración 021: una sola llamada, con el id de envío y las personas apartadas. Escribe
  // también la entrada «created» del registro y nunca revela si un código ya existe.
  const base16 = {
    p_submission_id: submissionId,
    p_org: organizationId, p_hash: await codeHash(trackingCode), p_category: formData.category,
    p_description: formData.description.trim(), p_is_anonymous: anon,
    p_name: anon ? null : clean(formData.name), p_email: anon ? null : clean(formData.email), p_phone: anon ? null : clean(formData.phone),
    p_department: clean(formData.department), p_incident_date: formData.incidentDate || null,
    p_involved: clean(formData.involvedPeople), p_language: formData.language ?? 'ca',
    p_meeting: !!formData.meetingRequested, p_when: clean(formData.when),
    p_excluded: excluded,
  };
  const retry = () => saveComplaint({ formData, files, organizationId, attempt: { id: crypto.randomUUID(), trackingCode: generateTrackingCode(), submissionId: crypto.randomUUID(), retried: true } });
  // A3 (migración 026): enviar exige la prueba de trabajo. Si el navegador la resuelve, se usa el camino de 18
  // parámetros; si la base de datos aún no lo pide (hasta la 025) o el navegador no la puede resolver, se cae al de 16.
  const proof = await solveProof(organizationId);
  if (proof.token) {
    const withPow = await supabase.rpc('submit_complaint', { ...base16, p_pow_token: proof.token, p_pow_nonce: proof.nonce });
    if (!withPow.error) return { trackingCode, complaintId: withPow.data, attempt: next, error: null };
    if (/code-conflict|submit-failed/.test(withPow.error.message ?? '') && !attempt?.retried) return retry();
    if (!isMissingSchema(withPow.error)) return { trackingCode: null, complaintId: null, attempt: next, error: withPow.error };
    // El de 18 parámetros no existe (base de datos en la 025): seguimos con el de 16
  }
  const viaFunction = await supabase.rpc('submit_complaint', base16);
  if (!viaFunction.error) return { trackingCode, complaintId: viaFunction.data, attempt: next, error: null };
  // El código ya es de otra denuncia (casi imposible): uno nuevo, una sola vez. «submit-failed» es el
  // error genérico de la 021 (no revela que el código existe); «code-conflict», el de antes.
  if (/code-conflict|submit-failed/.test(viaFunction.error.message ?? '') && !attempt?.retried) return retry();
  if (!isMissingSchema(viaFunction.error)) return { trackingCode: null, complaintId: null, attempt: next, error: viaFunction.error };

  // 2. Sin la migración 014: inserción directa, con el id y el código generados aquí.
  // El código de seguimiento no sale nunca del navegador: solo se envía su hash (migración 010).
  const row = {
      id,
      tracking_hash:   await codeHash(trackingCode),
      organization_id: organizationId ?? null,
      is_anonymous:    anon,
      reporter_name:   anon ? null : clean(formData.name),
      reporter_email:  anon ? null : clean(formData.email),
      reporter_phone:  anon ? null : clean(formData.phone),
      category:        formData.category,
      department:      clean(formData.department),
      description:     formData.description.trim(),
      incident_date:   formData.incidentDate || null,
      involved_people: clean(formData.involvedPeople),
      language:        formData.language ?? 'ca',
      // Petición de reunión presencial (art. 7.2). La columna existe desde la migración 011
      meeting_requested: !!formData.meetingRequested,
      status:          'received',
      priority:        'normal',
  };
  // El «cuándo» en texto libre va a su columna (migración 012). Si la base de datos aún no la tiene,
  // se guarda una sola vez al final de la descripción (ver whenFallback.js)
  const { error: dbError } = await insertWithWhen(
    async (r) => ({ error: (await supabase.from('complaints').insert(r)).error }),
    row, formData.when, formData.whenLabel ?? 'Cuándo',
  );
  // El id ya existe: es este mismo envío, que se guardó pero la respuesta no llegó
  const savedBefore = dbError?.code === '23505' && /complaints_pkey/.test(dbError.message ?? '');
  if (dbError && !savedBefore) return { trackingCode: null, complaintId: null, attempt: next, error: dbError };

  if (!savedBefore) {
    await supabase.from('audit_logs').insert({
      complaint_id:    id,
      organization_id: organizationId ?? null,
      action:          'created',
      details:         { channel: 'web', language: formData.language ?? 'ca' },
    });
  }
  return { trackingCode, complaintId: id, attempt: next, error: null };
}

// Tipo de cada archivo según la extensión: son los que acepta el almacén (migración 015). No se usa
// el tipo que dice el navegador porque a menudo viene vacío (HEIC en Windows, .msg) o es genérico.
const MIME = {
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation',
  zip: 'application/zip', eml: 'message/rfc822', msg: 'application/vnd.ms-outlook',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', avi: 'video/x-msvideo', webm: 'video/webm', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac', opus: 'audio/opus', amr: 'audio/amr',
};
export const mimeOf = (name, fallback = '') => MIME[(String(name).split('.').pop() || '').toLowerCase()] ?? (fallback || 'application/octet-stream');

/**
 * Sube los adjuntos de una denuncia recién guardada. La ruta del bucket no lleva el nombre original: Storage
 * rechaza acentos y caracteres especiales, y el nombre puede identificar a quien denuncia. En una denuncia anónima
 * tampoco viaja el nombre original (ni a la tabla ni a la subida), y las fotos ya llegan limpias
 * (cleanForAnonymous, antes de enviar). onProgress(n): n archivos terminados. Devuelve { failedFiles }
 */
export async function uploadAttachments({ complaintId, submissionId, files, isAnonymous, onProgress }) {
  const failedFiles = [];
  if (channelDemo() || !files?.length) return { failedFiles };
  // M5: la ruta lleva el «id de envío» (solo lo tiene quien envió); sin él, la base de datos (027) rechaza la subida
  const folder = submissionId ? `${complaintId}/${submissionId}` : `${complaintId}`;
  for (const [i, file] of files.entries()) {
    const ext  = (file.name.includes('.') ? file.name.split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const path = `${folder}/${i + 1}-${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;
    const name = isAnonymous ? neutralName(file.name, i) : file.name;
    const type = mimeOf(file.name, file.type);
    const body = isAnonymous ? new File([file], name, { type, lastModified: 0 }) : file;

    const { error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(path, body, { upsert: false, contentType: type });

    if (uploadError) { failedFiles.push(file.name); onProgress?.(i + 1); continue; }

    const { error: rowError } = await supabase.from('attachments').insert({
      complaint_id: complaintId,
      filename:     name,
      storage_path: path,
      file_size:    file.size,
      mime_type:    type,
    });
    if (rowError) {
      failedFiles.push(file.name);
      // Sin su fila, nadie lo vería ni lo borraría: se quita del bucket
      await supabase.storage.from('attachments').remove([path]);
    }
    onProgress?.(i + 1);
  }
  return { failedFiles };
}

const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

/** Nombre neutro para un adjunto de una denuncia anónima: "document-1.pdf" */
export function neutralName(name, i) {
  const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return `document-${i + 1}${ext ? `.${ext}` : ''}`;
}

/** Hash del código de seguimiento, igual que code_hash() de la base de datos (SHA-256 en hexadecimal) */
async function codeHash(code) {
  const norm = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Estado de una denuncia a partir del código de seguimiento.
 * Devuelve { complaint, error }
 */
export async function getComplaintByCode(trackingCode, orgId) {
  if (channelDemo()) {
    // Un código que no existe se trata igual que en producción: no hay ninguna denuncia
    return { complaint: (await demo()).findByCode(trackingCode) ?? null, error: null };
  }
  const code = trackingCode.toUpperCase();
  // Camino endurecido (freno por empresa + prueba de trabajo, sin revelar si el código existe).
  const proof = await solveProof(orgId);
  if (proof.failed) return { complaint: null, error: new Error('proof-failed') };
  if (proof.token) {
    const { data, error } = await supabase.rpc('consult_complaint', { p_org: orgId, p_code: code, p_pow_token: proof.token, p_pow_nonce: proof.nonce });
    if (!error) return { complaint: data?.[0] ?? null, error: null };
    if (!isMissingSchema(error)) return { complaint: null, error };
  }
  // Solo si la base de datos aún no tiene la 021 (no pasa en producción): la función de antes.
  const { data, error } = await supabase.rpc('get_complaint_by_tracking_code', { p_code: code });
  return { complaint: data?.[0] ?? null, error };
}

/**
 * Portal de seguimiento: quien informa pide una reunión presencial con su código (art. 7.2).
 * La función de la base de datos llega con la migración 012; hasta entonces, el portal no ofrece
 * el botón (get_complaint_by_tracking_code aún no devuelve meeting_requested). Devuelve { error }
 */
export async function requestMeetingByCode(trackingCode, orgId) {
  if (channelDemo()) return (await demo()).requestMeetingByCode(trackingCode);
  const proof = await solveProof(orgId);
  if (proof.failed) return { error: new Error('proof-failed') };
  if (proof.token) {
    const { data, error } = await supabase.rpc('request_meeting_in_org', { p_org: orgId, p_code: trackingCode, p_pow_token: proof.token, p_pow_nonce: proof.nonce });
    if (!error) return data == null ? { error: new Error('complaint-not-found') } : { error: null };
    if (!isMissingSchema(error)) return { error };
  }
  const { data, error } = await supabase.rpc('request_meeting_by_code', { p_code: trackingCode });
  // Con la migración 014, un código que no existe no da error: devuelve vacío (ver 014_endurecimiento.sql)
  if (!error && data == null) return { error: new Error('complaint-not-found') };
  return { error };
}

/**
 * Quién gestiona el canal de una empresa, para que quien denuncia pueda apartar a personas del caso (C1,
 * migración 020). Devuelve { people: [{ id, full_name, role }], error }. Si la base de datos aún no lo
 * ofrece (sin la 020), devuelve una lista vacía y el formulario no enseña la sección.
 */
export async function getChannelManagers(orgId) {
  if (channelDemo()) return (await demo()).getChannelManagers();
  if (!orgId) return { people: [], error: null };
  const { data, error } = await supabase.rpc('get_channel_managers', { p_org: orgId });
  if (error) return { people: [], error: isMissingSchema(error) ? null : error };
  return { people: data ?? [], error: null };
}

export async function getOrganizationBySlug(slug) {
  // En la demo solo existe el canal "demo": cualquier otra dirección se comporta como en producción
  exampleChannel = slug === DEMO_ORG.slug;
  if (channelDemo()) {
    if (!exampleChannel) return { organization: null, error: null };
    // El canal de ejemplo enseña el nombre, la autoridad autonómica y la marca que se pongan en «Equipo y ajustes» de la demo
    const { name, regional_authority_name = null, regional_authority_url = null, brand_palette = 'azul', brand_logo = null, show_powered_by = true } = (await demo()).getOrganization();
    return { organization: { ...DEMO_ORG, name, regional_authority_name, regional_authority_url, brand_palette, brand_logo, show_powered_by, is_example: true }, error: null };
  }
  const { data, error } = await supabase.rpc('get_organization_by_slug', { p_slug: slug });
  return { organization: data?.[0] ?? null, error };
}

/**
 * Qué canal abrir en la dirección propia de una empresa (canal.acme.es; migración 017). Devuelve la dirección del
 * canal (slug) o null si la dirección no es de ninguna empresa, no hay conexión o la base de datos aún no tiene la 017.
 */
export async function getSlugByDomain(host) {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase.rpc('get_organization_slug_by_domain', { p_host: host });
  return error || typeof data !== 'string' ? null : data;
}

/**
 * Organización del usuario autenticado. Con la migración 009 incluye el plan (plan, trial_ends_at,
 * paid_until), la persona responsable del sistema y los datos de facturación.
 */
export async function getMyOrganization() {
  if (DEMO_MODE) return { organization: (await demo()).getOrganization(), error: null };
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .single();
  return { organization: data ?? null, error };
}

// Campos que el administrador puede editar desde el panel. El plan, las fechas y la dirección del canal
// solo los cambia Reportia (y la base de datos lo impide: migración 009).
const ORG_EDITABLE = [
  'name', 'responsible_name', 'responsible_role', 'billing_name', 'billing_tax_id', 'billing_email',
  // Autoridad autonómica que se muestra en el canal (migración 011)
  'regional_authority_name', 'regional_authority_url',
  // Fechas del Responsable y pasos de «Primeros pasos» marcados a mano (migración 012)
  'responsible_appointed_at', 'aipi_notified_at', 'onboarding',
  // «Tu marca»: la paleta y el logo (migración 016)
  'brand_palette', 'brand_logo',
];

/** Guarda los datos de la organización propia. Devuelve { organization, error } */
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

// Columnas de la denuncia que el panel puede leer (migración 011). No está la identidad de quien
// informa: solo se consulta con getReporterIdentity, y cada consulta queda en el registro de actividad
const COMPLAINT_COLUMNS = [
  'id', 'reference', 'organization_id', 'is_anonymous', 'category', 'department', 'description', 'incident_date',
  'involved_people', 'status', 'priority', 'language', 'created_at', 'updated_at',
  'acknowledged_at', 'answered_at', 'extended_until', 'extension_reason', 'anonymized_at',
  'channel', 'meeting_requested', 'meeting_held_at', 'outcome', 'investigation_started_at', 'fiscal_referral_at',
].join(', ');

// A3 (migración 026): la marca «posible spam». Se lee aparte para que la web siga funcionando sin la 026.
let spamCol = null; // null: aún no se sabe · true/false
/** Añade likely_spam a una lista de filas (o un id suelto) con una consulta aparte. Si la 026 no está, todo es false. */
async function withSpam(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (spamCol === false || !list.length) return rows;
  // Se pide también el valor y se comprueba en el navegador: así, si algo devuelve filas sin filtrar, no se marca de más
  const { data, error } = await supabase.from('complaints').select('id, likely_spam').eq('likely_spam', true).in('id', list.map(c => c.id));
  if (error) { if (isMissingSchema(error)) spamCol = false; return rows; }
  spamCol = true;
  const spam = new Set((data ?? []).filter(r => r.likely_spam === true).map(r => r.id));
  list.forEach(c => { c.likely_spam = spam.has(c.id); });
  return rows;
}

// Columnas de la migración 012 (rediseño). El panel funciona igual si aún no se ha ejecutado:
// se piden y, si la base de datos las rechaza, se vuelve a pedir sin ellas y el panel esconde
// lo que depende de ellas (título editable, «quién lo lleva», «solo los míos»).
const REDESIGN_COLUMNS = ['title', 'assigned_to', 'incident_when', 'meeting_requested_at'];
let redesign = null; // null: aún no se sabe · true/false
/** false si la base de datos aún no tiene las columnas de la migración 012 */
export const hasRedesign = () => (DEMO_MODE ? true : redesign !== false);
async function withRedesign(run) {
  if (redesign !== false) {
    const first = await run(REDESIGN_COLUMNS);
    if (!first.error) { redesign = true; return first; }
    // Un corte de red o un error del servidor no quiere decir que falte la 012: se devuelve el error y no se decide nada
    if (redesign === true || !isMissingSchema(first.error)) return first;
  }
  const base = await run([]);
  if (!base.error) redesign = false;
  return base;
}

/**
 * Mensajes de una denuncia (los de quien informa y los de quien gestiona).
 * Devuelve { messages, error }
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
 * Envía un mensaje. sender = 'reporter' | 'manager'
 * Devuelve { error }
 */
export async function sendMessage(complaintId, content, sender = 'reporter', actorName = '') {
  if (DEMO_MODE) return (await demo()).sendMessage(complaintId, content, sender, actorName);
  const { error } = await supabase
    .from('messages')
    .insert({ complaint_id: complaintId, sender, content });

  return { error };
}

/**
 * Portal de seguimiento: mensajes de una denuncia a partir del código (sin sesión).
 * Pasa por una función de la base de datos; la tabla de mensajes no se puede leer sin sesión.
 * Devuelve { messages, error }
 */
export async function getReporterMessages(trackingCode, orgId) {
  if (channelDemo()) return (await demo()).getMessagesByCode(trackingCode);
  const proof = await solveProof(orgId);
  if (proof.failed) return { messages: [], error: new Error('proof-failed') };
  if (proof.token) {
    const { data, error } = await supabase.rpc('messages_by_code', { p_org: orgId, p_code: trackingCode, p_pow_token: proof.token, p_pow_nonce: proof.nonce });
    if (!error) return { messages: data ?? [], error: null };
    if (!isMissingSchema(error)) return { messages: [], error };
  }
  const { data, error } = await supabase.rpc('get_messages_by_tracking_code', { p_code: trackingCode });
  return { messages: data ?? [], error };
}

/** Portal de seguimiento: quien denuncia envía un mensaje con su código. Devuelve { error } */
export async function sendReporterMessage(trackingCode, content, orgId) {
  if (channelDemo()) return (await demo()).sendReporterMessage(trackingCode, content);
  const proof = await solveProof(orgId);
  if (proof.failed) return { error: new Error('proof-failed') };
  if (proof.token) {
    const { data, error } = await supabase.rpc('send_message_by_code', { p_org: orgId, p_code: trackingCode, p_content: content, p_pow_token: proof.token, p_pow_nonce: proof.nonce });
    if (!error) return data == null ? { error: new Error('complaint-not-found') } : { error: null };
    if (!isMissingSchema(error)) return { error };
  }
  const { data, error } = await supabase.rpc('send_reporter_message', { p_code: trackingCode, p_content: content });
  if (!error && data == null) return { error: new Error('complaint-not-found') };
  return { error };
}

// ── Gestión de una denuncia (migración 010) ───────────────────────────
// El registro de actividad de los cambios de estado, prioridad y mensajes lo escribe la base de datos.

/**
 * Cambia estado o prioridad. Si RLS no lo permite no se actualiza ninguna fila: se devuelve un error
 * (antes se mostraba «Cambios guardados» sin haber guardado nada).
 */
export async function updateComplaint(id, changes, actorName = '') {
  if (DEMO_MODE) return (await demo()).updateComplaint(id, changes, actorName);
  const { status, priority } = changes;
  const patch = {};
  if (status) patch.status = status;
  if (priority) patch.priority = priority;
  // Resultado de la tramitación (011); título y quién lleva el caso (012)
  if ('outcome' in changes) patch.outcome = changes.outcome || null;
  if ('title' in changes) patch.title = changes.title?.trim() || null;
  if ('assigned_to' in changes) patch.assigned_to = changes.assigned_to || null;
  const { data, error } = await supabase.from('complaints').update(patch).eq('id', id).select('id, status, priority, outcome, acknowledged_at, answered_at, updated_at');
  if (error) return { complaint: null, error };
  if (!data?.length) return { complaint: null, error: new Error('not-allowed') };
  return { complaint: data[0], error: null };
}

/** Nota interna en el registro (no la ve quien denuncia). Devuelve { error } */
export async function addComplaintNote(complaintId, note, actorName = '') {
  if (DEMO_MODE) return (await demo()).addNote(complaintId, note, actorName);
  const { error } = await supabase.from('audit_logs').insert({ complaint_id: complaintId, action: 'note_added', details: { note } });
  return { error };
}

/** Marca como leídos los mensajes de quien denuncia */
export async function markMessagesRead(complaintId) {
  if (DEMO_MODE) return (await demo()).markRead(complaintId);
  const { error } = await supabase.from('messages').update({ is_read: true })
    .eq('complaint_id', complaintId).eq('sender', 'reporter').eq('is_read', false);
  return { error };
}

/** Amplía el plazo de respuesta hasta 6 meses desde la recepción (art. 9.2 d). Devuelve { until, error } */
export async function extendDeadline(complaintId, reason, actorName = '') {
  if (DEMO_MODE) return (await demo()).extendDeadline(complaintId, reason, actorName);
  const { data, error } = await supabase.rpc('extend_response_deadline', { p_complaint: complaintId, p_reason: reason });
  return { until: data ?? null, error };
}

/**
 * Suprime los datos de una denuncia (art. 32): primero los archivos del bucket, después el contenido.
 * La fila se conserva anonimizada en el libro-registro. Devuelve { error }
 */
export async function anonymizeComplaint(complaintId, reason, actorName = '') {
  if (DEMO_MODE) return (await demo()).anonymize(complaintId, reason, actorName);
  const { data: files } = await supabase.from('attachments').select('storage_path').eq('complaint_id', complaintId);
  // También lo que haya en la carpeta del caso aunque no tenga fila (una subida que falló a medias)
  const { data: inFolder } = await supabase.storage.from('attachments').list(complaintId, { limit: 1000 });
  const paths = [...new Set([
    ...(files ?? []).map(f => f.storage_path).filter(Boolean),
    ...(inFolder ?? []).filter(o => o?.name && o.id !== null).map(o => `${complaintId}/${o.name}`),
  ])];
  if (paths.length) {
    const { error: rmError } = await supabase.storage.from('attachments').remove(paths);
    if (rmError) return { error: rmError };
  }
  const { error } = await supabase.rpc('anonymize_complaint', { p_complaint: complaintId, p_reason: reason });
  return { error };
}

// ── A7: supresión con control (periodo de gracia de 7 días) ───────────────
/** Programa la supresión (motivo ≥ 30). missing = la base de datos aún no tiene la 025 (usar la supresión de antes). */
export async function requestSuppression(complaintId, reason) {
  if (DEMO_MODE) return (await demo()).requestSuppression(complaintId, reason);
  const { data, error } = await supabase.rpc('request_suppression', { p_complaint: complaintId, p_reason: reason });
  return { scheduledFor: data ?? null, missing: isMissingSchema(error), error };
}
/** Cancela la supresión programada (cualquier administrador que pueda suprimir). */
export async function cancelSuppression(complaintId) {
  if (DEMO_MODE) return (await demo()).cancelSuppression(complaintId);
  const { error } = await supabase.rpc('cancel_suppression', { p_complaint: complaintId });
  return { error };
}
/** Ejecuta la supresión ya vencida: borra los bytes de los archivos (permiso solo con una supresión vencida) y anonimiza. */
export async function executeSuppression(complaintId) {
  if (DEMO_MODE) return (await demo()).executeSuppression(complaintId);
  const { data: files } = await supabase.from('attachments').select('storage_path').eq('complaint_id', complaintId);
  const { data: inFolder } = await supabase.storage.from('attachments').list(complaintId, { limit: 1000 });
  const paths = [...new Set([
    ...(files ?? []).map(f => f.storage_path).filter(Boolean),
    ...(inFolder ?? []).filter(o => o?.name && o.id !== null).map(o => `${complaintId}/${o.name}`),
  ])];
  if (paths.length) await supabase.storage.from('attachments').remove(paths);
  const { error } = await supabase.rpc('execute_suppression', { p_complaint: complaintId });
  return { error };
}
/** La supresión programada de un caso (para la ficha), o null. */
export async function suppressionFor(complaintId) {
  if (DEMO_MODE) return (await demo()).suppressionFor(complaintId);
  const { data, error } = await supabase.rpc('suppression_for', { p_complaint: complaintId });
  if (error) return { pending: null, error: isMissingSchema(error) ? null : error };
  return { pending: data?.[0] ?? null, error: null };
}
/** Todas las supresiones programadas de la empresa (aviso al resto de administradores). */
export async function listPendingSuppressions() {
  if (DEMO_MODE) return (await demo()).listPendingSuppressions();
  const { data, error } = await supabase.rpc('list_pending_suppressions');
  if (error) return { items: [], error: isMissingSchema(error) ? null : error };
  return { items: data ?? [], error: null };
}

/** Denuncias que hay que suprimir (3 meses sin investigación, o 10 años). Solo administrador. */
export async function getRetentionDue() {
  if (DEMO_MODE) return (await demo()).retentionDue();
  const { data, error } = await supabase.rpc('retention_due');
  return { items: data ?? [], error };
}

/**
 * Una denuncia por su id (panel).
 */
export async function getComplaintById(id) {
  if (DEMO_MODE) return (await demo()).getComplaintById(id);
  const { data, error } = await withRedesign(extra => supabase
    .from('complaints')
    .select(`${[COMPLAINT_COLUMNS, ...extra].join(', ')}, attachments(*)`)
    .eq('id', id)
    .single());
  if (data) await withSpam(data); // A3: marca «posible spam» (sin la 026, queda como no spam)
  return { complaint: data, error };
}

/** A3: devuelve una denuncia al tablero (no era spam). Devuelve { error } */
export async function clearSpamFlag(complaintId) {
  if (DEMO_MODE) return (await demo()).clearSpamFlag(complaintId);
  const { error } = await supabase.rpc('clear_spam_flag', { p_complaint: complaintId });
  return { error };
}

/**
 * Identidad de quien informa, en una denuncia identificada. La base de datos comprueba el permiso y
 * anota la consulta en el registro de actividad. Devuelve { identity: { reporter_name, reporter_email, reporter_phone } | null, error }
 */
export async function getReporterIdentity(complaintId, reason) {
  if (DEMO_MODE) return (await demo()).getReporterIdentity(complaintId, reason);
  // M6: con motivo (≥10) va por la versión nueva; si la base de datos aún no la tiene (hasta la 026), la de antes
  if (reason) {
    const withReason = await supabase.rpc('get_reporter_identity', { p_complaint: complaintId, p_reason: reason });
    if (!withReason.error) return { identity: withReason.data?.[0] ?? null, error: null };
    if (!isMissingSchema(withReason.error)) return { identity: null, error: withReason.error };
  }
  const { data, error } = await supabase.rpc('get_reporter_identity', { p_complaint: complaintId });
  return { identity: error ? null : (data?.[0] ?? null), error };
}

/**
 * Quién gestiona el caso y quién está apartado (C1, migración 020). Devuelve { people, missing, error }.
 * people: [{ id, full_name, role, excluded, source }]. missing: true si la base de datos aún no lo ofrece.
 */
export async function listComplaintAccess(complaintId) {
  if (DEMO_MODE) return (await demo()).listComplaintAccess(complaintId);
  const { data, error } = await supabase.rpc('list_complaint_access', { p_complaint: complaintId });
  if (error) return { people: [], missing: isMissingSchema(error), error: isMissingSchema(error) ? null : error };
  return { people: data ?? [], missing: false, error: null };
}

/** Aparta a una persona del caso (solo administrador). Devuelve { error } */
export async function excludeFromComplaint(complaintId, profileId) {
  if (DEMO_MODE) return (await demo()).excludeFromComplaint(complaintId, profileId);
  const { error } = await supabase.rpc('exclude_from_complaint', { p_complaint: complaintId, p_profile: profileId });
  return { error };
}

/** Devuelve el acceso a quien apartó un administrador (nunca a quien apartó quien denunció). Devuelve { error } */
export async function includeInComplaint(complaintId, profileId) {
  if (DEMO_MODE) return (await demo()).includeInComplaint(complaintId, profileId);
  const { error } = await supabase.rpc('include_in_complaint', { p_complaint: complaintId, p_profile: profileId });
  return { error };
}

// ── Acciones de la ficha (migraciones 011 y 012) ──────────────────────

/** Marca la reunión presencial como hecha. Devuelve { error } */
export async function markMeetingHeld(complaintId, actorName = '') {
  if (DEMO_MODE) return (await demo()).markMeetingHeld(complaintId, actorName);
  const { error } = await supabase.rpc('mark_meeting_held', { p_complaint: complaintId });
  return { error };
}

/** Anota la remisión al Ministerio Fiscal (no se puede deshacer). Devuelve { error } */
export async function markFiscalReferral(complaintId, note, actorName = '') {
  if (DEMO_MODE) return (await demo()).markFiscalReferral(complaintId, note, actorName);
  const { error } = await supabase.rpc('mark_fiscal_referral', { p_complaint: complaintId, p_note: note ?? '' });
  return { error };
}

/** Personas del equipo a quienes se puede asignar un caso. Devuelve { people: [{ id, full_name, role }], error } */
export async function listAssignees() {
  if (DEMO_MODE) return (await demo()).listAssignees();
  const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name', { ascending: true });
  return { people: data ?? [], error };
}

/**
 * Registra una comunicación recibida por otra vía (teléfono, presencial, carta, correo).
 * El código de seguimiento se genera aquí y solo se envía su hash: se muestra una sola vez
 * para entregarlo a la persona informante. Devuelve { id, trackingCode, error }
 */
export async function registerComplaint(form, actorName = '') {
  const trackingCode = generateTrackingCode();
  if (DEMO_MODE) return (await demo()).registerComplaint({ ...form, trackingCode }, actorName);
  const anon = form.isAnonymous !== false;
  const base = {
    p_category: form.category, p_description: form.description.trim(), p_channel: form.channel,
    p_received_at: form.receivedAt || null, p_is_anonymous: anon,
    p_reporter_name: anon ? null : clean(form.name), p_reporter_email: anon ? null : clean(form.email), p_reporter_phone: anon ? null : clean(form.phone),
    p_department: clean(form.department), p_incident_date: null, p_involved_people: clean(form.involvedPeople),
    p_language: form.language ?? 'es', p_code_hash: await codeHash(trackingCode),
  };
  const when = clean(form.when);
  if (redesign !== false) {
    const { data, error } = await supabase.rpc('register_complaint', { ...base, p_incident_when: when });
    if (!error) return { id: data, trackingCode, error: null };
    // Solo si la función nueva no existe se prueba la de antes (un error de red no lo dice)
    if (!isMissingSchema(error)) return { id: null, trackingCode: null, error };
  }
  // Sin la migración 012: la función de antes, con el «cuándo» al final de la descripción
  const { data, error } = await supabase.rpc('register_complaint', { ...base, p_description: withWhen(base.p_description, when, form.whenLabel ?? 'Cuándo') });
  return { id: error ? null : data, trackingCode: error ? null : trackingCode, error };
}

// ── Panel v2 ───────────────────────────────────────────────────────────

/**
 * Todas las denuncias que el usuario puede ver, sin datos del denunciante (solo las
 * columnas del listado). categories = null (superadmin, todas) o la lista permitida.
 * El panel filtra, ordena y calcula los plazos legales a partir de aquí.
 * Devuelve { complaints, error }
 */
export async function listComplaints({ categories = null } = {}) {
  if (DEMO_MODE) return (await demo()).listComplaints({ categories });
  if (categories && categories.length === 0) return { complaints: [], error: null };
  // La descripción está para la búsqueda por texto (se filtra en el navegador)
  const cols = 'id, reference, category, status, priority, is_anonymous, department, incident_date, language, created_at, updated_at, acknowledged_at, answered_at, extended_until, anonymized_at, description, channel, meeting_requested, meeting_held_at, outcome, investigation_started_at';
  // Se lee por páginas: sin límite de 1.000 filas
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await withRedesign(extra => {
      let query = supabase.from('complaints').select([cols, ...extra, ...(AI_ENABLED && extra.length ? ['ai_title'] : [])].join(', ')).order('created_at', { ascending: false }).range(from, from + 999);
      if (categories) query = query.in('category', categories);
      return query;
    });
    if (error) return { complaints: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // Mensajes de quien denuncia aún no leídos, para marcarlos en el listado
  const { data: unread } = await supabase.from('messages').select('complaint_id').eq('sender', 'reporter').eq('is_read', false);
  const counts = (unread ?? []).reduce((m, r) => m.set(r.complaint_id, (m.get(r.complaint_id) ?? 0) + 1), new Map());
  await withSpam(rows); // A3: marca las «posible spam» (sin la 026, todas quedan como no spam)
  return { complaints: rows.map(c => ({ ...c, likely_spam: !!c.likely_spam, unread: counts.get(c.id) ?? 0 })), error: null };
}

/** Registro de actividad de una denuncia. Devuelve { logs, error } */
export async function getAuditLogs(complaintId) {
  if (DEMO_MODE) return (await demo()).getAuditLogs(complaintId);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles(full_name)')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  // El autor lo pone la base de datos, no el navegador: el nombre que tenía en aquel momento (actor_name,
  // migración 014) o, sin la 014, el nombre actual del perfil
  return { logs: (data ?? []).map(l => ({ ...l, details: { ...(l.details ?? {}), actor_name: l.actor_name ?? l.actor?.full_name ?? l.details?.actor_name } })), error };
}

// ── A6: registro de accesos ──────────────────────────────────────────
// Anota en la base de datos quién abre, exporta o descarga. Mejor esfuerzo: si la base de datos aún no lo
// tiene (migración 024 sin ejecutar), no pasa nada y el panel sigue igual. kind: case_opened | exported_case | file_downloaded
export async function logCaseAccess(complaintId, kind, detail = null) {
  if (DEMO_MODE) { (await demo()).logCaseAccess?.(complaintId, kind, detail); return; }
  await supabase.rpc('log_case_access', { p_complaint: complaintId, p_kind: kind, p_detail: detail }); // error ignorado a propósito
}
/** Anota una exportación de toda la empresa (sin caso): exported_excel | exported_report */
export async function logOrgExport(kind) {
  if (DEMO_MODE) { (await demo()).logOrgExport?.(kind); return; }
  await supabase.rpc('log_org_export', { p_kind: kind });
}
/** El registro de accesos de la empresa (solo administradores). Devuelve { rows, error } */
export async function listAccessLog({ limit = 200, offset = 0 } = {}) {
  if (DEMO_MODE) return (await demo()).listAccessLog({ limit, offset });
  const { data, error } = await supabase.rpc('list_access_log', { p_limit: limit, p_offset: offset });
  return { rows: data ?? [], error };
}

/** Enlace temporal (60 s) para descargar un adjunto del bucket privado. Devuelve { url, demo, error } */
export async function getAttachmentUrl(storagePath) {
  if (DEMO_MODE) return { url: null, demo: true, error: null };
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(storagePath, 60);
  return { url: data?.signedUrl ?? null, demo: false, error };
}

// ── Verificación en dos pasos (alta y baja desde el panel) ────────────

/** Factores TOTP del usuario. Devuelve { factors, error } */
export async function listMfaFactors() {
  if (DEMO_MODE) return (await demo()).listMfaFactors();
  const { data, error } = await supabase.auth.mfa.listFactors();
  return { factors: data?.totp ?? [], error };
}

/** Inicia el alta de un factor TOTP. Devuelve { factorId, qrCode, secret, error } */
export async function enrollMfaFactor() {
  if (DEMO_MODE) return (await demo()).enrollMfaFactor();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Reportia Canal Ètic' });
  return { factorId: data?.id ?? null, qrCode: data?.totp?.qr_code ?? null, secret: data?.totp?.secret ?? null, error };
}

/** Confirma el alta con el primer código de 6 cifras. Devuelve { error } */
export async function verifyMfaEnrollment(factorId, code) {
  if (DEMO_MODE) return (await demo()).verifyMfaEnrollment(factorId, code);
  const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chalErr) return { error: chalErr };
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  return { error };
}

/** Da de baja un factor TOTP. Devuelve { error } */
export async function unenrollMfaFactor(factorId) {
  if (DEMO_MODE) return (await demo()).unenrollMfaFactor(factorId);
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error };
}

/**
 * Estado de la verificación en dos pasos de la sesión.
 * Devuelve { level: 'aal1'|'aal2'|null, needsCode, needsSetup, error }
 *  needsCode: tiene un factor verificado pero la sesión aún no ha pasado el código
 *  needsSetup: no tiene ningún factor: debe configurar uno antes de ver denuncias
 */
export async function getMfaState() {
  if (DEMO_MODE) return (await demo()).mfaState();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { level: null, needsCode: false, needsSetup: false, error };
  const needsCode = data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  const needsSetup = data.nextLevel !== 'aal2';
  return { level: data.currentLevel, needsCode, needsSetup, error: null };
}

/** Segundo paso del acceso: comprueba el código de 6 cifras con el factor verificado. Devuelve { error } */
export async function verifyLoginCode(code) {
  if (DEMO_MODE) return (await demo()).verifyLoginCode(code);
  const { data, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: listError };
  const factor = (data?.totp ?? []).find(f => f.status === 'verified');
  if (!factor) return { error: new Error('no-factor') };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  return { error };
}

// ── Autenticación (panel) ──────────────────────────────────────────────

/** captchaToken: el de Turnstile (n.º 71), si el acceso lo pide; Supabase Auth lo comprueba con la protección encendida */
export async function signInAdmin(email, password, captchaToken) {
  if (DEMO_MODE) {
    sessionStorage.setItem(DEMO_SESSION_KEY, '1');
    return { session: DEMO_SESSION, error: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password, ...(captchaToken ? { options: { captchaToken } } : {}) });
  return { session: data?.session, error };
}

/**
 * Alta de una organización nueva. Crea la fila de auth.users con
 * company_name y full_name en raw_user_meta_data; el trigger de la base de datos
 * (migración 006) crea la organización y el perfil de superadmin.
 * Devuelve { user, needsConfirmation, error }.
 */
export async function signUpOrganization({ companyName, fullName, email, password, lang, captchaToken }) {
  if (DEMO_MODE) return { user: { ...DEMO_USER, email }, needsConfirmation: true, error: null };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Queda constancia de la aceptación de la política y de la fecha (se puede consultar en Supabase Auth)
      // lang: el idioma de los correos de Supabase Auth (las plantillas lo leen: scripts/correos.mjs)
      data: { company_name: companyName, full_name: fullName, privacy_accepted_at: new Date().toISOString(), ...(lang ? { lang } : {}) },
      emailRedirectTo: `${window.location.origin}/admin/login`,
      ...(captchaToken ? { captchaToken } : {}),
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
    // se ignora
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
    // Sesión caducada o dañada que no acaba de renovarse: se borra para que el acceso vuelva a funcionar
    clearStaleAuthToken();
    return null;
  }
}

export async function sendPasswordReset(email, captchaToken) {
  if (DEMO_MODE) return { error: null };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
    ...(captchaToken ? { captchaToken } : {}),
  });
  return { error };
}

export async function updatePassword(newPassword) {
  if (DEMO_MODE) return { error: null };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  // El enlace del correo ya ha hecho su trabajo
  if (!error) { try { window.sessionStorage.removeItem(LINK_KEY); } catch { /* res */ } }
  return { error };
}

/**
 * Estado del enlace de «Contraseña nueva» al cargar la pantalla, sin depender de haber escuchado
 * el aviso a tiempo. Espera a que Supabase acabe de procesar la dirección (getSession lo hace) y mira si hay sesión.
 * Devuelve { state: 'ready' | 'invalid' | 'wait', invite }
 *   ready: hay sesión y se ha llegado por un enlace de correo · invalid: el enlace trae un error o no
 *   ha dejado sesión · wait: no hay rastro de ningún enlace (la pantalla sigue escuchando un rato)
 */
export function getPasswordLinkState() {
  // Una sola comprobación aunque la pantalla la pida dos veces: el código del enlace solo sirve una vez
  linkState ??= resolvePasswordLink();
  return linkState;
}
let linkState = null;
async function resolvePasswordLink() {
  if (DEMO_MODE) return { state: 'wait', invite: false };
  if (authLink.error) return { state: 'invalid', invite: false };
  let session = await getAdminSession();
  // Si el cliente no ha podido convertir el enlace en sesión por sí solo, se prueba aquí (una sola vez)
  if (!session && (authLink.tokenHash || authLink.code)) {
    const { tokenHash, code } = authLink;
    authLink.tokenHash = ''; authLink.code = '';
    try {
      const { data } = tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: authLink.type === 'invite' ? 'invite' : 'recovery' })
        : await supabase.auth.exchangeCodeForSession(code);
      session = data?.session ?? null;
    } catch { session = null; }
  }
  const arrived = !!authLink.type || recoveryEventSeen;
  if (session && arrived) return { state: 'ready', invite: authLink.type === 'invite' };
  if (!session && authLink.type) return { state: 'invalid', invite: false };
  return { state: 'wait', invite: false };
}

/**
 * Escucha los eventos de autenticación (PASSWORD_RECOVERY, SIGNED_IN…) para que
 * las páginas no llamen a supabase.auth directamente. Devuelve la función para dejar de escuchar.
 * En modo demo emite PASSWORD_RECOVERY para que la página de restablecimiento se pueda revisar.
 */
export function onAuthEvent(callback) {
  if (DEMO_MODE) {
    const id = setTimeout(() => callback('PASSWORD_RECOVERY', null), 0);
    return () => clearTimeout(id);
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

// ── Perfiles y permisos ────────────────────────────────────────────────

export async function getProfile(userId) {
  if (DEMO_MODE) return (await demo()).getProfile(DEMO_USER.id);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile: data, error };
}

export async function getAllProfiles() {
  if (DEMO_MODE) return (await demo()).getAllProfiles();
  // Con la migración 008, el correo y el último acceso vienen de una función limitada al administrador
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
  // Sin la migración 008 el correo no se puede leer desde el navegador (solo el servidor lo ve)
  return { profiles: data.map(p => ({ ...p, email: '' })), error: null };
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
  // Una sola transacción en la base de datos: si falla, el gestor conserva los permisos que tenía
  const { error } = await supabase.rpc('set_manager_permissions', { p_manager: managerId, p_permissions: permissionsArray });
  return { error };
}

export async function inviteManager(email, fullName, lang) {
  // Usa la función de servidor para enviar el correo de invitación de forma segura. lang: el idioma de sus correos
  if (DEMO_MODE) return (await demo()).inviteManager(email, fullName);
  return callFunction('invite-manager', { email, full_name: fullName, ...(lang ? { lang } : {}) });
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

// ── IA (apagada por defecto) ───────────────────────────────────────────
// Nada de esto se ejecuta si AI_ENABLED es falso: ninguna pantalla lo llama.

/** Resumen y título hechos con IA que un caso ya tiene guardados. Devuelve { ai: { summary, title, generatedAt } | null, error } */
export async function getAiSummary(complaintId) {
  if (!AI_ENABLED) return { ai: null, error: null };
  if (DEMO_MODE) return (await demo()).getAiSummary(complaintId);
  const { data, error } = await supabase.from('complaints').select('ai_summary, ai_title, ai_generated_at').eq('id', complaintId).maybeSingle();
  if (error || !data?.ai_summary) return { ai: null, error };
  return { ai: { summary: data.ai_summary, title: data.ai_title ?? '', generatedAt: data.ai_generated_at }, error: null };
}

/** Pide el resumen (3 frases) y el título. Lo guarda el servidor. Devuelve { ai, error } */
export async function requestAiSummary(complaintId, lang, actorName = '') {
  if (!AI_ENABLED) return { ai: null, error: new Error('ai-disabled') };
  if (DEMO_MODE) return (await demo()).requestAiSummary(complaintId, actorName);
  const { data, error } = await callFunction('ai-assist', { complaint_id: complaintId, action: 'summary', lang });
  if (error) return { ai: null, error };
  return { ai: { summary: data.summary, title: data.title ?? '', generatedAt: data.generated_at }, error: null };
}

/** Pide un borrador de mensaje (kind: ack | question | answer). No guarda ni envía nada. Devuelve { draft, error } */
export async function requestAiDraft(complaintId, kind) {
  if (!AI_ENABLED) return { draft: '', error: new Error('ai-disabled') };
  if (DEMO_MODE) return (await demo()).requestAiDraft(complaintId, kind);
  const { data, error } = await callFunction('ai-assist', { complaint_id: complaintId, action: 'draft', kind });
  return { draft: error ? '' : String(data.draft ?? ''), error };
}

/** Llama a una función del servidor con la sesión actual. Nunca lanza: devuelve { userId, error } */
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
    return { userId: result.user?.id ?? null, data: result, error: null };
  } catch (err) {
    return { error: err };
  }
}

// ── Cifras ─────────────────────────────────────────────────────────────

// ── Utilidades ─────────────────────────────────────────────────────────

function generateTrackingCode() {
  // 16 caracteres (80 bits), en cuatro grupos de cuatro (hallazgo A1). Los códigos de 8 de antes siguen
  // valiendo: la huella se calcula igual (code_hash normaliza y no mira la longitud).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[bytes[i] % chars.length]; // 256 % 32 === 0: sin sesgo al hacer el módulo
  }
  return code; // por ejemplo "A3B7-C9X2-K4M8-PQ2R"
}

// ── Prueba de trabajo del portal de seguimiento (A2, migración 021) ─────
// El servidor da un reto y el navegador lo resuelve en un worker (sin bloquear la interfaz). Si no se
// puede (no está la 021, o el navegador no tiene worker ni sha-256), se devuelve null y se usa el camino
// de antes. Nunca sale nada del ordenador ni se guarda ninguna IP.
function runPow(token, bits) {
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL('../v2/canal/powWorker.js', import.meta.url), { type: 'module' });
    } catch {
      solveProofOfWork(token, bits).then(resolve, () => resolve(null));
      return;
    }
    const finish = (v) => { try { worker.terminate(); } catch { /* nada */ } resolve(v); };
    const timer = setTimeout(() => finish(null), 60000);
    worker.onmessage = (e) => { clearTimeout(timer); finish(e.data?.nonce ?? null); };
    worker.onerror = () => { clearTimeout(timer); solveProofOfWork(token, bits).then(resolve, () => resolve(null)); };
    worker.postMessage({ token, bits });
  });
}

/**
 * Resuelve una prueba de trabajo para una empresa. Devuelve:
 *   { token, nonce }  resuelta (usar el camino endurecido)
 *   { missing: true } la base de datos no tiene la 021 (usar el camino de antes; no pasa en producción)
 *   { failed: true }  hay 021 pero la prueba no se pudo resolver (el navegador no puede): error claro, nunca el camino viejo
 */
async function solveProof(orgId) {
  if (!orgId) return { missing: true };
  let res;
  try {
    res = await supabase.rpc('issue_pow_challenge', { p_org: orgId });
  } catch {
    return { failed: true };
  }
  if (res.error) return isMissingSchema(res.error) ? { missing: true } : { failed: true };
  const row = res.data?.[0];
  if (!row?.token) return { failed: true };
  const nonce = await runPow(row.token, row.bits);
  return nonce == null ? { failed: true } : { token: row.token, nonce };
}
