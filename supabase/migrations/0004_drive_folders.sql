-- ============================================================
-- RSA Academy — 0004 Drive folder-ID cache + file registry
-- ============================================================

-- cache of Google Drive folder IDs by logical path
-- (service-role access only: RLS enabled with no policies)
create table if not exists public.drive_folders (
  path text primary key,          -- e.g. Profile_Pictures/Students
  drive_id text not null,
  created_at timestamptz not null default now()
);

alter table public.drive_folders enable row level security;

-- registry of every uploaded file (bytes live in Google Drive)
create table if not exists public.file_storage (
  id integer generated always as identity primary key,
  drive_file_id text not null unique,
  file_name text not null,
  mime_type text,
  file_size integer,
  entity_type text not null check (entity_type in
    ('profile', 'assignment', 'teacher_attachment', 'payment', 'session', 'quiz', 'other')),
  entity_id text,
  uploaded_by integer references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_file_storage_entity
  on public.file_storage (entity_type, entity_id);

alter table public.file_storage enable row level security;

create policy file_storage_select_admin
  on public.file_storage for select
  using (public.is_admin());
