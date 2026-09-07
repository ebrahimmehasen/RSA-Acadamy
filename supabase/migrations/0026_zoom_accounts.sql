-- ============================================================
-- RSA Academy — 0026 Zoom accounts
-- A fixed, admin-managed list of Zoom meeting links the admin can pick
-- from while building the class schedule, instead of typing the link/
-- meeting ID/passcode by hand for every slot.
-- ============================================================

create table if not exists public.zoom_accounts (
  id bigint generated always as identity primary key,
  label text not null,
  link text not null,
  meeting_id text,
  passcode text,
  created_at timestamptz not null default now()
);

alter table public.zoom_accounts enable row level security;

-- Admin-only, same pattern as the rest of this codebase's admin-managed
-- tables — read/write goes through createAdminClient().
create policy zoom_accounts_admin_only
  on public.zoom_accounts for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.zoom_accounts (label, link, meeting_id, passcode)
values (
  'الحساب الأول',
  'https://us06web.zoom.us/j/3088571822?pwd=bRB3VT22IbwfnfJIDboSyZveJxQPd2.1',
  '308 857 1822',
  '1122'
);
