-- Migració 007: fix canal públic — política d'inserció anònima
-- La política public_insert_complaints de la migració 005 no estava permetent
-- inserts des del client anònim. Es recrea explícitament.

drop policy if exists "public_insert_complaints" on complaints;

create policy "public_insert_complaints" on complaints
  for insert with check (organization_id is not null);
