-- Migration 002: polítiques admin + índexs de rendiment

-- Permet als usuaris autenticats (admins) actualitzar denúncies
create policy "allow_admin_update_complaints" on complaints
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Índexs per a consultes ràpides a l'admin panel
create index if not exists idx_complaints_status     on complaints(status);
create index if not exists idx_complaints_created_at on complaints(created_at desc);
create index if not exists idx_messages_complaint_id on messages(complaint_id);
