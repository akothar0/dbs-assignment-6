create type public.application_status as enum (
  'target',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'closed'
);

create type public.prep_item_type as enum (
  'company_research',
  'coffee_chat_prep',
  'interview_prep',
  'behavioral_story',
  'talking_point',
  'thank_you_follow_up',
  'prep_brief',
  'raw_capture'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  company text not null,
  role text not null,
  source text,
  status public.application_status not null default 'target',
  deadline date,
  next_step text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prep_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  application_id uuid references public.applications(id) on delete cascade,
  type public.prep_item_type not null,
  title text not null,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_status_idx on public.applications(user_id, status, updated_at desc);
create index applications_user_id_deadline_idx on public.applications(user_id, deadline asc nulls last);
create index prep_items_user_id_type_idx on public.prep_items(user_id, type, updated_at desc);
create index prep_items_user_id_due_at_idx on public.prep_items(user_id, due_at asc nulls last);

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger prep_items_set_updated_at
before update on public.prep_items
for each row execute function public.set_updated_at();

alter table public.applications enable row level security;
alter table public.prep_items enable row level security;

create policy "Users manage own applications"
on public.applications
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

create policy "Users manage own prep items"
on public.prep_items
for all
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');
