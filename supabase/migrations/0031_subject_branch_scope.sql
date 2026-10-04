-- ============================================================
-- RSA Academy — 0031 Subject branch scope
-- Which student branches study a subject row, chosen by the admin:
--   'Arabic' | 'Languages' | 'Both'
-- Replaces the hard-coded "shared subjects" list (lib/subjects.ts).
-- A subject row still belongs to one branch (subjects.branch, part of its
-- subject_id); branch_scope says who is enrolled in it. 'Both' = one copy
-- for the whole class — the same subject's row for the other branch
-- ("twin") is switched off and its students moved over (grades on the
-- twin are kept, nothing is deleted).
-- Existing rows keep today's behaviour: scope = their own branch.
-- ============================================================

alter table public.subjects add column if not exists branch_scope text;
update public.subjects set branch_scope = branch where branch_scope is null;

-- inserts that don't say (seed scripts, older code) default to their own branch
create or replace function public.subjects_default_branch_scope()
returns trigger
language plpgsql
as $$
begin
  if new.branch_scope is null then
    new.branch_scope := new.branch;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_subjects_default_scope on public.subjects;
create trigger tr_subjects_default_scope
  before insert on public.subjects
  for each row execute function public.subjects_default_branch_scope();

alter table public.subjects alter column branch_scope set not null;
alter table public.subjects drop constraint if exists subjects_branch_scope_check;
alter table public.subjects add constraint subjects_branch_scope_check
  check (branch_scope in ('Arabic', 'Languages', 'Both'));

-- ------------------------------------------------------------
-- auto-enrollment follows the scope, not the row's own branch
-- ------------------------------------------------------------
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
   and (s.branch_scope = st.branch or s.branch_scope = 'Both')
   and s.is_active
  where st.user_id = p_student_id
  on conflict (student_id, subject_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- change a subject's scope and update students' enrollments at once
-- ------------------------------------------------------------
create or replace function public.set_subject_branch_scope(p_subject_id text, p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.subjects%rowtype;
  twin public.subjects%rowtype;
  old_branches text[];
  new_branches text[];
  b text;
  n integer;
  v_enrolled integer := 0;
  v_removed integer := 0;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  if p_scope not in ('Arabic', 'Languages', 'Both') then
    raise exception 'invalid scope %', p_scope;
  end if;

  select * into s from public.subjects where subject_id = p_subject_id for update;
  if not found then
    raise exception 'subject % not found', p_subject_id;
  end if;
  if s.branch_scope = p_scope then
    return jsonb_build_object('enrolled', 0, 'removed', 0);
  end if;

  old_branches := case s.branch_scope when 'Both' then array['Arabic', 'Languages'] else array[s.branch_scope] end;
  new_branches := case p_scope when 'Both' then array['Arabic', 'Languages'] else array[p_scope] end;

  -- the same subject in the same class, recorded for the other branch
  select * into twin
  from public.subjects
  where class_id = s.class_id
    and subject_name = s.subject_name
    and branch <> s.branch
  order by is_active desc, id
  limit 1;

  update public.subjects set branch_scope = p_scope where subject_id = p_subject_id;

  -- branches that start studying this row
  foreach b in array new_branches loop
    continue when b = any(old_branches);
    if twin.subject_id is not null and twin.branch = b then
      -- take over the twin's students (keeps per-student choices,
      -- e.g. French vs German) and switch the twin off
      insert into public.student_subjects (student_id, subject_id)
      select ss.student_id, s.subject_id
      from public.student_subjects ss
      join public.students st on st.user_id = ss.student_id
      where ss.subject_id = twin.subject_id and ss.is_active and st.branch = b
      on conflict (student_id, subject_id)
        do update set is_active = true, deleted_at = null;
      get diagnostics n = row_count;
      v_enrolled := v_enrolled + n;

      update public.student_subjects ss
      set is_active = false
      from public.students st
      where st.user_id = ss.student_id
        and ss.subject_id = twin.subject_id and ss.is_active and st.branch = b;

      update public.subjects set is_active = false where subject_id = twin.subject_id;
    else
      insert into public.student_subjects (student_id, subject_id)
      select st.user_id, s.subject_id
      from public.students st
      where st.class_id = s.class_id and st.branch = b
      on conflict (student_id, subject_id)
        do update set is_active = true, deleted_at = null;
      get diagnostics n = row_count;
      v_enrolled := v_enrolled + n;
    end if;
  end loop;

  -- branches that stop studying this row
  foreach b in array old_branches loop
    continue when b = any(new_branches);
    if twin.subject_id is not null and twin.branch = b then
      -- hand those students back to the twin and switch it on again
      update public.subjects set is_active = true where subject_id = twin.subject_id;
      insert into public.student_subjects (student_id, subject_id)
      select ss.student_id, twin.subject_id
      from public.student_subjects ss
      join public.students st on st.user_id = ss.student_id
      where ss.subject_id = s.subject_id and ss.is_active and st.branch = b
      on conflict (student_id, subject_id)
        do update set is_active = true, deleted_at = null;
    end if;

    update public.student_subjects ss
    set is_active = false
    from public.students st
    where st.user_id = ss.student_id
      and ss.subject_id = s.subject_id and ss.is_active and st.branch = b;
    get diagnostics n = row_count;
    v_removed := v_removed + n;
  end loop;

  return jsonb_build_object('enrolled', v_enrolled, 'removed', v_removed);
end;
$$;

revoke all on function public.set_subject_branch_scope(text, text) from public, anon;
grant execute on function public.set_subject_branch_scope(text, text) to authenticated, service_role;
