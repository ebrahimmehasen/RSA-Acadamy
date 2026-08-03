-- ============================================================
-- RSA Academy — 0016 Finances (expenses, subscriptions)
-- COMPLETE_BLUEPRINT_FINAL.md finance module — admin-only, RLS
-- restricted to is_admin() like payments/salaries tables.
-- ============================================================

create table if not exists public.expenses (
  id integer generated always as identity primary key,
  category text not null check (category in ('staff_salary', 'subscription', 'other')),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_by integer references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses (expense_date);

alter table public.expenses enable row level security;

create policy expenses_admin
  on public.expenses for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
create table if not exists public.subscriptions (
  id integer generated always as identity primary key,
  service_name text not null,
  amount numeric(10, 2) not null check (amount > 0),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  renewal_date date not null,
  is_active boolean not null default true,
  created_by integer references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_renewal on public.subscriptions (renewal_date);

create trigger tr_subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;

create policy subscriptions_admin
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());
