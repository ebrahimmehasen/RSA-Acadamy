-- ============================================================
-- RSA Academy — 0020 Remove payments/salaries/finances entirely
-- Platform is education-only now — no financial features anywhere.
-- Drops everything introduced by 0006_payments.sql and
-- 0016_finances.sql, plus the payment_notification column added by
-- 0013_notification_settings.sql.
-- ============================================================

drop table if exists public.payment_submissions cascade;
drop table if exists public.payment_instructions cascade;
drop table if exists public.teacher_salary_payments cascade;
drop table if exists public.teacher_salaries cascade;
drop table if exists public.teacher_payment_methods cascade;
drop table if exists public.expenses cascade;
drop table if exists public.subscriptions cascade;

alter table public.notification_settings drop column if exists payment_notification;
