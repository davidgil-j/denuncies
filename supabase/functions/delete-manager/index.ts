import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);
    if (aalOf(authHeader) !== 'aal2') return json({ error: 'mfa-required' }, 403);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from('profiles').select('role, organization_id').eq('id', user.id).single();
    if (profile?.role !== 'superadmin' || !profile.organization_id) return json({ error: 'Forbidden' }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: 'invalid' }, 400);
    if (user_id === user.id) return json({ error: 'self' }, 400);

    // Només usuaris de la mateixa organització, i mai l'últim administrador
    const { data: target } = await adminClient.from('profiles').select('organization_id, role').eq('id', user_id).single();
    if (!target || target.organization_id !== profile.organization_id) return json({ error: 'Forbidden' }, 403);
    if (target.role === 'superadmin') {
      const { count } = await adminClient.from('profiles').select('id', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id).eq('role', 'superadmin');
      if ((count ?? 0) <= 1) return json({ error: 'last-admin' }, 400);
    }

    await adminClient.from('manager_permissions').delete().eq('manager_id', user_id);
    await adminClient.from('profiles').delete().eq('id', user_id);
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) return json({ error: 'delete-failed' }, 400);

    return json({ success: true });
  } catch {
    return json({ error: 'server-error' }, 500);
  }
});
