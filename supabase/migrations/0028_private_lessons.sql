-- ============================================================
-- RSA Academy — 0028 Private-lesson students
-- A student whose branch is 'Private' skips class-wide subject
-- auto-enrollment (lib/users.ts createStudent) and the shared class
-- schedule — the admin builds both individually via
-- class_assignments.student_id, a slot scoped to exactly one student
-- instead of the whole class+branch.
-- ============================================================

alter table public.students drop constraint if exists students_branch_check;
alter table public.students
  add constraint students_branch_check check (branch in ('Arabic', 'Languages', 'Private'));

alter table public.class_assignments
  add column if not exists student_id integer references public.students (user_id) on delete cascade;

create index if not exists idx_class_assignments_student
  on public.class_assignments (student_id);

-- ---------- RLS: a private slot (student_id set) is visible only to
-- that student and their parent. A shared slot (student_id null) keeps
-- the existing class-wide visibility, EXCEPT for a 'Private' branch
-- student/child — they never see the class's shared timetable, only
-- their own private slots. Branch filtering within the shared case
-- (Arabic vs Languages) stays an application-level concern
-- (subjects.branch has no counterpart column on class_assignments).
drop policy if exists class_assignments_select_student on public.class_assignments;
create policy class_assignments_select_student
  on public.class_assignments for select
  using (
    (
      student_id is null
      and exists (
        select 1 from public.students st
        where st.user_id = public.current_profile_id()
          and st.class_id = class_assignments.class_id
          and (st.branch is null or st.branch <> 'Private')
      )
    )
    or student_id = public.current_profile_id()
  );

drop policy if exists class_assignments_select_parent on public.class_assignments;
create policy class_assignments_select_parent
  on public.class_assignments for select
  using (
    (
      student_id is null
      and exists (
        select 1 from public.students st
        where st.parent_id = public.current_profile_id()
          and st.class_id = class_assignments.class_id
          and (st.branch is null or st.branch <> 'Private')
      )
    )
    or exists (
      select 1 from public.students st
      where st.user_id = class_assignments.student_id
        and st.parent_id = public.current_profile_id()
    )
  );
