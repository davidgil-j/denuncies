-- Migration 001: schema inicial complet
-- Taules: complaints, attachments, messages, audit_logs + RLS + trigger

create table if not exists complaints (
  id              uuid default gen_random_uuid() primary key,
  tracking_code   text unique not null,
  is_anonymous    boolean default true,
  reporter_name   text,
  reporter_email  text,
  reporter_phone  text,
  category        text not null,
  department      text,
  description     text not null,
  incident_date   date,
  involved_people text,
  status          text default 'received'
                  check (status in ('received','reviewing','investigating','waiting','resolved','closed','archived')),
  priority        text default 'normal'
                  check (priority in ('low','normal','high','critical')),
  language        text default 'ca',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists attachments (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz default now()
);

create table if not exists messages (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete cascade,
  sender       text not null check (sender in ('reporter','manager')),
  content      text not null,
  is_read      boolean default false,
  created_at   timestamptz default now()
);

create table if not exists audit_logs (
  id           uuid default gen_random_uuid() primary key,
  complaint_id uuid references complaints(id) on delete set null,
  action       text not null,
  details      jsonb,
  created_at   timestamptz default now()
);

alter table complaints  enable row level security;
alter table attachments enable row level security;
alter table messages    enable row level security;
alter table audit_logs  enable row level security;

create policy "allow_insert_complaints"          on complaints  for insert with check (true);
create policy "allow_select_by_tracking_code"    on complaints  for select using (true);
create policy "allow_insert_attachments"         on attachments for insert with check (true);
create policy "allow_insert_messages"            on messages    for insert with check (true);
create policy "allow_select_messages"            on messages    for select using (true);
create policy "allow_insert_audit_logs"          on audit_logs  for insert with check (true);

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
