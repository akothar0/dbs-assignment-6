create extension if not exists pgcrypto;

create type public.pipeline_stage as enum (
  'cold',
  'reached_out',
  'replied',
  'coffee_chat',
  'referred_applied',
  'closed'
);

create type public.interaction_type as enum (
  'email',
  'linkedin',
  'coffee_chat',
  'call',
  'note',
  'application',
  'referral'
);

create type public.task_status as enum (
  'open',
  'completed',
  'dismissed'
);

create type public.task_source as enum (
  'manual',
  'rule',
  'ai'
);

create type public.draft_goal as enum (
  'cold_intro',
  'follow_up',
  'thank_you',
  'referral_ask',
  'reconnect'
);

create type public.ai_suggestion_status as enum (
  'pending',
  'accepted',
  'dismissed'
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  full_name text,
  background_summary text,
  resume_text text,
  target_roles text[] not null default '{}',
  target_companies text[] not null default '{}',
  writing_preferences text,
  recruiting_deadline date,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  company text,
  role text,
  level text,
  relationship text,
  linkedin_url text,
  email text,
  stage public.pipeline_stage not null default 'cold',
  priority integer not null default 3 check (priority between 1 and 5),
  notes text,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type public.interaction_type not null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  raw_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status public.task_status not null default 'open',
  source public.task_source not null default 'manual',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  goal public.draft_goal not null,
  subject text,
  body text not null,
  confidence numeric(3,2),
  personalization_signals text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  draft_id uuid references public.message_drafts(id) on delete cascade,
  suggested_task jsonb,
  suggested_stage public.pipeline_stage,
  reasoning text,
  status public.ai_suggestion_status not null default 'pending',
  accepted_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_user_id_stage_idx on public.contacts(user_id, stage);
create index contacts_user_id_updated_at_idx on public.contacts(user_id, updated_at desc);
create index interactions_user_id_contact_id_idx on public.interactions(user_id, contact_id, occurred_at desc);
create index tasks_user_id_status_due_at_idx on public.tasks(user_id, status, due_at asc nulls last);
create index message_drafts_user_id_contact_id_idx on public.message_drafts(user_id, contact_id, created_at desc);
create index ai_suggestions_user_id_status_idx on public.ai_suggestions(user_id, status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_contact_last_interaction_at()
returns trigger
language plpgsql
as $$
begin
  update public.contacts
  set last_interaction_at = greatest(coalesce(last_interaction_at, new.occurred_at), new.occurred_at)
  where id = new.contact_id and user_id = new.user_id;

  return new;
end;
$$;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger interactions_set_updated_at
before update on public.interactions
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger message_drafts_set_updated_at
before update on public.message_drafts
for each row execute function public.set_updated_at();

create trigger ai_suggestions_set_updated_at
before update on public.ai_suggestions
for each row execute function public.set_updated_at();

create trigger interactions_update_contact_last_interaction
after insert on public.interactions
for each row execute function public.set_contact_last_interaction_at();

alter table public.user_profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.message_drafts enable row level security;
alter table public.ai_suggestions enable row level security;

create policy "Users manage own profile"
on public.user_profiles
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own contacts"
on public.contacts
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own interactions"
on public.interactions
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own tasks"
on public.tasks
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own drafts"
on public.message_drafts
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own ai suggestions"
on public.ai_suggestions
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');
