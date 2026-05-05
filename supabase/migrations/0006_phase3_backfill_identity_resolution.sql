-- Phase 3: backfill and identity resolution
-- Adds control/audit tables and user-scoped review pipeline.

create type public.backfill_run_phase as enum (
  'company_backfill',
  'role_backfill',
  'contact_person_link'
);

create type public.backfill_run_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'rolled_back'
);

create type public.backfill_match_type_company as enum (
  'exact',
  'alias',
  'fuzzy',
  'manual'
);

create type public.backfill_match_type_role as enum (
  'exact',
  'template',
  'fuzzy',
  'manual'
);

create type public.backfill_resolution_status_company_role as enum (
  'auto_matched',
  'needs_review',
  'resolved',
  'skipped'
);

create type public.person_resolution_status as enum (
  'auto_linked',
  'needs_review',
  'approved',
  'rejected',
  'skipped'
);

create type public.identity_review_decision as enum (
  'approve',
  'reject',
  'merge_new_person',
  'skip'
);

create or replace function public.normalize_company_key(input_text text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(regexp_replace(coalesce(input_text, ''), '\\s+', ' ', 'g'))), '');
$$;

create or replace function public.normalize_role_key(input_text text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(regexp_replace(coalesce(input_text, ''), '\\s+', ' ', 'g'))), '');
$$;

create table public.backfill_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  phase public.backfill_run_phase not null,
  status public.backfill_run_status not null default 'pending',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  triggered_by text not null default 'system',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index backfill_runs_user_id_phase_started_idx
  on public.backfill_runs(user_id, phase, started_at desc);

create table public.company_backfill_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.backfill_runs(id) on delete cascade,
  user_id text not null,
  source_table text not null check (source_table in ('contacts', 'applications')),
  source_row_id uuid not null,
  raw_company_name text,
  normalized_key text,
  matched_company_id uuid references public.companies(id) on delete set null,
  match_type public.backfill_match_type_company,
  confidence numeric(3,2),
  resolution_status public.backfill_resolution_status_company_role not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, source_table, source_row_id)
);

create index company_backfill_candidates_user_id_status_idx
  on public.company_backfill_candidates(user_id, resolution_status, confidence desc nulls last);

create table public.role_backfill_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.backfill_runs(id) on delete cascade,
  user_id text not null,
  source_table text not null check (source_table in ('contacts', 'applications')),
  source_row_id uuid not null,
  raw_role_title text,
  raw_company_name text,
  matched_company_id uuid references public.companies(id) on delete set null,
  matched_role_id uuid references public.roles(id) on delete set null,
  match_type public.backfill_match_type_role,
  confidence numeric(3,2),
  resolution_status public.backfill_resolution_status_company_role not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, source_table, source_row_id)
);

create index role_backfill_candidates_user_id_status_idx
  on public.role_backfill_candidates(user_id, resolution_status, confidence desc nulls last);

create table public.person_resolution_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.backfill_runs(id) on delete cascade,
  user_id text not null,
  legacy_contact_id uuid references public.contacts(id) on delete set null,
  user_contact_id uuid references public.user_contacts(id) on delete set null,
  proposed_person_id uuid references public.persons(id) on delete set null,
  proposed_identity_type public.person_identity_type,
  proposed_identity_value text,
  candidate_score numeric(4,3),
  reason_codes text[] not null default '{}',
  resolution_status public.person_resolution_status not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (legacy_contact_id is not null or user_contact_id is not null)
);

create index person_resolution_candidates_user_id_status_idx
  on public.person_resolution_candidates(user_id, resolution_status, candidate_score desc nulls last);

create table public.identity_resolution_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.person_resolution_candidates(id) on delete cascade,
  reviewer_user_id text not null,
  decision public.identity_review_decision not null,
  decided_person_id uuid references public.persons(id) on delete set null,
  note text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index identity_resolution_reviews_reviewer_decided_idx
  on public.identity_resolution_reviews(reviewer_user_id, decided_at desc);

create table public.backfill_change_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.backfill_runs(id) on delete cascade,
  user_id text not null,
  entity_table text not null,
  entity_id uuid not null,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz not null default now()
);

create index backfill_change_log_user_id_changed_idx
  on public.backfill_change_log(user_id, changed_at desc);

create index backfill_change_log_run_id_idx
  on public.backfill_change_log(run_id);

create trigger backfill_runs_set_updated_at
before update on public.backfill_runs
for each row execute function public.set_updated_at();

create trigger company_backfill_candidates_set_updated_at
before update on public.company_backfill_candidates
for each row execute function public.set_updated_at();

create trigger role_backfill_candidates_set_updated_at
before update on public.role_backfill_candidates
for each row execute function public.set_updated_at();

create trigger person_resolution_candidates_set_updated_at
before update on public.person_resolution_candidates
for each row execute function public.set_updated_at();

create trigger identity_resolution_reviews_set_updated_at
before update on public.identity_resolution_reviews
for each row execute function public.set_updated_at();

alter table public.backfill_runs enable row level security;
alter table public.company_backfill_candidates enable row level security;
alter table public.role_backfill_candidates enable row level security;
alter table public.person_resolution_candidates enable row level security;
alter table public.identity_resolution_reviews enable row level security;
alter table public.backfill_change_log enable row level security;

create policy "Users manage own backfill runs"
on public.backfill_runs
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own company backfill candidates"
on public.company_backfill_candidates
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own role backfill candidates"
on public.role_backfill_candidates
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own person resolution candidates"
on public.person_resolution_candidates
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own identity resolution reviews"
on public.identity_resolution_reviews
for all
using (reviewer_user_id = auth.jwt() ->> 'sub')
with check (reviewer_user_id = auth.jwt() ->> 'sub');

create policy "Users manage own backfill change log"
on public.backfill_change_log
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');
