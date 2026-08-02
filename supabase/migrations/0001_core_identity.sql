-- ============================================================
-- RSA Academy — 0001 Core Identity
-- profiles / classes / students / parents / teachers + RLS
--
-- Convention (resolves the docs' undefined "users" table):
-- every app-level FK points to profiles(id) (integer).
-- profiles.user_id is the UUID bridge to Supabase auth.users.
-- ============================================================

-- ---------- shared trigger: keep updated_at fresh ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id integer generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'parent', 'teacher', 'admin')),
  full_name text not null,
  phone text,
  profile_picture_url text,
  profile_picture_drive_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- role is immutable except through the service role (admin dashboard)
create or replace function public.forbid_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger tr_profiles_role_immutable
  before update on public.profiles
  for each row
  when (current_setting('role', true) <> 'service_role')
  execute function public.forbid_role_change();

-- ---------- RLS helper functions ----------
-- SECURITY DEFINER so policies can consult profiles without recursing
create or replace function public.current_profile_id()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.current_role_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_role_name() = 'admin', false);
$$;

-- ---------- profiles RLS ----------
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  using (user_id = auth.uid());

create policy profiles_select_admin
  on public.profiles for select
  using (public.is_admin());

create policy profiles_update_own
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- inserts/deletes go through the service role only (no policy needed)

-- ============================================================
-- classes  (18 grade levels: KG1..SR3_ARTS)
-- ============================================================
create table if not exists public.classes (
  id integer generated always as identity primary key,
  class_name text not null unique,
  class_short text not null unique,
  class_level text,          -- Pre-Primary / Primary / Preparatory / Secondary
  class_type text,           -- Normal / Science / Math / Arts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_classes_touch
  before update on public.classes
  for each row execute function public.touch_updated_at();

alter table public.classes enable row level security;

create policy classes_select_authenticated
  on public.classes for select
  using (auth.uid() is not null);

create policy classes_write_admin
  on public.classes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- students
-- ============================================================
create table if not exists public.students (
  user_id integer primary key references public.profiles (id) on delete cascade,
  student_code char(6) not null unique check (student_code ~ '^[0-9]{6}$'),
  parent_id integer references public.profiles (id) on delete set null,
  class_id integer references public.classes (id),
  branch text check (branch in ('Arabic', 'Languages')),
  enrollment_date timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_parent on public.students (parent_id);
create index if not exists idx_students_class on public.students (class_id);
create index if not exists idx_students_code on public.students (student_code);

create trigger tr_students_touch
  before update on public.students
  for each row execute function public.touch_updated_at();

alter table public.students enable row level security;

create policy students_select_own
  on public.students for select
  using (user_id = public.current_profile_id());

create policy students_select_parent
  on public.students for select
  using (parent_id = public.current_profile_id());

create policy students_select_teacher
  on public.students for select
  using (public.current_role_name() = 'teacher');

create policy students_select_admin
  on public.students for select
  using (public.is_admin());

create policy students_write_admin
  on public.students for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- parents
-- ============================================================
create table if not exists public.parents (
  user_id integer primary key references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.parents enable row level security;

create policy parents_select_own
  on public.parents for select
  using (user_id = public.current_profile_id());

create policy parents_select_admin
  on public.parents for select
  using (public.is_admin());

create policy parents_write_admin
  on public.parents for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- teachers
-- ============================================================
create table if not exists public.teachers (
  user_id integer primary key references public.profiles (id) on delete cascade,
  specialization text,
  qualification text,
  hiring_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;

create policy teachers_select_authenticated
  on public.teachers for select
  using (auth.uid() is not null);

create policy teachers_write_admin
  on public.teachers for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- seed: the 18 grade levels (from subjects_database_setup.sql)
-- ============================================================
insert into public.classes (class_name, class_short, class_level, class_type) values
  ('KG1', 'KG1', 'Pre-Primary', 'Normal'),
  ('KG2', 'KG2', 'Pre-Primary', 'Normal'),
  ('الأول الابتدائي', 'G1', 'Primary', 'Normal'),
  ('الثاني الابتدائي', 'G2', 'Primary', 'Normal'),
  ('الثالث الابتدائي', 'G3', 'Primary', 'Normal'),
  ('الرابع الابتدائي', 'G4', 'Primary', 'Normal'),
  ('الخامس الابتدائي', 'G5', 'Primary', 'Normal'),
  ('السادس الابتدائي', 'G6', 'Primary', 'Normal'),
  ('الأول الإعدادي', 'JR1', 'Preparatory', 'Normal'),
  ('الثاني الإعدادي', 'JR2', 'Preparatory', 'Normal'),
  ('الثالث الإعدادي', 'JR3', 'Preparatory', 'Normal'),
  ('الأول الثانوي', 'SR1', 'Secondary', 'Normal'),
  ('الثاني الثانوي (علمي علوم)', 'SR2_SCIENCE', 'Secondary', 'Science'),
  ('الثاني الثانوي (علمي رياضة)', 'SR2_MATH', 'Secondary', 'Math'),
  ('الثاني الثانوي (أدبي)', 'SR2_ARTS', 'Secondary', 'Arts'),
  ('الثالث الثانوي (علمي علوم)', 'SR3_SCIENCE', 'Secondary', 'Science'),
  ('الثالث الثانوي (علمي رياضة)', 'SR3_MATH', 'Secondary', 'Math'),
  ('الثالث الثانوي (أدبي)', 'SR3_ARTS', 'Secondary', 'Arts')
on conflict (class_short) do nothing;
