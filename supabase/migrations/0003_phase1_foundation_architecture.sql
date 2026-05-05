create type public.person_identity_type as enum (
  'email',
  'linkedin_url',
  'phone',
  'github',
  'other'
);

create type public.company_stage as enum (
  'startup',
  'growth',
  'public',
  'other'
);

create type public.message_draft_lifecycle_status as enum (
  'generated',
  'edited',
  'sent_logged',
  'archived'
);

create type public.networking_plan_kind as enum (
  'first_touch',
  'follow_up',
  'reactivation',
  'referral_ask',
  'coffee_chat_request'
);

create type public.application_plan_kind as enum (
  'discovery',
  'apply',
  'followup',
  'interview_loop',
  'offer_decision'
);

create type public.prep_plan_kind as enum (
  'company_research',
  'story_bank',
  'mock',
  'thank_you'
);

create type public.plan_item_status as enum (
  'suggested',
  'accepted',
  'completed',
  'dismissed',
  'expired'
);

create type public.artifact_type as enum (
  'resume',
  'note',
  'transcript',
  'email_export',
  'job_desc',
  'other'
);

create type public.chunk_link_entity_type as enum (
  'person',
  'company',
  'role',
  'application',
  'contact',
  'task'
);

create type public.activity_actor_type as enum (
  'user',
  'agent',
  'system'
);

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  canonical_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.person_identities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete cascade,
  identity_type public.person_identity_type not null,
  identity_value text not null,
  source_system text,
  confidence numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_type, identity_value)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  industry text,
  stage public.company_stage,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index companies_name_lower_unique_idx on public.companies (lower(name));

create table public.company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index company_aliases_alias_lower_unique_idx on public.company_aliases (lower(alias));

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  function text,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  person_id uuid references public.persons(id) on delete set null,
  display_name text not null,
  company_id uuid references public.companies(id) on delete set null,
  role_title text,
  relationship_context text,
  stage public.pipeline_stage not null default 'cold',
  priority integer not null default 3 check (priority between 1 and 5),
  warmth_score numeric(5,2),
  last_interaction_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_contacts_user_id_stage_idx on public.user_contacts(user_id, stage);
create index user_contacts_user_id_updated_at_idx on public.user_contacts(user_id, updated_at desc);

create table public.user_company_targets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  priority integer not null default 3 check (priority between 1 and 5),
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table public.user_role_targets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  priority integer not null default 3 check (priority between 1 and 5),
  location_pref text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table public.networking_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid not null references public.user_contacts(id) on delete cascade,
  plan_kind public.networking_plan_kind not null,
  priority_score numeric(6,3),
  reason_codes text[] not null default '{}',
  suggested_due_at timestamptz,
  status public.plan_item_status not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index networking_plan_items_user_id_status_idx
  on public.networking_plan_items(user_id, status, suggested_due_at asc nulls last);

create table public.application_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  plan_kind public.application_plan_kind not null,
  priority_score numeric(6,3),
  reason_codes text[] not null default '{}',
  suggested_due_at timestamptz,
  status public.plan_item_status not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_plan_items_user_id_status_idx
  on public.application_plan_items(user_id, status, suggested_due_at asc nulls last);

create table public.prep_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.user_contacts(id) on delete set null,
  application_id uuid references public.applications(id) on delete cascade,
  plan_kind public.prep_plan_kind not null,
  priority_score numeric(6,3),
  reason_codes text[] not null default '{}',
  suggested_due_at timestamptz,
  status public.plan_item_status not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_id is not null or application_id is not null)
);

create index prep_plan_items_user_id_status_idx
  on public.prep_plan_items(user_id, status, suggested_due_at asc nulls last);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  artifact_type public.artifact_type not null,
  source_name text,
  raw_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artifacts_user_id_type_idx on public.artifacts(user_id, artifact_type, created_at desc);

create table public.artifact_chunks (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  user_id text not null,
  chunk_text text not null,
  token_count integer,
  embedding_ref text,
  chunk_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artifact_chunks_user_id_artifact_idx on public.artifact_chunks(user_id, artifact_id, chunk_order asc);

create table public.chunk_links (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.artifact_chunks(id) on delete cascade,
  entity_type public.chunk_link_entity_type not null,
  entity_id uuid not null,
  link_confidence numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chunk_links_chunk_id_entity_idx on public.chunk_links(chunk_id, entity_type, entity_id);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  actor_type public.activity_actor_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_user_id_created_at_idx on public.activity_events(user_id, created_at desc);

alter table public.interactions
  add column if not exists user_contact_id uuid references public.user_contacts(id) on delete set null,
  add column if not exists channel_identity_id uuid references public.person_identities(id) on delete set null;

alter table public.message_drafts
  add column if not exists plan_item_id uuid,
  add column if not exists lifecycle_status public.message_draft_lifecycle_status not null default 'generated';

alter table public.message_drafts
  add constraint message_drafts_plan_item_id_fkey
  foreign key (plan_item_id)
  references public.networking_plan_items(id)
  on delete set null;

alter table public.networking_plan_items
  add column if not exists draft_id uuid references public.message_drafts(id) on delete set null;

alter table public.tasks
  add column if not exists networking_plan_item_id uuid references public.networking_plan_items(id) on delete set null,
  add column if not exists application_plan_item_id uuid references public.application_plan_items(id) on delete set null,
  add column if not exists prep_plan_item_id uuid references public.prep_plan_items(id) on delete set null;

alter table public.tasks
  add constraint tasks_ai_rule_requires_single_plan_source
  check (
    source not in ('rule', 'ai')
    or num_nonnulls(networking_plan_item_id, application_plan_item_id, prep_plan_item_id) = 1
  ) not valid;

alter table public.applications
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists role_id uuid references public.roles(id) on delete set null,
  add column if not exists source_contact_id uuid references public.user_contacts(id) on delete set null;

alter table public.prep_items
  add column if not exists user_contact_id uuid references public.user_contacts(id) on delete set null;

create or replace function public.set_user_contact_last_interaction_at()
returns trigger
language plpgsql
as $$
begin
  if new.user_contact_id is not null then
    update public.user_contacts
    set last_interaction_at = greatest(coalesce(last_interaction_at, new.occurred_at), new.occurred_at)
    where id = new.user_contact_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger persons_set_updated_at
before update on public.persons
for each row execute function public.set_updated_at();

create trigger person_identities_set_updated_at
before update on public.person_identities
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger company_aliases_set_updated_at
before update on public.company_aliases
for each row execute function public.set_updated_at();

create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create trigger user_contacts_set_updated_at
before update on public.user_contacts
for each row execute function public.set_updated_at();

create trigger user_company_targets_set_updated_at
before update on public.user_company_targets
for each row execute function public.set_updated_at();

create trigger user_role_targets_set_updated_at
before update on public.user_role_targets
for each row execute function public.set_updated_at();

create trigger networking_plan_items_set_updated_at
before update on public.networking_plan_items
for each row execute function public.set_updated_at();

create trigger application_plan_items_set_updated_at
before update on public.application_plan_items
for each row execute function public.set_updated_at();

create trigger prep_plan_items_set_updated_at
before update on public.prep_plan_items
for each row execute function public.set_updated_at();

create trigger artifacts_set_updated_at
before update on public.artifacts
for each row execute function public.set_updated_at();

create trigger artifact_chunks_set_updated_at
before update on public.artifact_chunks
for each row execute function public.set_updated_at();

create trigger chunk_links_set_updated_at
before update on public.chunk_links
for each row execute function public.set_updated_at();

create trigger interactions_update_user_contact_last_interaction
after insert on public.interactions
for each row execute function public.set_user_contact_last_interaction_at();

alter table public.persons enable row level security;
alter table public.person_identities enable row level security;
alter table public.companies enable row level security;
alter table public.company_aliases enable row level security;
alter table public.roles enable row level security;

alter table public.user_contacts enable row level security;
alter table public.user_company_targets enable row level security;
alter table public.user_role_targets enable row level security;
alter table public.networking_plan_items enable row level security;
alter table public.application_plan_items enable row level security;
alter table public.prep_plan_items enable row level security;
alter table public.artifacts enable row level security;
alter table public.artifact_chunks enable row level security;
alter table public.chunk_links enable row level security;
alter table public.activity_events enable row level security;

create policy "Authenticated read persons"
on public.persons
for select
using (auth.role() = 'authenticated');

create policy "Authenticated read person identities"
on public.person_identities
for select
using (auth.role() = 'authenticated');

create policy "Authenticated read companies"
on public.companies
for select
using (auth.role() = 'authenticated');

create policy "Authenticated read company aliases"
on public.company_aliases
for select
using (auth.role() = 'authenticated');

create policy "Authenticated read roles"
on public.roles
for select
using (auth.role() = 'authenticated');

create policy "Users manage own user contacts"
on public.user_contacts
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own company targets"
on public.user_company_targets
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own role targets"
on public.user_role_targets
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own networking plan items"
on public.networking_plan_items
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own application plan items"
on public.application_plan_items
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own prep plan items"
on public.prep_plan_items
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own artifacts"
on public.artifacts
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own artifact chunks"
on public.artifact_chunks
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own chunk links through chunks"
on public.chunk_links
for all
using (
  exists (
    select 1
    from public.artifact_chunks ac
    where ac.id = chunk_links.chunk_id
      and ac.user_id = auth.jwt() ->> 'sub'
  )
)
with check (
  exists (
    select 1
    from public.artifact_chunks ac
    where ac.id = chunk_links.chunk_id
      and ac.user_id = auth.jwt() ->> 'sub'
  )
);

create policy "Users manage own activity events"
on public.activity_events
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');
