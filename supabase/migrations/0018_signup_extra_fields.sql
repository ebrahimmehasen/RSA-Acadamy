-- ============================================================
-- RSA Academy — 0018 Extra profile fields for signup review
-- Per planning docs (RSA_ACADEMY_COMPLETE_BLUEPRINT_FINAL_V2.md
-- "معلومات الحساب" sections) + explicit follow-up request: teacher CV
-- upload (stored on Drive, referenced by id here) and richer student/
-- parent signup data.
-- ============================================================

alter table public.students add column if not exists date_of_birth date;
alter table public.parents add column if not exists address text;
alter table public.teachers add column if not exists cv_drive_id text;
