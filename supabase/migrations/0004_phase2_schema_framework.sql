-- Phase 2 (master-aligned): schema and migration framework hardening only.
-- No backfill, identity resolution, or behavior cutover in this migration.

-- Performance and compatibility indexes for additive nullable links.
create index if not exists applications_user_id_company_id_idx
  on public.applications(user_id, company_id)
  where company_id is not null;

create index if not exists applications_user_id_role_id_idx
  on public.applications(user_id, role_id)
  where role_id is not null;

create index if not exists applications_user_id_source_contact_id_idx
  on public.applications(user_id, source_contact_id)
  where source_contact_id is not null;

create index if not exists interactions_user_id_user_contact_id_idx
  on public.interactions(user_id, user_contact_id, occurred_at desc)
  where user_contact_id is not null;

create index if not exists prep_items_user_id_user_contact_id_idx
  on public.prep_items(user_id, user_contact_id, due_at asc nulls last)
  where user_contact_id is not null;

create index if not exists message_drafts_user_id_lifecycle_status_idx
  on public.message_drafts(user_id, lifecycle_status, created_at desc);

create index if not exists message_drafts_plan_item_id_idx
  on public.message_drafts(plan_item_id)
  where plan_item_id is not null;

create index if not exists tasks_user_id_networking_plan_item_id_idx
  on public.tasks(user_id, networking_plan_item_id)
  where networking_plan_item_id is not null;

create index if not exists tasks_user_id_application_plan_item_id_idx
  on public.tasks(user_id, application_plan_item_id)
  where application_plan_item_id is not null;

create index if not exists tasks_user_id_prep_plan_item_id_idx
  on public.tasks(user_id, prep_plan_item_id)
  where prep_plan_item_id is not null;

-- Explicitly document deferred hardening intent for phase boundaries.
comment on constraint tasks_ai_rule_requires_single_plan_source on public.tasks is
  'Phase 2 keeps this NOT VALID for compatibility. Validate in a later phase after plan-item adoption and backfill workflows.';
