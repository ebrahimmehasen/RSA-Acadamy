-- ============================================================
-- RSA Academy — 0009 Notifications & Announcements
-- Real-time notifications via Supabase Realtime (decision #19).
-- Retention: 3 days only (decision #22) — cleanup left as a manual
-- `delete from notifications where created_at < now() - interval '3 days'`
-- run via pg_cron/external scheduler in a later ops pass, not wired here.
-- ============================================================

create table if not exists public.notifications (
  id integer generated always as identity primary key,
  profile_id integer not null references public.profiles (id) on delete cascade,
  type text not null check (type in
    ('assignment', 'grade', 'payment', 'schedule', 'quiz', 'session', 'announcement', 'salary')),
  title text not null,
  message text not null,
  related_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_profile
  on public.notifications (profile_id, is_read, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications for select
  using (profile_id = public.current_profile_id());

create policy notifications_update_own
  on public.notifications for update
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy notifications_delete_own
  on public.notifications for delete
  using (profile_id = public.current_profile_id());

create policy notifications_all_admin
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- enable realtime for live notification delivery
alter publication supabase_realtime add table public.notifications;

-- ============================================================
create table if not exists public.announcements (
  id integer generated always as identity primary key,
  admin_id integer references public.profiles (id) on delete set null,
  title_ar text not null,
  title_en text,
  content_ar text not null,
  content_en text,
  language_priority text not null default 'ar' check (language_priority in ('ar', 'en')),
  target_type text not null default 'all'
    check (target_type in ('all', 'role', 'class', 'branch', 'student')),
  target_role text check (target_role in ('student', 'parent', 'teacher', 'admin')),
  target_class_id integer references public.classes (id) on delete cascade,
  target_branch text check (target_branch in ('Arabic', 'Languages')),
  target_student_id integer references public.students (user_id) on delete cascade,
  attachment_drive_ids jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_announcements_published
  on public.announcements (published_at desc);

alter table public.announcements enable row level security;

-- any authenticated user can read announcements; the app filters by
-- target relevance for the current viewer (not sensitive content in
-- this single-school app, so DB-level filtering isn't required)
create policy announcements_select_authenticated
  on public.announcements for select
  using (auth.uid() is not null);

create policy announcements_all_admin
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());
