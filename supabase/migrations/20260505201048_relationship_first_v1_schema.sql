begin;

-- Retired Phase 2-6 scaffolding. Keep only the relationship-first core.
drop table if exists public.backfill_change_log cascade;
drop table if exists public.identity_resolution_reviews cascade;
drop table if exists public.person_resolution_candidates cascade;
drop table if exists public.role_backfill_candidates cascade;
drop table if exists public.company_backfill_candidates cascade;
drop table if exists public.backfill_runs cascade;
drop table if exists public.activity_events cascade;
drop table if exists public.artifact_chunks cascade;
drop table if exists public.chunk_links cascade;
drop table if exists public.artifacts cascade;
drop table if exists public.prep_plan_items cascade;
drop table if exists public.application_plan_items cascade;
drop table if exists public.networking_plan_items cascade;
drop table if exists public.user_role_targets cascade;
drop table if exists public.user_company_targets cascade;
drop table if exists public.user_contacts cascade;
drop table if exists public.roles cascade;
drop table if exists public.company_aliases cascade;
drop table if exists public.person_identities cascade;
drop table if exists public.persons cascade;
drop table if exists public.user_cadence_policies cascade;
drop table if exists public.agent_runs cascade;
drop table if exists public.inbox_recommendations cascade;
drop table if exists public.weekly_plan_items cascade;
drop table if exists public.weekly_plans cascade;
drop table if exists public.prep_items cascade;
drop table if exists public.applications cascade;
drop table if exists public.tasks cascade;
drop table if exists public.ai_suggestions cascade;

drop function if exists public.emit_activity_event(text, text, text, uuid, public.activity_actor_type, jsonb);
drop function if exists public.transition_plan_item_status(text, text, uuid, public.plan_item_status, public.activity_actor_type, text);
drop function if exists public.materialize_task_from_plan_item(text, text, uuid, text, text, timestamptz, public.activity_actor_type, text);
drop function if exists public.normalize_company_key(text);
drop function if exists public.normalize_role_key(text);
drop trigger if exists interactions_update_user_contact_last_interaction on public.interactions;
drop function if exists public.set_user_contact_last_interaction_at();

drop type if exists public.weekly_plan_status cascade;
drop type if exists public.weekly_plan_item_domain cascade;
drop type if exists public.weekly_plan_item_status cascade;
drop type if exists public.inbox_recommendation_status cascade;
drop type if exists public.plan_item_status cascade;
drop type if exists public.activity_actor_type cascade;
drop type if exists public.artifact_type cascade;
drop type if exists public.chunk_link_entity_type cascade;
drop type if exists public.person_identity_type cascade;
drop type if exists public.company_stage cascade;
drop type if exists public.message_draft_lifecycle_status cascade;
drop type if exists public.networking_plan_kind cascade;
drop type if exists public.application_plan_kind cascade;
drop type if exists public.prep_plan_kind cascade;
drop type if exists public.outreach_chat_role cascade;
drop type if exists public.message_direction cascade;
drop type if exists public.message_status cascade;
drop type if exists public.meeting_type cascade;
drop type if exists public.meeting_status cascade;
drop type if exists public.agent_mode cascade;
drop type if exists public.agent_run_status cascade;
drop type if exists public.agent_confidence_bucket cascade;
drop type if exists public.application_status cascade;
drop type if exists public.prep_item_type cascade;
drop type if exists public.task_source cascade;
drop type if exists public.task_status cascade;
drop type if exists public.ai_suggestion_status cascade;
drop type if exists public.backfill_run_phase cascade;
drop type if exists public.backfill_run_status cascade;
drop type if exists public.backfill_match_type_company cascade;
drop type if exists public.backfill_match_type_role cascade;
drop type if exists public.backfill_resolution_status_company_role cascade;
drop type if exists public.person_resolution_status cascade;
drop type if exists public.identity_review_decision cascade;

create type public.outreach_chat_role as enum ('user', 'assistant');
create type public.message_direction as enum ('outbound', 'inbound');
create type public.message_status as enum ('draft', 'sent', 'received');
create type public.meeting_type as enum ('coffee_chat', 'call', 'interview', 'other');
create type public.meeting_status as enum ('scheduled', 'completed', 'canceled');

alter table public.user_profiles
  add column if not exists current_situation text,
  add column if not exists voice_samples text[] not null default '{}'::text[];

alter table public.user_profiles
  drop column if exists weekly_capacity,
  drop column if exists preferred_workdays,
  drop column if exists urgency_horizon_days,
  drop column if exists priority_role_tiers,
  drop column if exists priority_company_tiers;

-- Repurpose companies into the user-owned company workspace.
alter table public.companies
  add column if not exists user_id text,
  add column if not exists notes text,
  add column if not exists research_cache jsonb not null default '{}'::jsonb,
  add column if not exists is_target boolean not null default false,
  add column if not exists target_roles text[] not null default '{}'::text[],
  add column if not exists last_researched_at timestamptz;

drop index if exists public.companies_name_lower_unique_idx;
create unique index if not exists companies_user_id_name_unique_idx
  on public.companies (user_id, lower(name));
create index if not exists companies_user_id_is_target_idx
  on public.companies (user_id, is_target, updated_at desc);

alter table public.companies enable row level security;
drop policy if exists "Authenticated read companies" on public.companies;
drop policy if exists "Users manage own companies" on public.companies;
create policy "Users manage own companies"
on public.companies
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

alter table public.companies disable row level security;

delete from public.companies;

insert into public.companies (
  id,
  user_id,
  name,
  notes,
  research_cache,
  is_target,
  target_roles,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  src.user_id,
  src.name,
  null,
  '{}'::jsonb,
  false,
  '{}'::text[],
  now(),
  now()
from (
  select distinct on (c.user_id, lower(btrim(c.company)))
    c.user_id,
    btrim(c.company) as name
  from public.contacts c
  where c.company is not null
    and btrim(c.company) <> ''
  order by c.user_id, lower(btrim(c.company)), c.updated_at desc
) src;

update public.companies company_row
set is_target = true
from (
  select distinct on (up.user_id, lower(btrim(target_company_name)))
    up.user_id,
    btrim(target_company_name) as target_company
  from public.user_profiles up,
    unnest(coalesce(up.target_companies, '{}'::text[])) as target_company(target_company_name)
  where btrim(target_company_name) <> ''
  order by up.user_id, lower(btrim(target_company_name))
) targets
where company_row.user_id = targets.user_id
  and lower(company_row.name) = lower(targets.target_company);

insert into public.companies (
  id,
  user_id,
  name,
  notes,
  research_cache,
  is_target,
  target_roles,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  target_rows.user_id,
  target_rows.target_company,
  null,
  '{}'::jsonb,
  true,
  coalesce(target_rows.target_roles, '{}'::text[]),
  now(),
  now()
from (
  select distinct on (up.user_id, lower(btrim(target_company_name)))
    up.user_id,
    btrim(target_company_name) as target_company,
    up.target_roles as target_roles
  from public.user_profiles up,
    unnest(coalesce(up.target_companies, '{}'::text[])) as target_company(target_company_name)
  where btrim(target_company_name) <> ''
  order by up.user_id, lower(btrim(target_company_name))
) target_rows
where not exists (
  select 1
  from public.companies company_row
  where company_row.user_id = target_rows.user_id
    and lower(company_row.name) = lower(target_rows.target_company)
);

alter table public.companies
  alter column user_id set not null;

alter table public.companies enable row level security;

alter table public.user_profiles
  drop column if exists target_companies,
  drop column if exists target_roles;

alter table public.contacts
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists avatar_url text;

create index if not exists contacts_user_id_company_id_idx
  on public.contacts (user_id, company_id, updated_at desc);

alter table public.contacts disable row level security;

update public.contacts c
set company_id = company_row.id
from public.companies company_row
where c.company is not null
  and btrim(c.company) <> ''
  and c.user_id = company_row.user_id
  and lower(btrim(c.company)) = lower(company_row.name);

alter table public.interactions
  drop column if exists user_contact_id,
  drop column if exists channel_identity_id;

alter table public.contacts
  drop column if exists company;

alter table public.contacts enable row level security;

drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts"
on public.contacts
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

alter table public.interactions enable row level security;
drop policy if exists "Users manage own interactions" on public.interactions;
create policy "Users manage own interactions"
on public.interactions
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

alter table public.message_drafts rename to messages;
alter table public.messages
  add column if not exists direction public.message_direction not null default 'outbound',
  add column if not exists status public.message_status not null default 'draft',
  add column if not exists sent_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists source text;

alter table public.messages
  drop constraint if exists message_drafts_has_contact_reference;
alter table public.messages
  drop constraint if exists message_drafts_plan_item_id_fkey;

drop index if exists public.message_drafts_user_id_contact_id_idx;
drop index if exists public.message_drafts_user_id_user_contact_id_idx;
drop index if exists public.message_drafts_user_id_lifecycle_status_idx;
drop index if exists public.message_drafts_plan_item_id_idx;
drop index if exists public.interactions_user_id_user_contact_id_idx;

alter table public.messages disable row level security;

alter table public.messages
  drop column if exists channel_identity_id,
  drop column if exists plan_item_id,
  drop column if exists lifecycle_status,
  drop column if exists user_contact_id;

alter table public.messages
  alter column contact_id set not null;

alter table public.messages
  drop constraint if exists messages_drafts_plan_item_id_fkey;

alter table public.messages enable row level security;

create index if not exists messages_user_id_contact_id_idx
  on public.messages (user_id, contact_id, created_at desc);
create index if not exists messages_user_id_status_idx
  on public.messages (user_id, status, created_at desc);

drop policy if exists "Users manage own drafts" on public.messages;
drop policy if exists "Users manage own messages" on public.messages;
create policy "Users manage own messages"
on public.messages
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create or replace function public.set_contact_last_interaction_at_from_messages()
returns trigger
language plpgsql
as $$
declare
  v_effective_at timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.status = 'sent' then
      v_effective_at := coalesce(new.sent_at, new.created_at);
    elsif new.status = 'received' then
      v_effective_at := coalesce(new.received_at, new.created_at);
    end if;
  else
    if new.status = 'sent' and old.status is distinct from 'sent' then
      v_effective_at := coalesce(new.sent_at, new.updated_at, new.created_at);
    elsif new.status = 'received' and old.status is distinct from 'received' then
      v_effective_at := coalesce(new.received_at, new.updated_at, new.created_at);
    end if;
  end if;

  if v_effective_at is not null then
    update public.contacts
    set last_interaction_at = greatest(coalesce(last_interaction_at, v_effective_at), v_effective_at)
    where id = new.contact_id
      and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_update_contact_last_interaction on public.messages;
create trigger messages_update_contact_last_interaction
after insert or update of status, sent_at, received_at on public.messages
for each row execute function public.set_contact_last_interaction_at_from_messages();

create table public.outreach_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  role public.outreach_chat_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_chat_messages_user_id_contact_id_idx
  on public.outreach_chat_messages (user_id, contact_id, created_at desc);

create trigger outreach_chat_messages_set_updated_at
before update on public.outreach_chat_messages
for each row execute function public.set_updated_at();

alter table public.outreach_chat_messages enable row level security;
create policy "Users manage own outreach chat"
on public.outreach_chat_messages
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  meeting_type public.meeting_type not null default 'coffee_chat',
  scheduled_for timestamptz not null,
  title text,
  notes text,
  status public.meeting_status not null default 'scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_user_id_scheduled_for_idx
  on public.meetings (user_id, scheduled_for asc, updated_at desc);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
create policy "Users manage own meetings"
on public.meetings
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create table public.prep_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  meeting_id uuid references public.meetings(id) on delete set null,
  title text not null,
  about_them text not null default '',
  company_context text not null default '',
  your_pitch text not null default '',
  questions_to_ask text[] not null default '{}'::text[],
  goal_for_call text not null default '',
  follow_up_notes text not null default '',
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index prep_briefs_meeting_id_unique_idx
  on public.prep_briefs (meeting_id)
  where meeting_id is not null;
create index prep_briefs_user_id_contact_id_idx
  on public.prep_briefs (user_id, contact_id, updated_at desc);

create trigger prep_briefs_set_updated_at
before update on public.prep_briefs
for each row execute function public.set_updated_at();

alter table public.prep_briefs enable row level security;
create policy "Users manage own prep briefs"
on public.prep_briefs
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create table public.behavioral_stories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  situation text,
  task text,
  action text,
  result text,
  tags text[] not null default '{}'::text[],
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index behavioral_stories_user_id_updated_at_idx
  on public.behavioral_stories (user_id, updated_at desc);

create trigger behavioral_stories_set_updated_at
before update on public.behavioral_stories
for each row execute function public.set_updated_at();

alter table public.behavioral_stories enable row level security;
create policy "Users manage own behavioral stories"
on public.behavioral_stories
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

commit;
