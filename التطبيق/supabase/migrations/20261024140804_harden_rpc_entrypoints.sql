create or replace function private.complete_activity_attempt_impl(
  p_attempt_id uuid,
  p_child_id uuid,
  p_activity_id uuid,
  p_responses jsonb,
  p_help_used boolean,
  p_started_at timestamptz,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_activity public.activities%rowtype;
  v_attempt public.activity_attempts%rowtype;
  v_expected_responses jsonb;
  v_unlock_id uuid;
  v_milestone_item_id uuid := '70000000-0000-4000-8000-000000000004';
  v_attempt_count integer;
  v_milestone_unlocked boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  perform 1 from public.child_profiles cp
    where cp.id = p_child_id and cp.guardian_id = (select auth.uid()) and cp.archived_at is null
    for update;
  if not found then
    raise exception 'child_not_owned' using errcode = '42501';
  end if;
  select * into v_activity from public.activities a
    where a.id = p_activity_id and a.status = 'published';
  if not found then
    raise exception 'activity_not_published' using errcode = '22023';
  end if;
  select ak.answer_key into v_expected_responses
    from private.activity_answer_keys ak where ak.activity_id = p_activity_id;
  if not found then
    raise exception 'activity_answer_not_configured' using errcode = '22023';
  end if;
  if p_responses is distinct from v_expected_responses then
    raise exception 'activity_answers_not_correct' using errcode = '22023';
  end if;
  if p_completed_at < p_started_at or p_completed_at > now() + interval '5 minutes' then
    raise exception 'invalid_attempt_time' using errcode = '22023';
  end if;

  insert into public.activity_attempts (id, child_id, activity_id, outcome, help_used, started_at, completed_at, stars_earned, planks_earned)
  values (p_attempt_id, p_child_id, p_activity_id, 'completed', coalesce(p_help_used, false), p_started_at, p_completed_at, v_activity.reward_stars, v_activity.reward_planks)
  on conflict (child_id, activity_id) do nothing
  returning * into v_attempt;

  if not found then
    select * into v_attempt from public.activity_attempts aa where aa.child_id = p_child_id and aa.activity_id = p_activity_id;
    return jsonb_build_object('first_completion', false, 'stars_earned', 0, 'planks_earned', 0, 'milestone_unlocked', false);
  end if;

  insert into public.skill_progress (child_id, skill_id, state, helped_count, independent_count, last_attempt_at)
  values (p_child_id, v_activity.skill_id, 'practicing', case when p_help_used then 1 else 0 end, case when p_help_used then 0 else 1 end, p_completed_at)
  on conflict (child_id, skill_id) do update set
    state = 'practicing',
    helped_count = public.skill_progress.helped_count + excluded.helped_count,
    independent_count = public.skill_progress.independent_count + excluded.independent_count,
    last_attempt_at = greatest(public.skill_progress.last_attempt_at, excluded.last_attempt_at),
    updated_at = now();

  insert into public.child_building_state (child_id, building_key, level, unlocked_at, upgraded_at)
  values (p_child_id, v_activity.building_key, 1, p_completed_at, p_completed_at)
  on conflict (child_id, building_key) do update set level = greatest(public.child_building_state.level, 1);

  insert into public.child_island_state (child_id, item_id, unlocked_at, placed_at)
  values (p_child_id, v_activity.item_id, p_completed_at, p_completed_at)
  on conflict (child_id, item_id) do nothing;

  select count(*) into v_attempt_count from public.activity_attempts aa where aa.child_id = p_child_id;
  if v_attempt_count >= 3 then
    insert into public.reward_unlocks (child_id, milestone_key, item_id, unlocked_at)
    values (p_child_id, 'three-stations', v_milestone_item_id, p_completed_at)
    on conflict (child_id, milestone_key) do nothing
    returning id into v_unlock_id;
    v_milestone_unlocked := found;
    if v_milestone_unlocked then
      insert into public.child_island_state (child_id, item_id, unlocked_at, placed_at)
      values (p_child_id, v_milestone_item_id, p_completed_at, p_completed_at)
      on conflict (child_id, item_id) do nothing;
      insert into public.mission_progress (child_id, mission_key, state, completed_at, reward_unlock_id)
      values (p_child_id, 'three-stations', 'completed', p_completed_at, v_unlock_id)
      on conflict (child_id, mission_key) do update set state = 'completed', completed_at = excluded.completed_at, reward_unlock_id = excluded.reward_unlock_id;
    end if;
  end if;

  return jsonb_build_object(
    'first_completion', true,
    'stars_earned', v_attempt.stars_earned,
    'planks_earned', v_attempt.planks_earned,
    'milestone_unlocked', v_milestone_unlocked
  );
end;
$$;

revoke all on function private.complete_activity_attempt_impl(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) from public, anon, authenticated, service_role;
grant execute on function private.complete_activity_attempt_impl(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) to authenticated;

create or replace function public.complete_activity_attempt(
  p_attempt_id uuid,
  p_child_id uuid,
  p_activity_id uuid,
  p_responses jsonb,
  p_help_used boolean,
  p_started_at timestamptz,
  p_completed_at timestamptz
)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select private.complete_activity_attempt_impl(
    p_attempt_id, p_child_id, p_activity_id, p_responses, p_help_used, p_started_at, p_completed_at
  );
$$;
revoke all on function public.complete_activity_attempt(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.complete_activity_attempt(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) to authenticated;

create or replace function private.upgrade_child_building_impl(p_child_id uuid, p_building_key text, p_expected_level smallint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_building public.island_buildings%rowtype;
  v_level smallint;
  v_earned integer;
  v_bonus integer;
  v_spent integer;
  v_balance integer;
begin
  if (select auth.uid()) is null then
    raise exception 'child_not_owned' using errcode = '42501';
  end if;
  perform 1 from public.child_profiles cp
    where cp.id = p_child_id and cp.guardian_id = (select auth.uid()) and cp.archived_at is null
    for update;
  if not found then
    raise exception 'child_not_owned' using errcode = '42501';
  end if;
  select * into v_building from public.island_buildings b where b.building_key = p_building_key and b.published;
  if not found then raise exception 'building_not_published' using errcode = '22023'; end if;

  select coalesce(s.level, v_building.starting_level) into v_level
    from (select 1) seed
    left join public.child_building_state s on s.child_id = p_child_id and s.building_key = p_building_key;
  if v_level is distinct from p_expected_level then raise exception 'building_state_changed' using errcode = '40001'; end if;
  if v_level < 0 or v_level >= 3 then raise exception 'building_not_upgradeable' using errcode = '22023'; end if;

  select coalesce(sum(aa.planks_earned), 0) into v_earned from public.activity_attempts aa where aa.child_id = p_child_id;
  select case when exists (select 1 from public.reward_unlocks ru where ru.child_id = p_child_id and ru.milestone_key = 'three-stations') then 3 else 0 end into v_bonus;
  select coalesce(sum(s.planks_spent), 0) into v_spent
    from public.child_building_state s where s.child_id = p_child_id;
  v_balance := v_earned + v_bonus - v_spent;
  if v_balance < 2 then raise exception 'not_enough_planks' using errcode = '22023'; end if;

  insert into public.child_building_state (child_id, building_key, level, planks_spent, unlocked_at, upgraded_at)
  values (p_child_id, p_building_key, v_level + 1, 2, case when v_level = 0 then now() else null end, now())
  on conflict (child_id, building_key) do update set
    level = excluded.level,
    planks_spent = public.child_building_state.planks_spent + 2,
    upgraded_at = excluded.upgraded_at;
  return jsonb_build_object('level', v_level + 1, 'planks_balance', v_balance - 2);
end;
$$;

revoke all on function private.upgrade_child_building_impl(uuid, text, smallint) from public, anon, authenticated, service_role;
grant execute on function private.upgrade_child_building_impl(uuid, text, smallint) to authenticated;

create or replace function public.upgrade_child_building(p_child_id uuid, p_building_key text, p_expected_level smallint)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select private.upgrade_child_building_impl(p_child_id, p_building_key, p_expected_level);
$$;
revoke all on function public.upgrade_child_building(uuid, text, smallint) from public, anon, authenticated, service_role;
grant execute on function public.upgrade_child_building(uuid, text, smallint) to authenticated;

create or replace function private.place_island_item_impl(p_child_id uuid, p_item_id uuid, p_position text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null or not private.is_guardian_of_child(p_child_id) then
    raise exception 'child_not_owned' using errcode = '42501';
  end if;
  if p_position is null or p_position not in ('shore', 'garden', 'near-homes') then
    raise exception 'invalid_island_position' using errcode = '22023';
  end if;
  update public.child_island_state
    set placement = jsonb_build_object('position', p_position), placed_at = coalesce(placed_at, now())
    where child_id = p_child_id and item_id = p_item_id;
  if not found then raise exception 'island_item_not_owned' using errcode = '42501'; end if;
  return jsonb_build_object('item_id', p_item_id, 'position', p_position);
end;
$$;

revoke all on function private.place_island_item_impl(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function private.place_island_item_impl(uuid, uuid, text) to authenticated;

create or replace function public.place_island_item(p_child_id uuid, p_item_id uuid, p_position text)
returns jsonb
language sql
security invoker
set search_path = public, pg_temp
as $$
  select private.place_island_item_impl(p_child_id, p_item_id, p_position);
$$;
revoke all on function public.place_island_item(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.place_island_item(uuid, uuid, text) to authenticated;
