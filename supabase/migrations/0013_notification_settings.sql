-- ============================================================
-- RSA Academy — 0013 Notification preferences
-- Decisions #20 (admin-configurable session-reminder minutes),
-- #21 (parent notifications: important-only by default).
-- ============================================================

create table if not exists public.notification_settings (
  id integer generated always as identity primary key,
  profile_id integer not null unique references public.profiles (id) on delete cascade,
  class_reminder_enabled boolean not null default true,
  class_reminder_minutes integer not null default 15 check (class_reminder_minutes in (5, 10, 15, 30)),
  assignment_notification boolean not null default true,
  payment_notification boolean not null default true,
  -- decision #21: secondary/non-critical notifications default OFF for
  -- parents specifically; students/teachers/admin default ON since
  -- everything they get is already important-only by nature of what
  -- triggers it (grades, payments, salary — no "general news" channel
  -- exists to separate out for them).
  parent_secondary_notifications boolean not null default false,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_notification_settings_touch
  before update on public.notification_settings
  for each row execute function public.touch_updated_at();

alter table public.notification_settings enable row level security;

create policy notification_settings_own
  on public.notification_settings for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy notification_settings_select_admin
  on public.notification_settings for select
  using (public.is_admin());

-- default row is created lazily on first settings-page visit or first
-- notification send (see lib/notifications/create.ts), not here.
