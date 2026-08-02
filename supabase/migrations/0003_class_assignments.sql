-- ============================================================
-- RSA Academy — 0003 Class Assignments (weekly schedule)
-- One row = one weekly slot: class + subject + teacher + day/time.
-- Zoom is manual copy-paste by admin (no Zoom API) — resolves the
-- docs gap where zoom CRUD endpoints existed but no storage column.
-- ============================================================

create table if not exists public.class_assignments (
  id integer generated always as identity primary key,
  class_id integer not null references public.classes (id) on delete cascade,
  subject_id text not null references public.subjects (subject_id) on delete cascade,
  teacher_id integer references public.teachers (user_id) on delete set null,
  day_of_week text not null check (day_of_week in
    ('saturday','sunday','monday','tuesday','wednesday','thursday','friday')),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  zoom_link text,
  zoom_meeting_id text,
  zoom_passcode text,
  is_active boolean not null default true,
  assigned_by integer references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_assignments_class
  on public.class_assignments (class_id, day_of_week);
create index if not exists idx_class_assignments_teacher
  on public.class_assignments (teacher_id, day_of_week);

create trigger tr_class_assignments_touch
  before update on public.class_assignments
  for each row execute function public.touch_updated_at();

-- ---------- audit log ----------
create table if not exists public.class_assignment_log (
  id integer generated always as identity primary key,
  assignment_id integer,
  action text not null check (action in ('created', 'updated', 'deleted')),
  changed_by integer references public.profiles (id) on delete set null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.log_class_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.class_assignment_log (assignment_id, action, changed_by, snapshot)
    values (new.id, 'created', new.assigned_by, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.class_assignment_log (assignment_id, action, changed_by, snapshot)
    values (new.id, 'updated', new.assigned_by, to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.class_assignment_log (assignment_id, action, snapshot)
    values (old.id, 'deleted', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger tr_class_assignments_log
  after insert or update or delete on public.class_assignments
  for each row execute function public.log_class_assignment_change();

-- ---------- RLS ----------
alter table public.class_assignments enable row level security;

-- students see their own class's slots
create policy class_assignments_select_student
  on public.class_assignments for select
  using (
    exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = class_assignments.class_id
    )
  );

-- parents see slots of their children's classes
create policy class_assignments_select_parent
  on public.class_assignments for select
  using (
    exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = class_assignments.class_id
    )
  );

-- teachers see their own slots
create policy class_assignments_select_teacher
  on public.class_assignments for select
  using (teacher_id = public.current_profile_id());

create policy class_assignments_select_admin
  on public.class_assignments for select
  using (public.is_admin());

create policy class_assignments_write_admin
  on public.class_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.class_assignment_log enable row level security;

create policy class_assignment_log_select_admin
  on public.class_assignment_log for select
  using (public.is_admin());
