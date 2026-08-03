-- ============================================================
-- RSA Academy — 0019 Allow 'teacher_cv' in file_storage.entity_type
-- ============================================================

alter table public.file_storage drop constraint if exists file_storage_entity_type_check;
alter table public.file_storage add constraint file_storage_entity_type_check
  check (entity_type in
    ('profile', 'assignment', 'teacher_attachment', 'payment', 'session', 'quiz', 'announcement', 'teacher_cv', 'other'));
