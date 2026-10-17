import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCors } from '../_shared/cors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Nivel de verificación del token (aal2 = ha pasado la verificación en dos pasos)
function aalOf(authHeader: string): string {
  try {
    const payload = authHeader.replace(/^Bearer\s+/i, '').split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).aal ?? '';
  } catch { return ''; }
}

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Sin la dirección del sitio configurada no se invita a nadie (el enlace llevaría a un dominio equivocado)
    const siteUrl = Deno.env.get('SITE_URL');
    if (!siteUrl) return json({ error: 'site-url-missing' }, 500);

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);
    if (aalOf(authHeader) !== 'aal2') return json({ error: 'mfa-required' }, 403);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from('profiles').select('role, organization_id').eq('id', user.id).single();
    if (profile?.role !== 'superadmin' || !profile.organization_id) return json({ error: 'Forbidden' }, 403);

    const { email, full_name } = await req.json();
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const cleanName = String(full_name ?? '').trim().slice(0, 120);
    if (!cleanEmail || !cleanName) return json({ error: 'invalid' }, 400);

    // Como mucho 20 invitaciones al día por empresa: el correo de invitación lleva el nombre que escribe quien invita
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count: sent } = await adminClient.from('audit_logs').select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id).eq('action', 'member_invited').gte('created_at', since);
    if ((sent ?? 0) >= 20) return json({ error: 'invite-limit' }, 429);

    // Un correo que ya tiene cuenta solo se puede volver a invitar si es de esta empresa y aún no ha entrado.
    // Nunca se adopta ni se borra una cuenta de otra empresa o sin empresa (migración 014: find_auth_user).
    // Sin la 014, la función no existe y se sigue como antes, pero sin borrar a nadie.
    const { data: found, error: findError } = await adminClient.rpc('find_auth_user', { p_email: cleanEmail });
    const existing = findError ? null : (found ?? [])[0] ?? null;
    if (existing && (existing.organization_id !== profile.organization_id || existing.last_sign_in_at)) {
      return json({ error: 'invite-failed' }, 400);
    }

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { full_name: cleanName },
      redirectTo: `${siteUrl}/admin/reset-password`,
    });
    // Respuesta genérica: no se revela si el correo ya tiene cuenta (en Reportia o en otra empresa)
    if (error || !data?.user) return json({ error: 'invite-failed' }, 400);

    // Queda en el registro de la empresa (y cuenta para el límite diario)
    await adminClient.from('audit_logs').insert({
      complaint_id: null, organization_id: profile.organization_id, action: 'member_invited', actor_id: user.id,
      details: { member_id: data.user.id, member_name: cleanName, invited_by: user.id },
    });

    // Ya era una invitación pendiente de esta empresa: se ha reenviado el correo y nada más
    if (existing) return json({ user: { id: data.user.id } });

    // El trigger crea el perfil sin organización: el invitado entra en la de quien invita.
    // Solo si aún no tiene ninguna (un usuario de otra empresa no se mueve nunca).
    const { data: updated, error: orgError } = await adminClient
      .from('profiles')
      .update({ organization_id: profile.organization_id, role: 'manager' })
      .eq('id', data.user.id)
      .is('organization_id', null)
      .select('id');
    if (orgError || !updated?.length) {
      // Si no se ha podido asignar, no se deja a medias una cuenta creada ahora mismo por esta invitación.
      // Una cuenta que ya existía (o de la que no se sabe, sin la 014) no se borra nunca.
      if (!findError && !existing) await adminClient.auth.admin.deleteUser(data.user.id);
      return json({ error: 'invite-failed' }, 400);
    }

    return json({ user: { id: data.user.id } });
  } catch {
    return json({ error: 'server-error' }, 500);
  }
}));
