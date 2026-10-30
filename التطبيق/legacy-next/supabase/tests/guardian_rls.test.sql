create extension if not exists pgtap with schema extensions;

begin;
set local search_path = extensions, public;

select plan(12);

-- Seed two unrelated families as the database owner, without creating Auth users.
set local session_replication_role = replica;
insert into public.guardian_profiles (id) values
  ('90000000-0000-4000-8000-000000000001'),
  ('90000000-0000-4000-8000-000000000002');
insert into public.child_profiles (id, guardian_id, nickname, avatar_key, grade) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'طفل الأسرة الأولى', '🐢', 1),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'طفل الأسرة الثانية', '🦉', 2);
set local session_replication_role = origin;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.child_profiles),
  1,
  'a guardian can read only the child profile in their family'
);

select is(
  private.is_guardian_of_child('91000000-0000-4000-8000-000000000002'),
  false,
  'the owner check rejects a child belonging to another family'
);

select is(
  (select count(*)::integer from public.activities where interaction_payload ? 'answer_key'),
  0,
  'published activity payloads do not expose answer keys'
);

select throws_ok(
  $$select * from private.activity_answer_keys$$,
  '42501',
  'permission denied for table activity_answer_keys',
  'authenticated clients cannot read private answer keys directly'
);

with changed as (
  update public.child_profiles set nickname = 'تعديل غير مسموح'
  where id = '91000000-0000-4000-8000-000000000002'
  returning id
)
select is(
  (select count(*)::integer from changed),
  0,
  'a guardian cannot modify another family child'
);

select throws_ok(
  $$select public.upgrade_child_building('91000000-0000-4000-8000-000000000002', 'letters', 0::smallint)$$,
  '42501',
  'child_not_owned',
  'a guardian cannot upgrade another family child'
);

select lives_ok(
  $$select public.complete_activity_attempt(
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '["ب","باب"]'::jsonb,
    false,
    now(),
    now()
  )$$,
  'the family owner can record a completed published activity'
);

select lives_ok(
  $$select public.complete_activity_attempt(
    '92000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    '["وجدت بذرة","سقتها"]'::jsonb,
    false,
    now(),
    now()
  )$$,
  'a second published activity can add earned planks'
);

select public.upgrade_child_building('91000000-0000-4000-8000-000000000001', 'numbers', 0::smallint);

select is(
  (select planks_spent from public.child_building_state
    where child_id = '91000000-0000-4000-8000-000000000001' and building_key = 'numbers'),
  2,
  'the first upgrade of an unbuilt house records its full two-plank cost'
);

select throws_ok(
  $$select public.upgrade_child_building('91000000-0000-4000-8000-000000000001', 'numbers', 1::smallint)$$,
  '22023',
  'not_enough_planks',
  'a spent plank balance cannot be reused for another upgrade'
);

select throws_ok(
  $$select public.place_island_item('91000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', null)$$,
  '22023',
  'invalid_island_position',
  'a missing island placement is rejected instead of stored'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.place_island_item('91000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'garden')$$,
  '42501',
  'permission denied for function place_island_item',
  'anonymous visitors cannot call authenticated island RPCs'
);
reset role;

select * from finish();
rollback;
