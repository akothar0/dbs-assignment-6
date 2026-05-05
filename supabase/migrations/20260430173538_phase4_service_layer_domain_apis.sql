-- Phase 4: service-layer lifecycle + domain APIs (additive, compatibility-first)

create index if not exists networking_plan_items_user_id_status_due_idx
  on public.networking_plan_items(user_id, status, suggested_due_at asc nulls last);

create index if not exists application_plan_items_user_id_status_due_idx
  on public.application_plan_items(user_id, status, suggested_due_at asc nulls last);

create index if not exists prep_plan_items_user_id_status_due_idx
  on public.prep_plan_items(user_id, status, suggested_due_at asc nulls last);

create index if not exists tasks_user_id_due_status_idx
  on public.tasks(user_id, due_at asc nulls last, status);

create index if not exists tasks_plan_item_compound_lookup_idx
  on public.tasks(user_id, networking_plan_item_id, application_plan_item_id, prep_plan_item_id, created_at desc);

create or replace function public.emit_activity_event(
  p_user_id text,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_type public.activity_actor_type,
  p_payload jsonb default '{}'::jsonb
)
returns void
language sql
as $$
  insert into public.activity_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    payload
  )
  values (
    p_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_actor_type,
    coalesce(p_payload, '{}'::jsonb)
  );
$$;

create or replace function public.transition_plan_item_status(
  p_user_id text,
  p_domain text,
  p_plan_item_id uuid,
  p_target_status public.plan_item_status,
  p_actor_type public.activity_actor_type default 'user',
  p_reason text default null
)
returns table(ok boolean, new_status public.plan_item_status, warnings text[])
language plpgsql
as $$
declare
  v_old_status public.plan_item_status;
  v_new_status public.plan_item_status;
  v_table text;
  v_entity_type text;
  v_allowed boolean := false;
begin
  if p_domain not in ('networking', 'application', 'prep') then
    raise exception 'Invalid domain: %', p_domain;
  end if;

  if p_domain = 'networking' then
    v_table := 'networking_plan_items';
    v_entity_type := 'networking_plan_item';
  elsif p_domain = 'application' then
    v_table := 'application_plan_items';
    v_entity_type := 'application_plan_item';
  else
    v_table := 'prep_plan_items';
    v_entity_type := 'prep_plan_item';
  end if;

  execute format(
    'select status from public.%I where id = $1 and user_id = $2',
    v_table
  ) into v_old_status using p_plan_item_id, p_user_id;

  if v_old_status is null then
    raise exception 'Plan item not found or not owned by user';
  end if;

  if p_target_status = 'accepted' and v_old_status = 'suggested' then
    v_allowed := true;
  elsif p_target_status = 'dismissed' and v_old_status = 'suggested' then
    v_allowed := true;
  elsif p_target_status = 'completed' and v_old_status = 'accepted' then
    v_allowed := true;
  elsif p_target_status = 'expired' and v_old_status = 'accepted' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'Invalid status transition % -> %', v_old_status, p_target_status;
  end if;

  execute format(
    'update public.%I set status = $1, updated_at = now() where id = $2 and user_id = $3 returning status',
    v_table
  ) into v_new_status using p_target_status, p_plan_item_id, p_user_id;

  perform public.emit_activity_event(
    p_user_id,
    'plan_item_status_changed',
    v_entity_type,
    p_plan_item_id,
    p_actor_type,
    jsonb_build_object(
      'domain', p_domain,
      'from_status', v_old_status,
      'to_status', v_new_status,
      'reason', p_reason
    )
  );

  return query select true, v_new_status, coalesce(array[]::text[], array[]::text[]);
end;
$$;

create or replace function public.materialize_task_from_plan_item(
  p_user_id text,
  p_domain text,
  p_plan_item_id uuid,
  p_title text default null,
  p_description text default null,
  p_due_at timestamptz default null,
  p_actor_type public.activity_actor_type default 'user',
  p_idempotency_key text default null
)
returns table(ok boolean, task_id uuid, warnings text[])
language plpgsql
as $$
declare
  v_status public.plan_item_status;
  v_task_id uuid;
  v_existing_task_id uuid;
  v_title text;
  v_description text;
  v_due_at timestamptz;
  v_contact_id uuid;
  v_app_company text;
  v_app_role text;
  v_contact_name text;
  v_plan_kind text;
begin
  if p_domain not in ('networking', 'application', 'prep') then
    raise exception 'Invalid domain: %', p_domain;
  end if;

  if p_domain = 'networking' then
    select npi.status, npi.plan_kind::text, npi.suggested_due_at, uc.display_name
    into v_status, v_plan_kind, v_due_at, v_contact_name
    from public.networking_plan_items npi
    join public.user_contacts uc on uc.id = npi.contact_id
    where npi.id = p_plan_item_id and npi.user_id = p_user_id;
  elsif p_domain = 'application' then
    select api.status, api.plan_kind::text, api.suggested_due_at, a.company, a.role
    into v_status, v_plan_kind, v_due_at, v_app_company, v_app_role
    from public.application_plan_items api
    join public.applications a on a.id = api.application_id
    where api.id = p_plan_item_id and api.user_id = p_user_id;
  else
    select ppi.status, ppi.plan_kind::text, ppi.suggested_due_at
    into v_status, v_plan_kind, v_due_at
    from public.prep_plan_items ppi
    where ppi.id = p_plan_item_id and ppi.user_id = p_user_id;
  end if;

  if v_status is null then
    raise exception 'Plan item not found or not owned by user';
  end if;

  if v_status not in ('accepted', 'suggested') then
    raise exception 'Task can only be created from suggested/accepted plan items';
  end if;

  if p_idempotency_key is not null then
    select t.id
    into v_existing_task_id
    from public.tasks t
    where t.user_id = p_user_id
      and t.source = 'ai'
      and coalesce(t.description, '') like format('%%[phase4-idempotency:%s]%%', p_idempotency_key)
      and (
        (p_domain = 'networking' and t.networking_plan_item_id = p_plan_item_id) or
        (p_domain = 'application' and t.application_plan_item_id = p_plan_item_id) or
        (p_domain = 'prep' and t.prep_plan_item_id = p_plan_item_id)
      )
    order by t.created_at desc
    limit 1;
  end if;

  if v_existing_task_id is not null then
    return query select true, v_existing_task_id, array['idempotency-hit']::text[];
    return;
  end if;

  v_title := coalesce(
    p_title,
    case
      when p_domain = 'networking' then format('Networking action: %s (%s)', coalesce(v_contact_name, 'contact'), v_plan_kind)
      when p_domain = 'application' then format('Application action: %s at %s', coalesce(v_app_role, 'role'), coalesce(v_app_company, 'company'))
      else format('Prep action: %s', v_plan_kind)
    end
  );

  v_description := p_description;
  if p_idempotency_key is not null then
    v_description := concat_ws(' ', coalesce(v_description, ''), format('[phase4-idempotency:%s]', p_idempotency_key));
  end if;

  insert into public.tasks (
    user_id,
    contact_id,
    title,
    description,
    due_at,
    source,
    networking_plan_item_id,
    application_plan_item_id,
    prep_plan_item_id
  )
  values (
    p_user_id,
    v_contact_id,
    v_title,
    nullif(v_description, ''),
    coalesce(p_due_at, v_due_at),
    'ai',
    case when p_domain = 'networking' then p_plan_item_id else null end,
    case when p_domain = 'application' then p_plan_item_id else null end,
    case when p_domain = 'prep' then p_plan_item_id else null end
  )
  returning id into v_task_id;

  perform public.emit_activity_event(
    p_user_id,
    'plan_item_task_materialized',
    'task',
    v_task_id,
    p_actor_type,
    jsonb_build_object(
      'domain', p_domain,
      'plan_item_id', p_plan_item_id,
      'idempotency_key', p_idempotency_key
    )
  );

  return query select true, v_task_id, coalesce(array[]::text[], array[]::text[]);
end;
$$;
