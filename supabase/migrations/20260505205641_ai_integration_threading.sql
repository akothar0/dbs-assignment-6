begin;

delete from public.interactions
where type in ('email', 'linkedin');

alter type public.interaction_type rename to interaction_type_old;
create type public.interaction_type as enum ('coffee_chat', 'call', 'note', 'referral');

alter table public.interactions
  alter column type type public.interaction_type
  using type::text::public.interaction_type;

drop type public.interaction_type_old;

commit;
