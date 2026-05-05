-- Phase 6: orchestrator workflow integration (manual, inbox-first, deterministic)

create type public.agent_mode as enum ('planner', 'writer', 'cadence');
create type public.agent_run_status as enum ('started', 'completed', 'failed');
create type public.agent_confidence_bucket as enum ('low', 'medium', 'high');

create table public.user_cadence_policies (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  follow_up_offsets jsonb not null default '{"email":7,"linkedin":7,"call":14,"coffee_chat":1}'::jsonb,
  preferred_weekdays integer[] not null default '{}'::integer[],
  max_suggestions_per_week integer not null default 8,
  cooldown_days integer not null default 7,
  blackout_windows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (preferred_weekdays <@ array[0,1,2,3,4,5,6]::integer[]),
  check (max_suggestions_per_week > 0 and max_suggestions_per_week <= 100),
  check (cooldown_days >= 0 and cooldown_days <= 90)
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  mode public.agent_mode not null,
  status public.agent_run_status not null default 'started',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  failure_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'started' and finished_at is null) or (status in ('completed', 'failed') and finished_at is not null))
);

create index agent_runs_user_mode_started_idx
  on public.agent_runs(user_id, mode, started_at desc);

create index agent_runs_user_status_started_idx
  on public.agent_runs(user_id, status, started_at desc);

alter table public.inbox_recommendations
  add column if not exists agent_mode public.agent_mode,
  add column if not exists deterministic_score numeric(8,4),
  add column if not exists candidate_entity_type text,
  add column if not exists candidate_entity_id uuid,
  add column if not exists dedupe_key text,
  add column if not exists confidence_bucket public.agent_confidence_bucket,
  add column if not exists why_now text,
  add column if not exists grounding jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists inbox_recommendations_user_dedupe_active_unique_idx
  on public.inbox_recommendations(user_id, dedupe_key)
  where dedupe_key is not null and status in ('suggested', 'accepted', 'edited');

create index if not exists inbox_recommendations_user_mode_status_idx
  on public.inbox_recommendations(user_id, agent_mode, status, suggested_for asc nulls last, updated_at desc);

create index if not exists inbox_recommendations_candidate_lookup_idx
  on public.inbox_recommendations(user_id, candidate_entity_type, candidate_entity_id, updated_at desc);

create trigger user_cadence_policies_set_updated_at
before update on public.user_cadence_policies
for each row execute function public.set_updated_at();

create trigger agent_runs_set_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

alter table public.user_cadence_policies enable row level security;
alter table public.agent_runs enable row level security;

create policy user_cadence_policies_user_access
on public.user_cadence_policies
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));

create policy agent_runs_user_access
on public.agent_runs
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));
