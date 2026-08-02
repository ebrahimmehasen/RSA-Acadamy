-- ============================================================
-- RSA Academy — 0007 Quizzes & Recorded Sessions
-- Superset DDL from UPDATES_AND_ADDITIONS.md, FKs retargeted to
-- profiles/students/teachers/classes/subjects. video_path/video_url
-- repurposed to store the Google Drive file id (see lib/googleDrive).
-- ============================================================

create table if not exists public.quizzes (
  id integer generated always as identity primary key,
  class_id integer not null references public.classes (id) on delete cascade,
  subject_id text not null references public.subjects (subject_id) on delete cascade,
  teacher_id integer not null references public.teachers (user_id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  total_points integer not null default 100 check (total_points > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  shuffle_questions boolean not null default false,
  show_answers_on_completion boolean not null default true,
  allow_review boolean not null default true,
  is_password_protected boolean not null default false,
  quiz_password text,
  quiz_type text not null default 'standalone' check (quiz_type in ('standalone', 'embedded')),
  assignment_id integer references public.assignments (id) on delete set null,
  is_published boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quizzes_class on public.quizzes (class_id, subject_id);
create index if not exists idx_quizzes_teacher on public.quizzes (teacher_id);

create trigger tr_quizzes_touch
  before update on public.quizzes
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.quiz_questions (
  id integer generated always as identity primary key,
  quiz_id integer not null references public.quizzes (id) on delete cascade,
  question_order integer not null default 1,
  question_text text not null,
  question_type text not null
    check (question_type in ('multiple_choice', 'short_answer', 'true_false', 'essay')),
  points integer not null default 1 check (points > 0),
  options jsonb,                          -- {"A":"...", "B":"...", ...}
  correct_answer text,                    -- required for auto-graded types
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_quiz on public.quiz_questions (quiz_id, question_order);

create trigger tr_quiz_questions_touch
  before update on public.quiz_questions
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.quiz_submissions (
  id integer generated always as identity primary key,
  quiz_id integer not null references public.quizzes (id) on delete cascade,
  student_id integer not null references public.students (user_id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_score integer,
  max_score integer not null,
  percentage numeric(5, 2),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'graded')),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create index if not exists idx_quiz_submissions_quiz on public.quiz_submissions (quiz_id);
create index if not exists idx_quiz_submissions_student on public.quiz_submissions (student_id);

-- ============================================================
create table if not exists public.quiz_question_answers (
  id integer generated always as identity primary key,
  submission_id integer not null references public.quiz_submissions (id) on delete cascade,
  question_id integer not null references public.quiz_questions (id) on delete cascade,
  student_answer text,
  is_correct boolean,
  points_awarded integer,
  answered_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

create index if not exists idx_quiz_answers_submission
  on public.quiz_question_answers (submission_id);

-- ============================================================
create table if not exists public.recorded_sessions (
  id integer generated always as identity primary key,
  class_id integer not null references public.classes (id) on delete cascade,
  subject_id text not null references public.subjects (subject_id) on delete cascade,
  teacher_id integer references public.teachers (user_id) on delete set null,
  uploaded_by integer references public.profiles (id) on delete set null,
  title text not null,
  description text,
  video_drive_id text not null,          -- Google Drive fileId
  video_duration integer,                 -- seconds
  video_size integer,                     -- bytes
  session_date date not null default current_date,
  session_topic text,
  is_published boolean not null default true,
  is_archived boolean not null default false,
  view_count integer not null default 0,
  total_rating numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  is_public boolean not null default true, -- false → gated by accessible_to_students
  accessible_to_students jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_class on public.recorded_sessions (class_id, subject_id);

create trigger tr_recorded_sessions_touch
  before update on public.recorded_sessions
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.session_views (
  id integer generated always as identity primary key,
  session_id integer not null references public.recorded_sessions (id) on delete cascade,
  student_id integer not null references public.students (user_id) on delete cascade,
  watched_at timestamptz not null default now(),
  watch_duration integer not null default 0,
  watch_percentage numeric(5, 2) not null default 0,
  unique (session_id, student_id)
);

-- ============================================================
create table if not exists public.session_ratings (
  id integer generated always as identity primary key,
  session_id integer not null references public.recorded_sessions (id) on delete cascade,
  student_id integer not null references public.students (user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create trigger tr_session_ratings_touch
  before update on public.session_ratings
  for each row execute function public.touch_updated_at();

-- keep recorded_sessions.total_rating/rating_count in sync
create or replace function public.refresh_session_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id integer := coalesce(new.session_id, old.session_id);
begin
  update public.recorded_sessions rs
  set total_rating = coalesce((
        select round(avg(rating)::numeric, 2)
        from public.session_ratings
        where session_id = v_session_id
      ), 0),
      rating_count = (
        select count(*) from public.session_ratings where session_id = v_session_id
      )
  where rs.id = v_session_id;
  return null;
end;
$$;

create trigger tr_session_ratings_refresh
  after insert or update or delete on public.session_ratings
  for each row execute function public.refresh_session_rating();

-- ============================================================
-- RLS
-- ============================================================
alter table public.quizzes enable row level security;

create policy quizzes_select_student
  on public.quizzes for select
  using (
    is_published and not is_archived and exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = quizzes.class_id
    )
  );

create policy quizzes_select_parent
  on public.quizzes for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = quizzes.class_id
    )
  );

create policy quizzes_all_teacher_own
  on public.quizzes for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy quizzes_all_admin
  on public.quizzes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.quiz_questions enable row level security;

-- students only see questions of a quiz they've started (via join),
-- and never the correct_answer/explanation columns are filtered at
-- the app layer for in-progress attempts — DB-level RLS grants row
-- visibility, the app strips answer fields before rendering.
create policy quiz_questions_select_student
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      join public.students st on st.user_id = public.current_profile_id()
      where q.id = quiz_questions.quiz_id
        and q.class_id = st.class_id
        and q.is_published
    )
  );

create policy quiz_questions_all_teacher
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.teacher_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.teacher_id = public.current_profile_id()
    )
  );

create policy quiz_questions_all_admin
  on public.quiz_questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.quiz_submissions enable row level security;

create policy quiz_submissions_own
  on public.quiz_submissions for all
  using (student_id = public.current_profile_id())
  with check (student_id = public.current_profile_id());

create policy quiz_submissions_select_teacher
  on public.quiz_submissions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_submissions.quiz_id
        and q.teacher_id = public.current_profile_id()
    )
  );

create policy quiz_submissions_all_admin
  on public.quiz_submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.quiz_question_answers enable row level security;

create policy quiz_answers_own
  on public.quiz_question_answers for all
  using (
    exists (
      select 1 from public.quiz_submissions s
      where s.id = quiz_question_answers.submission_id
        and s.student_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.quiz_submissions s
      where s.id = quiz_question_answers.submission_id
        and s.student_id = public.current_profile_id()
    )
  );

create policy quiz_answers_select_teacher
  on public.quiz_question_answers for select
  using (
    exists (
      select 1 from public.quiz_submissions s
      join public.quizzes q on q.id = s.quiz_id
      where s.id = quiz_question_answers.submission_id
        and q.teacher_id = public.current_profile_id()
    )
  );

create policy quiz_answers_all_admin
  on public.quiz_question_answers for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.recorded_sessions enable row level security;

create policy sessions_select_student
  on public.recorded_sessions for select
  using (
    is_published and not is_archived and exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = recorded_sessions.class_id
    ) and (
      is_public or
      accessible_to_students @> to_jsonb(public.current_profile_id())
    )
  );

create policy sessions_select_parent
  on public.recorded_sessions for select
  using (
    is_published and exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = recorded_sessions.class_id
    )
  );

create policy sessions_all_teacher_own
  on public.recorded_sessions for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy sessions_all_admin
  on public.recorded_sessions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.session_views enable row level security;

create policy session_views_own
  on public.session_views for all
  using (student_id = public.current_profile_id())
  with check (student_id = public.current_profile_id());

create policy session_views_select_admin
  on public.session_views for select
  using (public.is_admin());

-- ============================================================
alter table public.session_ratings enable row level security;

create policy session_ratings_select_all
  on public.session_ratings for select
  using (auth.uid() is not null);

create policy session_ratings_write_own
  on public.session_ratings for insert
  with check (student_id = public.current_profile_id());

create policy session_ratings_update_own
  on public.session_ratings for update
  using (student_id = public.current_profile_id())
  with check (student_id = public.current_profile_id());
