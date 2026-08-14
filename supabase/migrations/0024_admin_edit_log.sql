-- ============================================================
-- RSA Academy — 0024 Admin edit audit log
-- Records who (admin) changed what on a student/teacher/parent
-- record and when — shown on that person's admin detail page.
-- ============================================================

create table if not exists public.admin_edit_log (
  id integer generated always as identity primary key,
  admin_id integer references public.profiles (id) on delete set null,
  admin_name text not null,
  target_type text not null check (target_type in ('student', 'teacher', 'parent')),
  target_id integer not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_edit_log_target
  on public.admin_edit_log (target_type, target_id, created_at desc);

alter table public.admin_edit_log enable row level security;

create policy admin_edit_log_admin_only
  on public.admin_edit_log for all
  using (public.is_admin())
  with check (public.is_admin());
