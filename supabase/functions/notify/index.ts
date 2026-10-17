// Avisos por correo a quien gestiona el canal: denuncia nueva y mensaje nuevo de quien informa.
// El correo NO lleva ningún dato de la denuncia: solo la referencia y el enlace al panel.
//
// ESTADO: escrita y revisada, todavía NO probada contra un proyecto real (hace falta un proveedor de correo).
//
// Cómo se conecta (Supabase > Database > Webhooks, dos webhooks de tipo "Supabase Edge Function"):
//   1. Tabla complaints, evento INSERT  → función notify
//   2. Tabla messages,   evento INSERT  → función notify
//   En los dos, cabecera HTTP:  x-webhook-secret: <el mismo valor que WEBHOOK_SECRET>
//
// Secretos (Supabase > Edge Functions > Secrets):
//   WEBHOOK_SECRET   una cadena larga y aleatoria
//   RESEND_API_KEY   clave de Resend (resend.com), con el dominio verificado (SPF y DKIM)
//   MAIL_FROM        por ejemplo: Reportia <avisos@reportia.es>
//   SITE_URL         dirección pública del sitio, sin barra final
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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
};

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('WEBHOOK_SECRET');
    if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('MAIL_FROM');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!apiKey || !from || !siteUrl) return json({ error: 'not-configured' }, 500);

    const payload = await req.json();
    if (payload?.type !== 'INSERT') return json({ skipped: 'not-insert' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let kind: 'new' | 'message';
    let complaintId: string;
    if (payload.table === 'complaints') {
      kind = 'new';
      complaintId = payload.record.id;
    } else if (payload.table === 'messages' && payload.record?.sender === 'reporter') {
      kind = 'message';
      complaintId = payload.record.complaint_id;
    } else {
      return json({ skipped: 'not-relevant' });
    }

    const { data: complaint } = await admin
      .from('complaints').select('id, reference, category, organization_id').eq('id', complaintId).single();
    if (!complaint?.organization_id) return json({ skipped: 'no-complaint' });
    const { data: org } = await admin.from('organizations').select('name').eq('id', complaint.organization_id).single();

    // Destinatarios: administradores de la organización y gestores con permiso de ver la categoría
    const { data: profiles } = await admin
      .from('profiles').select('id, role').eq('organization_id', complaint.organization_id);
    const { data: perms } = await admin
      .from('manager_permissions').select('manager_id')
      .eq('organization_id', complaint.organization_id).eq('category', complaint.category).eq('can_view', true);
    const allowed = new Set((perms ?? []).map((p) => p.manager_id));
    const ids = (profiles ?? []).filter((p) => p.role === 'superadmin' || allowed.has(p.id)).map((p) => p.id);

    const emails: string[] = [];
    for (const id of ids) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emails.push(data.user.email);
    }
    if (!emails.length) return json({ sent: 0 });

    const url = `${siteUrl}/admin/complaints/${complaint.id}`;
    const t = TEXT[kind];
    let sent = 0;
    // Un correo por persona: nadie ve las direcciones de los demás
    for (const to of emails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [to],
          subject: t.subject(org?.name ?? '', complaint.reference ?? ''),
          text: t.body(org?.name ?? '', complaint.reference ?? '', url),
        }),
      });
      if (res.ok) sent++;
    }
    return json({ sent });
  } catch {
    return json({ error: 'server-error' }, 500);
  }
});
