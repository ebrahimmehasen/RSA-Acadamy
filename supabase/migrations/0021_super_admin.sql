-- ============================================================
-- RSA Academy — 0021 Super-admin flag
-- Only one admin (the primary owner) may delete other admin
-- accounts. Every admin can still create/list admins.
-- ============================================================

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- Mohamed Hosni is the sole owner of the admin team.
update public.profiles
set is_super_admin = true
where role = 'admin' and user_id = '5ea9cf7d-14bb-4dcf-b8cb-65e0ded58b99';
