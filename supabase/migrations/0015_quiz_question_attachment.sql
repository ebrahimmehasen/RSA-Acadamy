-- ============================================================
-- RSA Academy — 0015 Quiz question attachments
-- lib/googleDrive/upload.ts already had uploadQuizAttachment() with
-- zero call sites — no column existed to store the result against.
-- ============================================================

alter table public.quiz_questions add column if not exists attachment_drive_id text;
