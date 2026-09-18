-- ============================================================
-- RSA Academy — 0030 Multi-file student answers (up to 5GB)
-- 1) A student's answer can hold several files (camera photos, PDFs…):
--    assignment_submissions.files = [{"id": <drive file id>, "name": ...}].
--    file_drive_id / file_name keep mirroring the FIRST file so every
--    existing reader (and the "file or text" check) keeps working.
-- 2) file_storage.file_size was a 32-bit integer (max ~2.1GB) — widened
--    to bigint so a single file / total up to 5GB can be recorded.
-- Purely additive: no row is deleted or rewritten except the backfill of
-- the new column from the existing single file.
-- ============================================================

alter table public.assignment_submissions
  add column if not exists files jsonb not null default '[]'::jsonb;

update public.assignment_submissions
set files = jsonb_build_array(
  jsonb_build_object('id', file_drive_id, 'name', coalesce(file_name, 'ملف'))
)
where file_drive_id is not null
  and files = '[]'::jsonb;

alter table public.file_storage
  alter column file_size type bigint;
