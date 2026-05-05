-- Phase 5: opinionated product surface (additive, compatibility-first)

create type public.weekly_plan_status as enum ('draft', 'committed', 'archived');
create type public.weekly_plan_item_domain as enum ('networking', 'application', 'prep', 'task');
create type public.weekly_plan_item_status as enum ('planned', 'in_progress', 'completed', 'dismissed');
create type public.inbox_recommendation_status as enum ('suggested', 'accepted', 'edited', 'dismissed', 'converted');

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  week_start date not null,
  status public.weekly_plan_status not null default 'draft',
  capacity_snapshot jsonb not null default '{}'::jsonb,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index weekly_plans_user_id_week_start_idx
  on public.weekly_plans(user_id, week_start desc, updated_at desc);

create unique index weekly_plans_user_id_week_active_unique_idx
  on public.weekly_plans(user_id, week_start, status)
  where status in ('draft', 'committed');

create table public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  user_id text not null,
  domain public.weekly_plan_item_domain not null,
  plan_item_id uuid,
  task_id uuid references public.tasks(id) on delete set null,
  rank integer not null default 0,
  scheduled_for date,
  effort_points integer,
  status public.weekly_plan_item_status not null default 'planned',
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effort_points is null or effort_points > 0)
);

create index weekly_plan_items_user_id_schedule_idx
  on public.weekly_plan_items(user_id, scheduled_for asc nulls last, rank asc);

create index weekly_plan_items_weekly_plan_rank_idx
  on public.weekly_plan_items(weekly_plan_id, rank asc, created_at asc);

create table public.inbox_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  domain public.weekly_plan_item_domain not null,
  recommendation_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.inbox_recommendation_status not null default 'suggested',
  suggested_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbox_recommendations_user_id_status_idx
  on public.inbox_recommendations(user_id, status, suggested_for asc nulls last, updated_at desc);

alter table public.user_profiles
  add column if not exists weekly_capacity integer,
  add column if not exists preferred_workdays integer[] not null default '{}',
  add column if not exists urgency_horizon_days integer,
  add column if not exists priority_role_tiers jsonb not null default '{}'::jsonb,
  add column if not exists priority_company_tiers jsonb not null default '{}'::jsonb;

alter table public.user_profiles
  add constraint user_profiles_weekly_capacity_positive
  check (weekly_capacity is null or weekly_capacity > 0);

alter table public.user_profiles
  add constraint user_profiles_urgency_horizon_positive
  check (urgency_horizon_days is null or urgency_horizon_days > 0);

alter table public.user_profiles
  add constraint user_profiles_preferred_workdays_valid
  check (
    preferred_workdays is null
    or preferred_workdays <@ array[0,1,2,3,4,5,6]::integer[]
  );

create trigger weekly_plans_set_updated_at
before update on public.weekly_plans
for each row execute function public.set_updated_at();

create trigger weekly_plan_items_set_updated_at
before update on public.weekly_plan_items
for each row execute function public.set_updated_at();

create trigger inbox_recommendations_set_updated_at
before update on public.inbox_recommendations
for each row execute function public.set_updated_at();

alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_items enable row level security;
alter table public.inbox_recommendations enable row level security;

create policy weekly_plans_user_access
on public.weekly_plans
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));

create policy weekly_plan_items_user_access
on public.weekly_plan_items
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));

create policy inbox_recommendations_user_access
on public.inbox_recommendations
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));
