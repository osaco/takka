create table public.guardian_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ar',
  audio_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.guardian_profiles(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 28),
  avatar_key text not null default '🐢' check (char_length(avatar_key) <= 8),
  grade smallint not null default 1 check (grade between 1 and 6),
  audio_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index child_profiles_guardian_idx on public.child_profiles (guardian_id, created_at);

create table public.content_packs (
  id uuid primary key default gen_random_uuid(),
  grade smallint not null check (grade between 1 and 6),
  subject text not null,
  term text not null default 'sample',
  version integer not null default 1 check (version > 0),
  locale text not null default 'ar',
  coverage_note text not null default 'محتوى تجريبي محايد، لا يدّعي تغطية منهاج معتمد.',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (grade, subject, term, version)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.content_packs(id) on delete cascade,
  order_index smallint not null check (order_index > 0),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  unique (pack_id, order_index)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  goal text not null,
  prerequisite_ids uuid[] not null default '{}',
  source_id uuid,
  review_state text not null default 'draft' check (review_state in ('draft', 'reviewed', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.island_buildings (
  id uuid primary key default gen_random_uuid(),
  building_key text not null unique check (building_key in ('letters', 'numbers', 'stories')),
  subject text not null,
  purpose text not null,
  fixed_milestone_key text,
  asset_key text not null,
  starting_level smallint not null default 0 check (starting_level between 0 and 3),
  published boolean not null default false
);

create table public.island_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  fixed_milestone_key text,
  display_name text not null,
  asset_key text not null,
  published boolean not null default false
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  activity_type text not null check (activity_type in ('choice', 'sequence', 'counting')),
  instruction text not null,
  model_payload jsonb not null default '{}'::jsonb,
  interaction_payload jsonb not null default '{}'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  audio_asset_id uuid,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  building_key text not null references public.island_buildings(building_key),
  reward_stars smallint not null default 5 check (reward_stars between 0 and 20),
  reward_planks smallint not null default 1 check (reward_planks between 0 and 5),
  item_id uuid not null references public.island_items(id),
  created_at timestamptz not null default now()
);

create table public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  state text not null default 'new' check (state in ('new', 'practicing', 'mastered', 'review')),
  helped_count integer not null default 0 check (helped_count >= 0),
  independent_count integer not null default 0 check (independent_count >= 0),
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_id, skill_id)
);

create table public.activity_attempts (
  id uuid primary key,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id),
  outcome text not null check (outcome in ('completed')),
  help_used boolean not null default false,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  sync_state text not null default 'synced' check (sync_state in ('synced')),
  stars_earned smallint not null default 0 check (stars_earned between 0 and 20),
  planks_earned smallint not null default 0 check (planks_earned between 0 and 5),
  unique (child_id, activity_id),
  check (completed_at >= started_at)
);
create index activity_attempts_child_completed_idx on public.activity_attempts (child_id, completed_at desc);

create table public.child_building_state (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  building_key text not null references public.island_buildings(building_key),
  level smallint not null default 1 check (level between 1 and 3),
  planks_spent integer not null default 0 check (planks_spent >= 0),
  placement jsonb,
  unlocked_at timestamptz,
  upgraded_at timestamptz,
  unique (child_id, building_key)
);

create table public.child_island_state (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  item_id uuid not null references public.island_items(id),
  placement jsonb,
  unlocked_at timestamptz not null default now(),
  placed_at timestamptz,
  unique (child_id, item_id)
);

create table public.learning_missions (
  id uuid primary key default gen_random_uuid(),
  mission_key text not null unique,
  skill_ids uuid[] not null default '{}',
  objective_type text not null,
  fixed_reward_key text,
  content_version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived'))
);

create table public.reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  milestone_key text not null,
  item_id uuid references public.island_items(id),
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (child_id, milestone_key)
);

create table public.mission_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  mission_key text not null references public.learning_missions(mission_key),
  state text not null default 'in_progress' check (state in ('in_progress', 'completed')),
  completed_at timestamptz,
  reward_unlock_id uuid references public.reward_unlocks(id) on delete set null,
  unique (child_id, mission_key)
);

create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  grade smallint check (grade between 1 and 6),
  subject text,
  edition text,
  page_pdf integer,
  page_printed text,
  unit text,
  evidence_note text,
  created_at timestamptz not null default now()
);

alter table public.skills add constraint skills_source_id_fkey foreign key (source_id) references public.source_records(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger guardian_profiles_set_updated_at before update on public.guardian_profiles for each row execute function public.set_updated_at();
create trigger child_profiles_set_updated_at before update on public.child_profiles for each row execute function public.set_updated_at();
create trigger skill_progress_set_updated_at before update on public.skill_progress for each row execute function public.set_updated_at();

insert into public.content_packs (id, grade, subject, term, version, locale, status, published_at)
values ('20000000-0000-4000-8000-000000000001', 1, 'تجربة تعلم محايدة', 'starter-sample', 1, 'ar', 'published', now());

insert into public.units (id, pack_id, order_index, title, status) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'محطات البداية', 'published');

insert into public.skills (id, unit_id, goal, review_state) values
  ('30000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'تمييز صوت حرف الباء في كلمات مألوفة', 'approved'),
  ('30000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'عدّ مجموعة صغيرة دون تكرار', 'approved'),
  ('30000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', 'تحديد ترتيب حدثين في حكاية قصيرة', 'approved');

insert into public.island_buildings (id, building_key, subject, purpose, asset_key, starting_level, published) values
  ('60000000-0000-4000-8000-000000000001', 'letters', 'حروف وكلمات', 'اكتشاف أصوات الحروف والكلمات', 'house-letters', 1, true),
  ('60000000-0000-4000-8000-000000000002', 'numbers', 'عدّ وأنماط', 'ملاحظة الأعداد والأنماط', 'house-numbers', 0, true),
  ('60000000-0000-4000-8000-000000000003', 'stories', 'فهم وتسلسل', 'فهم ترتيب أحداث الحكاية', 'story-library', 0, true);

insert into public.island_items (id, item_key, display_name, asset_key, published) values
  ('70000000-0000-4000-8000-000000000001', 'flower-patch', 'رقعة زهور', 'flower-patch', true),
  ('70000000-0000-4000-8000-000000000002', 'stone-path', 'ممر حجري', 'stone-path', true),
  ('70000000-0000-4000-8000-000000000003', 'tiny-lantern', 'فانوس الحكاية', 'tiny-lantern', true),
  ('70000000-0000-4000-8000-000000000004', 'sea-lantern', 'فانوس البحر', 'sea-lantern', true);

insert into public.activities (id, skill_id, activity_type, instruction, model_payload, interaction_payload, hints, feedback, version, status, building_key, reward_stars, reward_planks, item_id) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'choice', 'اسمع الكلمة، وانتبه إلى بدايتها.', '{"title":"صوت حرف ب"}', '{"answer_key":["ب","باب"]}', '["ابدأ الصوت مع الشفتين وهما تلتقيان.","قل الكلمات بهدوء، أيها يبدأ بباء؟"]', '{"correct":"أحسنت الانتباه.","retry":"قريب! جرّب مرة ثانية."}', 1, 'published', 'letters', 5, 1, '70000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'counting', 'نعدّ كل شكل مرة واحدة.', '{"title":"نعدّ حتى أربعة"}', '{"answer_key":["٤","★ ★ ★ ★"]}', '["المس كل حبّة وعدّها بصوتك.","ابدأ من الأولى، ثم عدّ إلى الرابعة."]', '{"correct":"أحسنت العدّ.","retry":"خذ وقتك وعدّها مرة أخرى."}', 1, 'published', 'numbers', 5, 1, '70000000-0000-4000-8000-000000000002'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'sequence', 'نفهم ما حدث أولاً في حكاية قصيرة.', '{"title":"حكاية البذرة"}', '{"answer_key":["وجدت بذرة","سقتها"]}', '["ابحث عن أول فعل في الحكاية.","تذكّر الجملة التي جاءت بعد التراب."]', '{"correct":"رتبت الحكاية بعناية.","retry":"ارجع إلى ترتيب الأحداث بهدوء."}', 1, 'published', 'stories', 5, 1, '70000000-0000-4000-8000-000000000003');

insert into public.learning_missions (id, mission_key, skill_ids, objective_type, fixed_reward_key, content_version, status)
values ('80000000-0000-4000-8000-000000000001', 'three-stations', array['30000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000003'::uuid], 'complete_all_starter_activities', 'three-stations', 1, 'published');

create or replace function public.is_guardian_of_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.child_profiles cp
    where cp.id = p_child_id and cp.guardian_id = (select auth.uid()) and cp.archived_at is null
  );
$$;

revoke all on function public.is_guardian_of_child(uuid) from public, anon;
grant execute on function public.is_guardian_of_child(uuid) to authenticated;

alter table public.guardian_profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.content_packs enable row level security;
alter table public.units enable row level security;
alter table public.skills enable row level security;
alter table public.activities enable row level security;
alter table public.skill_progress enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.island_buildings enable row level security;
alter table public.child_building_state enable row level security;
alter table public.island_items enable row level security;
alter table public.child_island_state enable row level security;
alter table public.learning_missions enable row level security;
alter table public.mission_progress enable row level security;
alter table public.reward_unlocks enable row level security;
alter table public.source_records enable row level security;

create policy guardian_profiles_owner on public.guardian_profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy child_profiles_owner_select on public.child_profiles
  for select to authenticated using (guardian_id = (select auth.uid()));
create policy child_profiles_owner_insert on public.child_profiles
  for insert to authenticated with check (guardian_id = (select auth.uid()));
create policy child_profiles_owner_update on public.child_profiles
  for update to authenticated using (guardian_id = (select auth.uid())) with check (guardian_id = (select auth.uid()));
create policy child_profiles_owner_delete on public.child_profiles
  for delete to authenticated using (guardian_id = (select auth.uid()));

create policy content_packs_published_read on public.content_packs
  for select to anon, authenticated using (status = 'published');
create policy units_published_read on public.units
  for select to anon, authenticated using (
    status = 'published' and exists (select 1 from public.content_packs cp where cp.id = pack_id and cp.status = 'published')
  );
create policy skills_published_read on public.skills
  for select to anon, authenticated using (
    review_state = 'approved' and exists (
      select 1 from public.units u join public.content_packs cp on cp.id = u.pack_id
      where u.id = unit_id and u.status = 'published' and cp.status = 'published'
    )
  );
create policy activities_published_read on public.activities
  for select to anon, authenticated using (
    status = 'published' and exists (
      select 1 from public.skills s
      join public.units u on u.id = s.unit_id
      join public.content_packs cp on cp.id = u.pack_id
      where s.id = skill_id and s.review_state = 'approved' and u.status = 'published' and cp.status = 'published'
    )
  );
create policy island_buildings_published_read on public.island_buildings
  for select to anon, authenticated using (published);
create policy island_items_published_read on public.island_items
  for select to anon, authenticated using (published);
create policy missions_published_read on public.learning_missions
  for select to anon, authenticated using (status = 'published');

create policy skill_progress_owner_read on public.skill_progress
  for select to authenticated using (public.is_guardian_of_child(child_id));
create policy activity_attempts_owner_read on public.activity_attempts
  for select to authenticated using (public.is_guardian_of_child(child_id));
create policy child_building_state_owner_read on public.child_building_state
  for select to authenticated using (public.is_guardian_of_child(child_id));
create policy child_island_state_owner_read on public.child_island_state
  for select to authenticated using (public.is_guardian_of_child(child_id));
create policy mission_progress_owner_read on public.mission_progress
  for select to authenticated using (public.is_guardian_of_child(child_id));
create policy reward_unlocks_owner_read on public.reward_unlocks
  for select to authenticated using (public.is_guardian_of_child(child_id));

grant usage on schema public to anon, authenticated;
revoke all on public.guardian_profiles, public.child_profiles, public.content_packs, public.units, public.skills, public.activities, public.skill_progress, public.activity_attempts, public.island_buildings, public.child_building_state, public.island_items, public.child_island_state, public.learning_missions, public.mission_progress, public.reward_unlocks, public.source_records from anon, authenticated;
grant select on public.content_packs, public.units, public.skills, public.activities, public.island_buildings, public.island_items, public.learning_missions to anon, authenticated;
grant select, insert, update, delete on public.guardian_profiles, public.child_profiles to authenticated;
grant select on public.skill_progress, public.activity_attempts, public.child_building_state, public.child_island_state, public.mission_progress, public.reward_unlocks to authenticated;

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
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_activity public.activities%rowtype;
  v_attempt public.activity_attempts%rowtype;
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
  if p_responses is distinct from (v_activity.interaction_payload -> 'answer_key') then
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

revoke all on function public.complete_activity_attempt(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) from public, anon;
grant execute on function public.complete_activity_attempt(uuid, uuid, uuid, jsonb, boolean, timestamptz, timestamptz) to authenticated;

create or replace function public.upgrade_child_building(p_child_id uuid, p_building_key text, p_expected_level smallint)
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

revoke all on function public.upgrade_child_building(uuid, text, smallint) from public, anon;
grant execute on function public.upgrade_child_building(uuid, text, smallint) to authenticated;

create or replace function public.place_island_item(p_child_id uuid, p_item_id uuid, p_position text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null or not public.is_guardian_of_child(p_child_id) then
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

revoke all on function public.place_island_item(uuid, uuid, text) from public, anon;
grant execute on function public.place_island_item(uuid, uuid, text) to authenticated;
