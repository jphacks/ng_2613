begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(36);

select has_column(
  'public', 'thread_reactions', 'reactor_vote_value',
  'thread_reactions has a vote snapshot column'
);

select col_type_is(
  'public', 'thread_reactions', 'reactor_vote_value', 'smallint',
  'the reaction vote snapshot uses smallint'
);

select col_is_null(
  'public', 'thread_reactions', 'reactor_vote_value',
  'the reaction vote snapshot allows unvoted NULL values'
);

insert into auth.users (
  id, aud, role, phone, phone_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
select
  user_id, 'authenticated', 'authenticated', phone, now(), '{}'::jsonb,
  '{}'::jsonb, now(), now(), false, false
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, '+819000000001'),
  ('10000000-0000-0000-0000-000000000002'::uuid, '+819000000002'),
  ('10000000-0000-0000-0000-000000000003'::uuid, '+819000000003'),
  ('10000000-0000-0000-0000-000000000004'::uuid, '+819000000004'),
  ('10000000-0000-0000-0000-000000000005'::uuid, '+819000000005'),
  ('10000000-0000-0000-0000-000000000006'::uuid, '+819000000006')
) as test_users(user_id, phone);

insert into public.genres (id, name)
values ('20000000-0000-0000-0000-000000000001', 'Bridge genre');

insert into public.middle_topics (id, genre_id, name)
values (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'Bridge middle topic'
);

insert into public.topics (id, middle_topic_id, name, status)
values
  (
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002', 'Open topic', 'open'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002', 'Future hidden topic', 'open'
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000002', 'Future locked topic', 'open'
  );

insert into public.periods (id, code, start_date, end_date, status)
values (
  '30000000-0000-0000-0000-000000000001', 'BRIDGE-TEST',
  current_date - 1, current_date + 1, 'active'
);

insert into public.frames (id, topic_id, period_id, type, question)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001', 'question', 'Main frame?'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001', 'question', 'Other frame?'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001', 'question', 'Hidden frame?'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000001', 'question', 'Locked frame?'
  );

insert into public.votes (frame_id, user_id, value)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 5),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 3),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 2),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 2),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 1);

insert into public.threads (id, frame_id, type, user_id, stance, title, body)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'user', '10000000-0000-0000-0000-000000000001', 'agree', 'Bridge target', 'Body'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'user', '10000000-0000-0000-0000-000000000001', 'agree', 'Zero target', 'Body'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'user', '10000000-0000-0000-0000-000000000001', 'agree', 'Deleted target', 'Body'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 'user', '10000000-0000-0000-0000-000000000001', 'agree', 'Hidden target', 'Body'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000004', 'user', '10000000-0000-0000-0000-000000000001', 'agree', 'Locked target', 'Body');

update public.threads
set deleted_at = now()
where id = '50000000-0000-0000-0000-000000000003';

update public.topics set status = 'hidden'
where id = '20000000-0000-0000-0000-000000000004';
update public.topics set status = 'locked'
where id = '20000000-0000-0000-0000-000000000005';

alter table public.thread_reactions disable trigger set_thread_reaction_vote_snapshot;

select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id, reactor_vote_value)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 0)$$,
  '23514', null,
  'reaction snapshots reject zero'
);

select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id, reactor_vote_value)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 6)$$,
  '23514', null,
  'reaction snapshots reject six'
);

alter table public.thread_reactions enable trigger set_thread_reaction_vote_snapshot;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')$$,
  'a voter can react to a thread in the same frame'
);

select is(
  (select reactor_vote_value from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001'),
  1::smallint,
  'vote value one is stored as the reaction snapshot'
);

reset role;
grant insert (reactor_vote_value) on public.thread_reactions to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id, reactor_vote_value)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1)$$,
  'a client-supplied snapshot value is accepted only through the DB trigger'
);

select is(
  (select reactor_vote_value from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001'),
  5::smallint,
  'the trigger replaces a fake value with the actual vote value five'
);

reset role;
revoke insert (reactor_vote_value) on public.thread_reactions from authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003')$$,
  'a neutral voter reaction is recorded'
);
select is(
  (select reactor_vote_value from public.thread_reactions),
  3::smallint,
  'neutral vote value three is retained'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005')$$,
  'vote value two is snapshotted for aggregation'
);
select is((select reactor_vote_value from public.thread_reactions), 2::smallint, 'vote value two is retained');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006')$$,
  'a user without a vote can react'
);
select is(
  (select reactor_vote_value from public.thread_reactions),
  null::smallint,
  'an unvoted reaction stores a NULL snapshot'
);

insert into public.votes (frame_id, user_id, value)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 4);
select is(
  (select reactor_vote_value from public.thread_reactions),
  null::smallint,
  'a later initial vote does not rewrite the NULL snapshot'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004')$$,
  'a user with only another-frame vote can still react as unvoted for this frame'
);
select is(
  (select reactor_vote_value from public.thread_reactions),
  null::smallint,
  'another-frame vote is not used for the reaction snapshot'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')$$,
  '23505', null,
  'duplicate reactions remain prohibited'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.thread_reactions), 1, 'users see only their own reaction');
select is_empty(
  $$delete from public.thread_reactions where user_id = '10000000-0000-0000-0000-000000000001' returning id$$,
  'users cannot delete another user reaction'
);
select throws_ok(
  $$update public.thread_reactions set reactor_vote_value = 1$$,
  '42501', null,
  'reaction updates remain prohibited'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'deleted threads reject reactions'
);
select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'hidden-topic threads reject reactions'
);
select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001')$$,
  'locked-topic threads continue to accept reactions from matching voters'
);

reset role;
alter table public.votes disable trigger enforce_votes;
update public.votes set updated_at = now() - interval '8 days'
where frame_id = '40000000-0000-0000-0000-000000000001'
  and user_id = '10000000-0000-0000-0000-000000000001';
alter table public.votes enable trigger enforce_votes;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
update public.votes set value = 5 where frame_id = '40000000-0000-0000-0000-000000000001';
select is(
  (select reactor_vote_value from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001'),
  1::smallint,
  'changing a vote does not rewrite an existing reaction snapshot'
);

delete from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001';
insert into public.thread_reactions (thread_id, user_id)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
select is(
  (select reactor_vote_value from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001'),
  5::smallint,
  'removing and re-adding a reaction captures the latest vote value'
);

reset role;
select is(
  (select disagree_count from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000001') where thread_id = '50000000-0000-0000-0000-000000000001'),
  1::bigint,
  'internal aggregation counts vote values one and two as disagreeing'
);
select is(
  (select agree_count from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000001') where thread_id = '50000000-0000-0000-0000-000000000001'),
  2::bigint,
  'internal aggregation counts vote values four and five as agreeing'
);
select is(
  (select count(*)::bigint from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001')
    - (select agree_count + disagree_count from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000001') where thread_id = '50000000-0000-0000-0000-000000000001'),
  3::bigint,
  'neutral and NULL reactions are excluded from both bridge sides'
);
select results_eq(
  $$select agree_count, disagree_count
    from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000001')
    where thread_id = '50000000-0000-0000-0000-000000000002'$$,
  $$values (0::bigint, 0::bigint)$$,
  'threads without reactions are returned with zero counts'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
delete from public.thread_reactions where thread_id = '50000000-0000-0000-0000-000000000001';
insert into public.thread_reactions (thread_id, user_id)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006');
select is(
  (select reactor_vote_value from public.thread_reactions),
  4::smallint,
  're-adding an formerly unvoted reaction captures the current vote value'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'authenticated users cannot execute the internal aggregation function'
);

reset role;
select is(
  (select pg_get_function_result(p.oid)
   from pg_proc as p
   join pg_namespace as n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname = 'get_thread_reaction_counts'),
  'TABLE(thread_id uuid, agree_count bigint, disagree_count bigint)',
  'the aggregation result exposes counts only'
);
select is(
  (select count(*)::integer from pg_proc as p
   join pg_namespace as n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_thread_reaction_counts'),
  0,
  'no public aggregation RPC is exposed'
);
select is_empty(
  $$select * from private.get_thread_reaction_counts('40000000-0000-0000-0000-000000000003')$$,
  'internal aggregation excludes hidden-topic threads'
);

select * from finish();
rollback;
