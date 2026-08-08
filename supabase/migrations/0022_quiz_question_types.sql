-- ============================================================
-- RSA Academy — 0022 Google-Forms-style quiz question types
-- Adds "checkboxes" (multi-select, auto-graded as an exact set
-- match) and "dropdown" (single-select via <select>, graded like
-- multiple_choice) alongside the existing four question types.
-- ============================================================

alter table public.quiz_questions
  drop constraint quiz_questions_question_type_check;

alter table public.quiz_questions
  add constraint quiz_questions_question_type_check
  check (question_type in
    ('multiple_choice', 'short_answer', 'true_false', 'essay', 'checkboxes', 'dropdown'));
