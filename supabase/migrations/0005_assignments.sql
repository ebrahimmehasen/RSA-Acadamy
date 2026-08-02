-- ============================================================
-- RSA Academy — 0005 Assignments & Submissions
-- Decisions: #5 all file types ≤25MB, #6 teacher chooses file/text,
-- #7 late allowed but flagged, #8 numeric 0–100 grades.
-- ============================================================

create table if not exists public.assignments (
  id integer generated always as identity primary key,
  teacher_id integer not null references public.teachers (user_id) on delete cascade,
  class_id integer not null references public.classes (id) on delete cascade,
  subject_id text not null references public.subjects (subject_id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  due_date timestamptz not null,
  max_grade integer not null default 100 check (max_grade between 1 and 100),
  allow_file boolean not null default true,
  allow_text boolean not null default true,
  attachment_drive_ids jsonb not null default '[]'::jsonb,  -- max 3 (decision #18)
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allow_file or allow_text)
);

create index if not exists idx_assignments_class
  on public.assignments (class_id, subject_id);
create index if not exists idx_assignments_teacher
  on public.assignments (teacher_id);

create trigger tr_assignments_touch
  before update on public.assignments
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.assignment_submissions (
  id integer generated always as identity primary key,
  assignment_id integer not null references public.assignments (id) on delete cascade,
  student_id integer not null references public.students (user_id) on delete cascade,
  file_drive_id text,
  file_name text,
  text_answer text,
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  is_late boolean not null default false,
  grade integer check (grade >= 0),
  teacher_notes text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (assignment_id, student_id),
  check (file_drive_id is not null or text_answer is not null)
);

create index if not exists idx_submissions_assignment
  on public.assignment_submissions (assignment_id);
create index if not exists idx_submissions_student
  on public.assignment_submissions (student_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.assignments enable row level security;

-- students see published assignments for their class (their subjects)
create policy assignments_select_student
  on public.assignments for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = assignments.class_id
    )
  );

create policy assignments_select_parent
  on public.assignments for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = assignments.class_id
    )
  );

create policy assignments_select_teacher_own
  on public.assignments for select
  using (teacher_id = public.current_profile_id());

create policy assignments_select_admin
  on public.assignments for select
  using (public.is_admin());

create policy assignments_write_teacher_own
  on public.assignments for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy assignments_write_admin
  on public.assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.assignment_submissions enable row level security;

create policy submissions_select_own
  on public.assignment_submissions for select
  using (student_id = public.current_profile_id());

-- student submits/edits own work while not graded yet
create policy submissions_insert_own
  on public.assignment_submissions for insert
  with check (student_id = public.current_profile_id());

create policy submissions_update_own_ungraded
  on public.assignment_submissions for update
  using (student_id = public.current_profile_id() and status = 'submitted')
  with check (student_id = public.current_profile_id());

create policy submissions_select_parent
  on public.assignment_submissions for select
  using (
    exists (
      select 1 from public.students st
      where st.user_id = assignment_submissions.student_id
        and st.parent_id = public.current_profile_id()
    )
  );

-- the assignment's teacher reads and grades
create policy submissions_select_teacher
  on public.assignment_submissions for select
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.teacher_id = public.current_profile_id()
    )
  );

create policy submissions_update_teacher
  on public.assignment_submissions for update
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.teacher_id = public.current_profile_id()
    )
  );

create policy submissions_all_admin
  on public.assignment_submissions for all
  using (public.is_admin())
  with check (public.is_admin());
