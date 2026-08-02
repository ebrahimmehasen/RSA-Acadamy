-- ============================================================
-- RSA Academy — 0011 Column-level lockdown for quiz answers
--
-- Bug found in security review: quiz_questions RLS only restricts
-- ROWS (published + student's own class), not COLUMNS — so any
-- student could call the Supabase REST API directly (bypassing our
-- Next.js UI entirely, e.g. from the browser console with their own
-- session) and `select('*')` a live quiz's correct_answer straight
-- out of the database. RLS row-policies cannot fix this; only a
-- column-level REVOKE can. app code that legitimately needs
-- correct_answer (teacher's own quiz editor, post-completion results
-- review) now reads it through the service-role admin client after
-- validating ownership in application code — see
-- app/(teacher)/teacher/quizzes/[id]/page.tsx and
-- app/(student)/student/quizzes/[id]/results/page.tsx.
-- ============================================================

revoke select (correct_answer, explanation) on public.quiz_questions
  from authenticated, anon;
