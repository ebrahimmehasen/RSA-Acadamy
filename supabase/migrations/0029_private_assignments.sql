-- ============================================================
-- RSA Academy — 0029 Private-student assignments
-- A 'Private' student has an academic context of their own (see 0028:
-- private slots via class_assignments.student_id) and must never receive
-- the class-wide assignments of the grade/class they were filed under.
-- Mirror the 0028 pattern: assignments.student_id = an assignment scoped
-- to exactly one (Private) student; null = a normal class assignment,
-- exactly like every row that exists today (nothing is rewritten).
-- ============================================================

alter table public.assignments
  add column if not exists student_id integer
    references public.students (user_id) on delete cascade;

-- a private assignment targets one student, never a class branch
alter table public.assignments
  drop constraint if exists assignments_private_no_branch;
alter table public.assignments
  add constraint assignments_private_no_branch
  check (student_id is null or branch is null);

create index if not exists idx_assignments_student
  on public.assignments (student_id);

-- ---------- RLS ----------
-- Normal (student_id null) assignments: class + branch match, and NEVER
-- for a 'Private' student. Private assignments: only that student.
drop policy if exists assignments_select_student on public.assignments;
create policy assignments_select_student
  on public.assignments for select
  using (
    is_published and (
      (
        student_id is null
        and exists (
          select 1 from public.students st
          where st.user_id = public.current_profile_id()
            and st.class_id = assignments.class_id
            and st.branch is distinct from 'Private'
            and (assignments.branch is null or assignments.branch = st.branch)
        )
      )
      or student_id = public.current_profile_id()
    )
  );

drop policy if exists assignments_select_parent on public.assignments;
create policy assignments_select_parent
  on public.assignments for select
  using (
    is_published and (
      (
        student_id is null
        and exists (
          select 1 from public.students st
          where st.parent_id = public.current_profile_id()
            and st.class_id = assignments.class_id
            and st.branch is distinct from 'Private'
            and (assignments.branch is null or assignments.branch = st.branch)
        )
      )
      or exists (
        select 1 from public.students st
        where st.user_id = assignments.student_id
          and st.parent_id = public.current_profile_id()
      )
    )
  );
