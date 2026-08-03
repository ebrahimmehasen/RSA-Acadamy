-- ============================================================
-- RSA Academy — 0014 Announcement attachments + read tracking
-- COMPLETE_BLUEPRINT_FINAL.md: file/image/video attachments (already
-- had an attachment_drive_ids column since 0009, never wired to any
-- upload UI) and read-count statistics for admin.
-- ============================================================

alter table public.file_storage drop constraint if exists file_storage_entity_type_check;
alter table public.file_storage add constraint file_storage_entity_type_check
  check (entity_type in
    ('profile', 'assignment', 'teacher_attachment', 'payment', 'session', 'quiz', 'announcement', 'other'));

alter table public.announcements add column if not exists read_by jsonb not null default '[]'::jsonb;

create or replace function public.mark_announcement_read(p_announcement_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id integer := public.current_profile_id();
begin
  if v_profile_id is null then
    return;
  end if;
  update public.announcements
  set read_by = case
    when read_by @> to_jsonb(v_profile_id) then read_by
    else read_by || to_jsonb(v_profile_id)
  end
  where id = p_announcement_id;
end;
$$;

grant execute on function public.mark_announcement_read(integer) to authenticated;
