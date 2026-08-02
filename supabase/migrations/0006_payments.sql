-- ============================================================
-- RSA Academy — 0006 Payments (fully manual, decision #12)
-- Student fees: admin publishes bank-transfer instructions per class,
-- parent/student uploads a proof, admin approves/rejects by hand.
-- Teacher salaries: admin records salary + marks months paid by hand.
-- No payment-gateway APIs anywhere (InstaPay/e-wallet fields are
-- stored preference data only).
-- ============================================================

create table if not exists public.payment_instructions (
  id integer generated always as identity primary key,
  class_id integer not null references public.classes (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  semester text not null,                    -- e.g. "الترم الأول 2026"
  bank_name text not null,
  account_holder_name text not null,
  account_number text,
  iban text,
  instruction_message text,
  payment_deadline date,
  is_active boolean not null default true,
  created_by integer references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_instructions_class
  on public.payment_instructions (class_id, is_active);

create trigger tr_payment_instructions_touch
  before update on public.payment_instructions
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.payment_submissions (
  id integer generated always as identity primary key,
  instruction_id integer not null references public.payment_instructions (id) on delete cascade,
  student_id integer not null references public.students (user_id) on delete cascade,
  payer_id integer not null references public.profiles (id) on delete cascade,
  file_drive_id text not null,
  file_name text,
  transaction_id text,
  transaction_date date,
  payer_message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by integer references public.profiles (id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_submissions_instruction
  on public.payment_submissions (instruction_id, status);
create index if not exists idx_payment_submissions_student
  on public.payment_submissions (student_id);

-- ============================================================
-- teacher payment preference (stored data only — no verification)
-- ============================================================
create table if not exists public.teacher_payment_methods (
  id integer generated always as identity primary key,
  teacher_id integer not null references public.teachers (user_id) on delete cascade,
  payment_method text not null
    check (payment_method in ('bank_transfer', 'instapay', 'e_wallet')),
  bank_name text,
  account_holder_name text,
  account_number text,
  iban text,
  instapay_phone text,
  wallet_provider text,                      -- vodafone / orange / etisalat / cib
  wallet_phone text,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_payment_methods_teacher
  on public.teacher_payment_methods (teacher_id);

create trigger tr_teacher_payment_methods_touch
  before update on public.teacher_payment_methods
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.teacher_salaries (
  id integer generated always as identity primary key,
  teacher_id integer not null unique references public.teachers (user_id) on delete cascade,
  salary_amount numeric(10, 2) not null check (salary_amount >= 0),
  currency text not null default 'EGP',
  payment_day integer not null default 25 check (payment_day between 1 and 28),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_teacher_salaries_touch
  before update on public.teacher_salaries
  for each row execute function public.touch_updated_at();

-- ============================================================
create table if not exists public.teacher_salary_payments (
  id integer generated always as identity primary key,
  teacher_id integer not null references public.teachers (user_id) on delete cascade,
  salary_id integer references public.teacher_salaries (id) on delete set null,
  amount numeric(10, 2) not null,
  currency text not null default 'EGP',
  month text not null,                       -- e.g. "2026-08"
  payment_date date,
  transaction_ref text,
  status text not null default 'paid' check (status in ('pending', 'paid')),
  marked_by integer references public.profiles (id) on delete set null,
  notes text,
  proof_drive_id text,
  created_at timestamptz not null default now(),
  unique (teacher_id, month)
);

create index if not exists idx_salary_payments_teacher
  on public.teacher_salary_payments (teacher_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.payment_instructions enable row level security;

create policy payment_instructions_select_student
  on public.payment_instructions for select
  using (
    is_active and exists (
      select 1 from public.students st
      where st.user_id = public.current_profile_id()
        and st.class_id = payment_instructions.class_id
    )
  );

create policy payment_instructions_select_parent
  on public.payment_instructions for select
  using (
    is_active and exists (
      select 1 from public.students st
      where st.parent_id = public.current_profile_id()
        and st.class_id = payment_instructions.class_id
    )
  );

create policy payment_instructions_all_admin
  on public.payment_instructions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.payment_submissions enable row level security;

-- the paying student (only if they have no linked parent) or the parent
create policy payment_submissions_select_own
  on public.payment_submissions for select
  using (
    payer_id = public.current_profile_id()
    or student_id = public.current_profile_id()
    or exists (
      select 1 from public.students st
      where st.user_id = payment_submissions.student_id
        and st.parent_id = public.current_profile_id()
    )
  );

create policy payment_submissions_insert_parent
  on public.payment_submissions for insert
  with check (
    payer_id = public.current_profile_id()
    and exists (
      select 1 from public.students st
      where st.user_id = payment_submissions.student_id
        and st.parent_id = public.current_profile_id()
    )
  );

-- student pays for themselves only when no parent is linked (decision:
-- isPaymentActive = !parent_id)
create policy payment_submissions_insert_student
  on public.payment_submissions for insert
  with check (
    payer_id = public.current_profile_id()
    and student_id = public.current_profile_id()
    and exists (
      select 1 from public.students st
      where st.user_id = payment_submissions.student_id
        and st.parent_id is null
    )
  );

create policy payment_submissions_all_admin
  on public.payment_submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.teacher_payment_methods enable row level security;

create policy teacher_payment_methods_own
  on public.teacher_payment_methods for all
  using (teacher_id = public.current_profile_id())
  with check (teacher_id = public.current_profile_id());

create policy teacher_payment_methods_admin
  on public.teacher_payment_methods for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.teacher_salaries enable row level security;

create policy teacher_salaries_select_own
  on public.teacher_salaries for select
  using (teacher_id = public.current_profile_id());

create policy teacher_salaries_all_admin
  on public.teacher_salaries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
alter table public.teacher_salary_payments enable row level security;

create policy salary_payments_select_own
  on public.teacher_salary_payments for select
  using (teacher_id = public.current_profile_id());

create policy salary_payments_all_admin
  on public.teacher_salary_payments for all
  using (public.is_admin())
  with check (public.is_admin());
