alter table public.message_drafts
  alter column contact_id drop not null,
  add column if not exists user_contact_id uuid references public.user_contacts(id) on delete set null;

alter table public.message_drafts
  add constraint message_drafts_has_contact_reference
  check (contact_id is not null or user_contact_id is not null) not valid;

create index if not exists message_drafts_user_id_user_contact_id_idx
  on public.message_drafts(user_id, user_contact_id, created_at desc)
  where user_contact_id is not null;

alter table public.inbox_recommendations
  add column if not exists action_on_accept text;
