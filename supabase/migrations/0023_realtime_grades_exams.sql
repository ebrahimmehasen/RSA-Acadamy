-- ============================================================
-- RSA Academy — 0023 Realtime for grades & exams
-- notifications was already realtime (0009). Adding the tables whose
-- changes should reach an open page instantly: assignment/quiz
-- submissions (grades) and quizzes (publish/edit/reschedule).
-- ============================================================

alter publication supabase_realtime add table public.assignment_submissions;
alter publication supabase_realtime add table public.quiz_submissions;
alter publication supabase_realtime add table public.quizzes;
alter publication supabase_realtime add table public.assignments;
