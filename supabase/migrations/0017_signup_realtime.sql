-- ============================================================
-- RSA Academy — 0017 Self-signup: enable Realtime on role tables
-- Needed so a pending account's screen unlocks live the instant an
-- admin flips is_active, without the user refreshing or re-logging in.
-- ============================================================

alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.teachers;
alter publication supabase_realtime add table public.parents;
