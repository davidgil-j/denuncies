// Avisos por correo a quien gestiona el canal: denuncia nueva y mensaje nuevo de quien informa.
// El correo NO lleva ningún dato de la denuncia: solo la referencia y el enlace al panel.
//
// ESTADO: escrita y revisada, todavía NO probada contra un proyecto real (hace falta un proveedor de correo).
//
// A4 (migración 023): los avisos pueden salir con un retraso aleatorio de 1-3 h, para que la hora de quien
// denuncia no se pueda cruzar con los registros de la empresa. El retraso se reparte con la cola
// `notification_queue` y la tarea `dispatch_due_notifications()` (pg_cron). Esta función:
//   - mira la fila de la cola de esta denuncia/mensaje;
//   - si ya se envió, no reenvía (idempotente); si aún no toca (send_after en el futuro), lo deja para la tarea;
//   - si no hay cola (base de datos en la 022, sin la 023), envía al momento, como siempre: nunca calla un aviso.
// Mientras David no encienda el interruptor y pg_cron, send_after = ahora, así que el webhook sigue avisando al instante.
//
// Cómo se conecta (Supabase > Database > Webhooks, dos webhooks de tipo "Supabase Edge Function"):
//   1. Tabla complaints, evento INSERT  → función notify
//   2. Tabla messages,   evento INSERT  → función notify
//   En los dos, cabecera HTTP:  x-webhook-secret: <el mismo valor que WEBHOOK_SECRET>
//
// Secretos (Supabase > Edge Functions > Secrets):
//   WEBHOOK_SECRET   una cadena larga y aleatoria (la misma que guarda Vault como `webhook_secret` para pg_cron)
//   RESEND_API_KEY   clave de Resend (resend.com), con el dominio verificado (SPF y DKIM)
//   MAIL_FROM        por ejemplo: Reportia <avisos@reportia.es>
//   SITE_URL         dirección pública del sitio, sin barra final
import { createClient } from 'npm:@supabase/supabase-js@2.105.4';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// B6: comparar el secreto en tiempo constante (no revelar por los tiempos cuántos caracteres se aciertan)
function safeEqual(a: string, b: string): boolean {
  const n = Math.max(a.length, b.length);
  let out = a.length ^ b.length;
  for (let i = 0; i < n; i++) out |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return out === 0;
}

const TEXT = {
  new: {
    subject: (org: string, ref: string) => `Nueva denuncia en el canal de ${org} · ${ref}`,
    body: (org: string, ref: string, url: string) =>
      `Ha entrado una denuncia nueva en el canal de ${org}.\n\nReferencia: ${ref}\nAbrir en el panel: ${url}\n\n` +
      `La ley da 7 días naturales para acusar recibo y 3 meses para responder.\n` +
      `Este aviso no incluye ningún dato de la denuncia.\n\n-- \n` +
      `Ha entrat una denúncia nova al canal de ${org}. Referència: ${ref}. Obri-la al panell: ${url}`,
  },
  message: {
    subject: (org: string, ref: string) => `Mensaje nuevo del informante · ${ref}`,
    body: (org: string, ref: string, url: string) =>
      `La persona que presentó la denuncia ${ref} en el canal de ${org} ha escrito un mensaje.\n\n` +
      `Abrir en el panel: ${url}\n\nEste aviso no incluye el contenido del mensaje.\n\n-- \n` +
      `Qui va presentar la denúncia ${ref} al canal de ${org} ha escrit un missatge. Obri-la al panell: ${url}`,
  },
  // A3: resumen por hora de posibles denuncias de spam (no se avisa de cada una)
  spam_summary: {
    subject: (org: string) => `Posibles denuncias de spam en el canal de ${org}`,
    body: (org: string, _ref: string, url: string) =>
      `Han entrado varias denuncias marcadas como posible spam en el canal de ${org} en la última hora.\n\n` +
      `Revísalas en el panel, en la bandeja «Posible spam»: ${url}/admin\n\nEste aviso no incluye ningún dato de las denuncias.\n\n-- \n` +
      `Han entrat diverses denúncies marcades com a possible spam al canal de ${org} en l'última hora. Revisa-les al panell: ${url}/admin`,
  },
};

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('WEBHOOK_SECRET');
    if (!secret || !safeEqual(req.headers.get('x-webhook-secret') ?? '', secret)) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('MAIL_FROM');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!apiKey || !from || !siteUrl) return json({ error: 'not-configured' }, 500);

    const payload = await req.json();
    if (payload?.type !== 'INSERT') return json({ skipped: 'not-insert' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let kind: 'new' | 'message' | 'spam_summary';
    let complaintId: string | null = null;
    let messageId: string | null = null;
    let orgId: string | null = null;
    if (payload.table === 'complaints') {
      kind = 'new';
      complaintId = payload.record.id;
    } else if (payload.table === 'messages' && payload.record?.sender === 'reporter') {
      kind = 'message';
      complaintId = payload.record.complaint_id;
      messageId = payload.record.id;
    } else if (payload.table === 'spam_summary') {   // lo manda la tarea de pg_cron
      kind = 'spam_summary';
      orgId = payload.record?.organization_id ?? null;
    } else {
      return json({ skipped: 'not-relevant' });
    }

    // A3: si la denuncia es «posible spam», no se avisa de ella una a una; su resumen por hora la cubre.
    if (kind === 'new' && complaintId) {
      const { data: c } = await admin.from('complaints').select('likely_spam, organization_id').eq('id', complaintId).maybeSingle();
      if (c?.likely_spam) { kind = 'spam_summary'; orgId = c.organization_id; complaintId = null; }
    }

    // A4: la cola decide cuándo toca enviar (y evita duplicados). Si no existe (base de datos en la 022), se envía al momento.
    let queueId: string | null = null;
    try {
      let qry = admin.from('notification_queue').select('id, send_after, sent_at, organization_id').eq('kind', kind);
      if (kind === 'spam_summary') {
        qry = qry.eq('organization_id', orgId).is('sent_at', null).lte('send_after', new Date().toISOString()).order('send_after').limit(1);
      } else {
        qry = qry.eq(kind === 'new' ? 'complaint_id' : 'message_id', kind === 'new' ? complaintId : messageId);
      }
      const { data: q, error: qErr } = await qry.maybeSingle();
      if (!qErr && q) {
        if (q.sent_at) return json({ skipped: 'already-sent' });
        if (new Date(q.send_after).getTime() > Date.now()) return json({ skipped: 'too-early' });
        queueId = q.id;
        if (kind === 'spam_summary' && !orgId) orgId = q.organization_id;
      } else if (kind === 'spam_summary') {
        return json({ skipped: 'no-pending-summary' });  // ya se envió el resumen de esta hora, o aún no toca
      }
      // qErr (la tabla no está, 022) o sin fila new/message → se envía igual y no se marca: nunca se calla un aviso
    } catch { /* sin cola: enviar al momento (solo new/message) */ }

    // Destinatarios, nombre de la empresa y enlace según el tipo de aviso
    const emailsOf = async (ids: string[]) => {
      const out: string[] = [];
      for (const id of ids) { const { data } = await admin.auth.admin.getUserById(id); if (data?.user?.email) out.push(data.user.email); }
      return out;
    };
    let orgName = '';
    let ref = '';
    let url = `${siteUrl}/admin`;
    let emails: string[] = [];
    if (kind === 'spam_summary') {
      if (!orgId) return json({ skipped: 'no-org' });
      const { data: o } = await admin.from('organizations').select('name').eq('id', orgId).single();
      orgName = o?.name ?? '';
      const { data: profiles } = await admin.from('profiles').select('id, role').eq('organization_id', orgId);
      emails = await emailsOf((profiles ?? []).filter((p) => p.role === 'superadmin').map((p) => p.id));
    } else {
      const { data: complaint } = await admin
        .from('complaints').select('id, reference, category, organization_id').eq('id', complaintId).single();
      if (!complaint?.organization_id) return json({ skipped: 'no-complaint' });
      const { data: o } = await admin.from('organizations').select('name').eq('id', complaint.organization_id).single();
      orgName = o?.name ?? '';
      ref = complaint.reference ?? '';
      url = `${siteUrl}/admin/complaints/${complaint.id}`;
      const { data: profiles } = await admin.from('profiles').select('id, role').eq('organization_id', complaint.organization_id);
      const { data: perms } = await admin.from('manager_permissions').select('manager_id')
        .eq('organization_id', complaint.organization_id).eq('category', complaint.category).eq('can_view', true);
      const allowed = new Set((perms ?? []).map((p) => p.manager_id));
      emails = await emailsOf((profiles ?? []).filter((p) => p.role === 'superadmin' || allowed.has(p.id)).map((p) => p.id));
    }

    if (!emails.length) {
      // Sin destinatarios: no hay nada que enviar, pero el aviso queda procesado (la tarea no lo reintenta)
      if (queueId) await admin.from('notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', queueId).is('sent_at', null);
      return json({ sent: 0 });
    }

    const t = TEXT[kind];
    let sent = 0;
    // Un correo por persona: nadie ve las direcciones de los demás
    for (const to of emails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: t.subject(orgName, ref), text: t.body(orgName, ref, url) }),
      });
      if (res.ok) sent++;
    }
    // A4: marcar como enviado solo si se procesó de verdad (si fallaron todos los envíos, la tarea lo reintenta)
    if (queueId && sent > 0) {
      await admin.from('notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', queueId).is('sent_at', null);
    }
    return json({ sent });
  } catch {
    return json({ error: 'server-error' }, 500);
  }
});
