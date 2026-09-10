-- ============================================================
-- RSA Academy — 0027 Assignment branch targeting
-- Lets a teacher restrict a homework to one branch of a class (e.g.
-- the Arabic teacher only wants the Arabic-branch half of a shared
-- primary-grade class to get a particular assignment). null = the
-- whole class, same as every assignment before this migration.
-- ============================================================

alter table public.assignments
  add column if not exists branch text check (branch in ('Arabic', 'Languages'));

drop policy if exists assignments_select_student on public.assignments;
create policy assignments_select_student
  on public.assignments for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = assignments.class_id
        and (assignments.branch is null or assignments.branch = st.branch)
    )
  );

drop policy if exists assignments_select_parent on public.assignments;
create policy assignments_select_parent
  on public.assignments for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = assignments.class_id
        and (assignments.branch is null or assignments.branch = st.branch)
    )
  );
