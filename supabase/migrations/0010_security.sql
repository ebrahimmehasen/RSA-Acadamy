-- ============================================================
-- RSA Academy — 0010 Security: 2FA + audit log
--
-- password_history intentionally NOT built (confirmed decision):
-- Supabase Auth already owns password hashing/rotation, so a
-- parallel reuse-check table adds complexity without real benefit
-- for this app.
-- ============================================================

create table if not exists public.user_2fa (
  id integer generated always as identity primary key,
  profile_id integer not null unique references public.profiles (id) on delete cascade,
  secret text not null,             -- speakeasy base32 secret
  is_enabled boolean not null default false,
  enabled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_2fa enable row level security;

create policy user_2fa_own
  on public.user_2fa for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy user_2fa_admin
  on public.user_2fa for select
  using (public.is_admin());

-- ============================================================
create table if not exists public.backup_codes (
  id integer generated always as identity primary key,
  profile_id integer not null references public.profiles (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_backup_codes_profile on public.backup_codes (profile_id);

alter table public.backup_codes enable row level security;

create policy backup_codes_own
  on public.backup_codes for select
  using (profile_id = public.current_profile_id());

-- inserts/updates/deletes go through the service role only (issued
-- as a batch during 2FA enrollment, never edited by the client)

-- ============================================================
create table if not exists public.security_logs (
  id integer generated always as identity primary key,
  profile_id integer references public.profiles (id) on delete set null,
  event_type text not null,          -- '2fa_enabled','2fa_disabled','2fa_verify_failed','backup_code_used', etc.
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_logs_profile
  on public.security_logs (profile_id, created_at desc);

alter table public.security_logs enable row level security;

create policy security_logs_select_own
  on public.security_logs for select
  using (profile_id = public.current_profile_id());

create policy security_logs_select_admin
  on public.security_logs for select
  using (public.is_admin());
