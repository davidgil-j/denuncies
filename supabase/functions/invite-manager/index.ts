import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Nivell de verificació del token (aal2 = ha passat la verificació en dos passos)
function aalOf(authHeader: string): string {
  try {
    const payload = authHeader.replace(/^Bearer\s+/i, '').split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).aal ?? '';
  } catch { return ''; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Sense adreça del lloc configurada no es convida ningú (l'enllaç portaria a un domini equivocat)
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

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { full_name: cleanName },
      redirectTo: `${siteUrl}/admin/reset-password`,
    });
    // Resposta genèrica: no es revela si el correu ja té compte (a Reportia o a una altra empresa)
    if (error || !data?.user) return json({ error: 'invite-failed' }, 400);

    // El trigger crea el perfil sense organització: l'invitat entra a la de qui convida.
    // Només si encara no en té cap (un usuari d'una altra empresa no es mou mai).
    const { data: updated, error: orgError } = await adminClient
      .from('profiles')
      .update({ organization_id: profile.organization_id, role: 'manager' })
      .eq('id', data.user.id)
      .is('organization_id', null)
      .select('id');
    if (orgError || !updated?.length) {
      // Si no s'ha pogut assignar, no es deixa un usuari a mitges
      if (!data.user.last_sign_in_at) await adminClient.auth.admin.deleteUser(data.user.id);
      return json({ error: 'invite-failed' }, 400);
    }

    return json({ user: { id: data.user.id } });
  } catch {
    return json({ error: 'server-error' }, 500);
  }
});
