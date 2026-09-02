-- ============================================================
-- RSA Academy — 0025 Platform settings
-- Singleton row of site-wide toggles the admin controls, starting
-- with whether public login/signup is open or shows "قريباً" on the
-- landing page.
-- ============================================================

create table if not exists public.platform_settings (
  id integer primary key default 1 check (id = 1),
  auth_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id, auth_enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Read via the admin (service-role) client only — the landing page and
-- the admin toggle both read/write through createAdminClient(), same
-- as the rest of this codebase's admin-only tables, so no anon policy
-- is needed here.
create policy platform_settings_admin_only
  on public.platform_settings for all
  using (public.is_admin())
  with check (public.is_admin());
