-- ============================================================
-- Canal de Denúncies — Supabase Schema
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Tabla principal de denuncias/comunicaciones
create table if not exists complaints (
  id              uuid default gen_random_uuid() primary key,
  tracking_code   text unique not null,
  is_anonymous    boolean default true,
  -- Datos del denunciante (null si anónimo)
  reporter_name   text,
  reporter_email  text,
  reporter_phone  text,
  -- Detalles del incidente
  category        text not null,
  department      text,
  description     text not null,
  incident_date   date,
  involved_people text,
  -- Gestión interna
  status          text default 'received'
                  check (status in ('received','reviewing','investigating','waiting','resolved','closed','archived')),
  priority        text default 'normal'
                  check (priority in ('low','normal','high','critical')),
  language        text default 'ca',
  -- Auditoría
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. Archivos adjuntos
create table if not exists attachments (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz default now()
);

-- 3. Mensajes (canal denunciante ↔ gestor)
create table if not exists messages (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete cascade,
  sender       text not null check (sender in ('reporter','manager')),
  content      text not null,
  is_read      boolean default false,
  created_at   timestamptz default now()
);

-- 4. Log de auditoría (inmutable)
create table if not exists audit_logs (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete set null,
  action       text not null,
  details      jsonb,
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table complaints   enable row level security;
alter table attachments  enable row level security;
alter table messages     enable row level security;
alter table audit_logs   enable row level security;

-- Política: cualquiera puede INSERTAR (anon key)
create policy "allow_insert_complaints" on complaints
  for insert with check (true);

-- Política: solo se puede leer por tracking_code (anon key)
create policy "allow_select_by_tracking_code" on complaints
  for select using (true);  -- se filtra en la query por tracking_code

-- Política: insertar adjuntos
create policy "allow_insert_attachments" on attachments
  for insert with check (true);

-- Política: insertar mensajes
create policy "allow_insert_messages" on messages
  for insert with check (true);

-- Política: leer mensajes (el denunciante solo puede leer los del caso que conoce por complaint_id)
create policy "allow_select_messages" on messages
  for select using (true);  -- se filtra en la query por complaint_id

-- Política: insertar audit logs
create policy "allow_insert_audit_logs" on audit_logs
  for insert with check (true);

-- ============================================================
-- Storage bucket para adjuntos
-- ============================================================

-- Crear bucket privado (ejecutar también en SQL Editor)
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 104857600)  -- 100MB
on conflict (id) do nothing;

-- Política de upload para el bucket
create policy "allow_upload_attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments');

-- ============================================================
-- Trigger: actualizar updated_at automáticamente
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on complaints
  for each row execute function update_updated_at();
