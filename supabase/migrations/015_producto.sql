-- ══════════════════════════════════════════════════════════════════════
-- 015 · Producte: casos suprimits, permís per marcar llegit i tipus d'arxiu (docs/AUDITORIA.md)
--
-- Additiva i repetible: es pot executar més d'una vegada. No esborra cap dada ni cap columna.
-- L'aplicació funciona igual abans i després d'executar-la.
-- Al final hi ha l'explicació de cada bloc en paraules planeres.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Un cas amb les dades suprimides ja no es toca (B-16) ────────────
-- Des del navegador no se'n pot canviar l'estat, la prioritat ni res més, ni escriure-hi missatges.
-- La demo ja ho impedia; ara també la base de dades.

create or replace function protect_erased_complaint()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if is_client_request() and old.anonymized_at is not null then
    raise exception 'complaint-anonymized' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_erased_complaint on complaints;
create trigger protect_erased_complaint
  before update on complaints
  for each row execute function protect_erased_complaint();

drop policy if exists "org_insert_messages" on messages;
create policy "org_insert_messages" on messages
  for insert with check (
    sender = 'manager'
    and exists (
      select 1 from complaints c
      where c.id = messages.complaint_id and c.anonymized_at is null and can_access_category(c.category, 'reply')
    )
  );

-- ── 2. Marcar com a llegits els missatges: qui hi ha de respondre (A1-11) ──
-- Un gestor que només pot «veure» un tema ja no fa desaparèixer l'avís de «missatge nou» als altres.

drop policy if exists "org_update_messages" on messages;
create policy "org_update_messages" on messages
  for update using (
    exists (select 1 from complaints c where c.id = messages.complaint_id and can_access_category(c.category, 'reply'))
  )
  with check (
    exists (select 1 from complaints c where c.id = messages.complaint_id and can_access_category(c.category, 'reply'))
  );

-- ── 3. Tipus d'arxiu: llista tancada (A2-4) ────────────────────────────
-- Abans s'acceptava qualsevol imatge (també SVG, que pot portar codi) i «application/octet-stream»
-- (qualsevol cosa). Ara, exactament els formats que ofereix el formulari. El navegador envia el tipus
-- segons l'extensió de l'arxiu, de manera que un arxiu permès sempre té un tipus d'aquesta llista.

update storage.buckets set
  allowed_mime_types = array[
    -- documents
    'application/pdf', 'text/plain', 'text/csv', 'application/rtf', 'text/rtf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/zip', 'application/x-zip-compressed', 'message/rfc822', 'application/vnd.ms-outlook',
    -- imatges (sense SVG)
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
    -- vídeo
    'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/x-msvideo', 'video/webm', 'video/3gpp',
    -- àudio
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/opus', 'audio/amr'
  ]
where id = 'attachments';

-- ══════════════════════════════════════════════════════════════════════
-- Què fa cada bloc, en paraules planeres
--
-- 1. Quan se suprimeixen les dades d'un cas (art. 32), ningú del panell hi pot fer res més: ni canviar
--    l'estat, ni la prioritat, ni escriure-hi. Abans la base de dades ho deixava fer.
-- 2. Només qui pot respondre en un tema pot marcar com a llegits els missatges de qui informa. Abans,
--    algú que només podia mirar els marcava com a llegits en obrir el cas i l'avís desapareixia per a
--    qui sí havia de respondre.
-- 3. El magatzem d'arxius només accepta els formats que ofereix el formulari (PDF, Office, fotos, vídeo,
--    àudio, ZIP i correus). Ja no accepta SVG ni «qualsevol arxiu».
-- ══════════════════════════════════════════════════════════════════════
