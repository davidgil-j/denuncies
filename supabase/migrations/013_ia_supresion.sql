-- ══════════════════════════════════════════════════════════════════════
-- 013 · IA preparada (apagada) i supressió completa
--
-- Additiva i repetible: es pot executar més d'una vegada. No esborra ni reanomena res.
-- Al final hi ha l'explicació de cada bloc en paraules planeres.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. La supressió de dades (art. 32) també buida el que va arribar amb la 012 ──
-- Fins ara quedaven el títol del cas, el «quan» en text lliure i el resum fet amb IA,
-- que poden contenir el mateix que la descripció que s'esborra.

create or replace function anonymize_complaint(p_complaint uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.reference into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;

  delete from messages where complaint_id = p_complaint;
  delete from attachments where complaint_id = p_complaint;
  update complaints set
    description = '', department = null, involved_people = null, incident_date = null,
    incident_when = null, title = null,
    ai_summary = null, ai_title = null, ai_generated_at = null,
    reporter_name = null, reporter_email = null, reporter_phone = null,
    tracking_hash = 'anon-' || id::text,
    anonymized_at = now()
  where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'anonymized', jsonb_build_object('note', trim(p_reason)));
end;
$$;
grant execute on function anonymize_complaint(uuid, text) to authenticated;

-- Els casos que ja s'havien suprimit abans d'aquesta migració: es buiden ara les mateixes columnes
update complaints set incident_when = null, title = null, ai_summary = null, ai_title = null, ai_generated_at = null
where anonymized_at is not null
  and (incident_when is not null or title is not null or ai_summary is not null or ai_title is not null or ai_generated_at is not null);

-- ── 2. Desar el resum i el títol fets amb IA ───────────────────────────
-- Només ho pot cridar el servidor (la funció ai-assist, amb la clau de servei), mai el navegador:
-- així el resum que es veu al panell sempre ve de la funció i queda anotat qui el va demanar.

create or replace function store_ai_summary(p_complaint uuid, p_actor uuid, p_summary text, p_title text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_actor record;
  v_now timestamptz := now();
  v_summary text := nullif(left(trim(coalesce(p_summary, '')), 1200), '');
  v_title text := nullif(left(trim(coalesce(p_title, '')), 160), '');
begin
  -- Qui la pot cridar ho decideixen els permisos de sota (només service_role)
  if v_summary is null then
    raise exception 'summary-required' using errcode = '22023';
  end if;
  select c.id, c.organization_id into v from complaints c where c.id = p_complaint and c.anonymized_at is null;
  select p.id, p.full_name into v_actor from profiles p where p.id = p_actor and p.organization_id = v.organization_id;
  if v.id is null or v_actor.id is null then
    raise exception 'not-allowed' using errcode = '42501';
  end if;

  update complaints set ai_summary = v_summary, ai_title = v_title, ai_generated_at = v_now where id = p_complaint;
  -- La columna actor_id la posa sempre la base de dades amb la sessió (migració 008) i aquí no n'hi ha:
  -- qui ho va demanar queda dins dels detalls
  insert into audit_logs (complaint_id, organization_id, action, details)
  values (p_complaint, v.organization_id, 'ai_summary', jsonb_build_object('actor_name', v_actor.full_name, 'requested_by', v_actor.id));
  return v_now;
end;
$$;
revoke all on function store_ai_summary(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function store_ai_summary(uuid, uuid, text, text) to service_role;

-- Avisa l'API perquè vegi la funció nova sense esperar
notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- QUÈ FA CADA BLOC
--
-- 1. Supressió completa
--    En suprimir les dades d'un cas (art. 32), ara també es buiden el títol, el «quan» en text
--    lliure i el resum i el títol fets amb IA. Abans quedaven, i podien repetir el que deia la
--    descripció. Els casos suprimits abans d'aquesta migració es netegen en executar-la.
--
-- 2. Desar el resum de la IA
--    store_ai_summary desa el resum i el títol i ho anota al registre d'activitat amb el nom de
--    qui ho va demanar. Només la pot cridar el servidor: des del navegador dona error. Mentre la
--    IA estigui apagada (o la funció ai-assist sense desplegar), ningú no la crida i no canvia res.
--
-- No cal fer res més després d'executar-la.
-- ══════════════════════════════════════════════════════════════════════
