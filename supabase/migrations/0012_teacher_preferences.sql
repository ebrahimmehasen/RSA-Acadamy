-- ============================================================
-- RSA Academy — 0012 Teacher preferences & availability
-- ============================================================

create table if not exists public.teacher_preferences (
  id integer generated always as identity primary key,
  teacher_id integer not null unique references public.teachers (user_id) on delete cascade,
  subjects jsonb not null default '[]'::jsonb,   -- e.g. ["MATH_AR","ENGLISH_AR"] subject codes
  classes jsonb not null default '[]'::jsonb,    -- e.g. [1,2,3] class ids
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_teacher_preferences_touch
  before update on public.teacher_preferences
  for each row execute function public.touch_updated_at();

alter table public.teacher_preferences enable row level security;

create policy teacher_preferences_own
  on public.teacher_preferences for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy teacher_preferences_select_admin
  on public.teacher_preferences for select
  using (public.is_admin());

-- ============================================================
create table if not exists public.teacher_availability (
  id integer generated always as identity primary key,
  teacher_id integer not null references public.teachers (user_id) on delete cascade,
  day_of_week text not null check (day_of_week in
    ('saturday','sunday','monday','tuesday','wednesday','thursday','friday')),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (teacher_id, day_of_week, start_time)
);

create index if not exists idx_teacher_availability_teacher
  on public.teacher_availability (teacher_id);

alter table public.teacher_availability enable row level security;

create policy teacher_availability_own
  on public.teacher_availability for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy teacher_availability_select_admin
  on public.teacher_availability for select
  using (public.is_admin());
