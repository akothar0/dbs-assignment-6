-- Phase 2 stabilization hotfix:
-- Relax task source constraint for compatibility with existing rule/ai task creation flows.
-- Strict plan-item enforcement is deferred to a later phase.

alter table public.tasks
  drop constraint if exists tasks_ai_rule_requires_single_plan_source;

alter table public.tasks
  add constraint tasks_ai_rule_requires_single_plan_source
  check (
    source not in ('rule', 'ai')
    or num_nonnulls(networking_plan_item_id, application_plan_item_id, prep_plan_item_id) <= 1
  ) not valid;

comment on constraint tasks_ai_rule_requires_single_plan_source on public.tasks is
  'Phase 2 compatibility mode: source=rule/ai may have zero or one linked plan item. Strict exactly-one validation is deferred to later phase.';
