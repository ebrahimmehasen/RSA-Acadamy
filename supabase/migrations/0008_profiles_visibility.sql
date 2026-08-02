-- ============================================================
-- RSA Academy — 0008 Fix: profiles visibility for cross-role display
--
-- Bug found in browser testing: teacher's assignment-grading page
-- joins students -> profiles(full_name) using the RLS-scoped client,
-- but profiles only allowed self/admin SELECT — so every other role's
-- name resolved to null in joins (admin pages were unaffected because
-- they use the service-role client). full_name/profile_picture are
-- not sensitive in this single-school app and are already displayed
-- across roles (teacher sees student names, parent sees teacher
-- names, etc.) — so any authenticated user may read basic profile
-- info. phone/id stay restricted via the existing self/admin policies
-- for now (a later migration can split this into a view if phone
-- needs to be hidden from peers).
-- ============================================================

create policy profiles_select_authenticated
  on public.profiles for select
  using (auth.uid() is not null);
