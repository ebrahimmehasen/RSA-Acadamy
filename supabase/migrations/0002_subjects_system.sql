-- ============================================================
-- RSA Academy — 0002 Subjects System
-- subjects / student_subjects / subject_enrollment_log
-- Ported from subjects_database_setup.sql (SQLite → Postgres).
-- Soft-delete pattern + audit-log triggers.
-- Note (decision #9): students cannot remove their own subjects;
-- enrollment is auto-assigned by class+branch and managed by admin.
-- ============================================================

create table if not exists public.subjects (
  id integer generated always as identity primary key,
  subject_id text not null unique,        -- e.g. G1_AR_MATH_AR
  subject_name text not null,             -- e.g. الرياضيات
  class_id integer not null references public.classes (id) on delete cascade,
  branch text not null check (branch in ('Arabic', 'Languages')),
  subject_code text not null,             -- e.g. MATH_AR
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_class_id on public.subjects (class_id);
create index if not exists idx_subjects_branch on public.subjects (branch);
create index if not exists idx_subjects_subject_id on public.subjects (subject_id);

create trigger tr_subjects_touch
  before update on public.subjects
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.student_subjects (
  id integer generated always as identity primary key,
  student_id integer not null references public.students (user_id) on delete cascade,
  subject_id text not null references public.subjects (subject_id) on delete cascade,
  is_active boolean not null default true,
  enrollment_date timestamptz not null default now(),
  deleted_at timestamptz,
  unique (student_id, subject_id)
);

create index if not exists idx_student_subjects_student
  on public.student_subjects (student_id);
create index if not exists idx_student_subjects_subject
  on public.student_subjects (subject_id);
create index if not exists idx_student_subjects_active
  on public.student_subjects (student_id, is_active);

-- ============================================================
create table if not exists public.subject_enrollment_log (
  id integer generated always as identity primary key,
  student_id integer not null references public.students (user_id) on delete cascade,
  subject_id text not null,
  action text not null check (action in ('enrolled', 'removed', 'restored')),
  action_date timestamptz not null default now(),
  reason text,
  admin_id integer references public.profiles (id) on delete set null
);

create index if not exists idx_enrollment_log_student
  on public.subject_enrollment_log (student_id);
create index if not exists idx_enrollment_log_subject
  on public.subject_enrollment_log (subject_id);

-- ============================================================
-- audit triggers
-- ============================================================
create or replace function public.log_subject_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.subject_enrollment_log (student_id, subject_id, action, reason)
    values (new.student_id, new.subject_id, 'enrolled', 'Auto enrollment');
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_active and not new.is_active then
      insert into public.subject_enrollment_log (student_id, subject_id, action, reason)
      values (new.student_id, new.subject_id, 'removed', 'Removed by admin');
    elsif not old.is_active and new.is_active then
      insert into public.subject_enrollment_log (student_id, subject_id, action, reason)
      values (new.student_id, new.subject_id, 'restored', 'Restored by admin');
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger tr_student_subjects_log
  after insert or update on public.student_subjects
  for each row execute function public.log_subject_enrollment();

-- ============================================================
-- auto-enroll helper: assigns all active subjects matching the
-- student's class+branch (called from app code after admin creates
-- or re-classes a student)
-- ============================================================
create or replace function public.enroll_student_in_class_subjects(p_student_id integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.student_subjects (student_id, subject_id)
  select p_student_id, s.subject_id
  from public.students st
  join public.subjects s
    on s.class_id = st.class_id
   and s.branch = st.branch
   and s.is_active
  where st.user_id = p_student_id
  on conflict (student_id, subject_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.subjects enable row level security;

create policy subjects_select_authenticated
  on public.subjects for select
  using (auth.uid() is not null);

create policy subjects_write_admin
  on public.subjects for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.student_subjects enable row level security;

create policy student_subjects_select_own
  on public.student_subjects for select
  using (student_id = public.current_profile_id());

create policy student_subjects_select_parent
  on public.student_subjects for select
  using (
    exists (
      select 1 from public.students st
      where st.user_id = student_subjects.student_id
        and st.parent_id = public.current_profile_id()
    )
  );

create policy student_subjects_select_teacher
  on public.student_subjects for select
  using (public.current_role_name() = 'teacher');

create policy student_subjects_select_admin
  on public.student_subjects for select
  using (public.is_admin());

create policy student_subjects_write_admin
  on public.student_subjects for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.subject_enrollment_log enable row level security;

create policy enrollment_log_select_admin
  on public.subject_enrollment_log for select
  using (public.is_admin());
