begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(49);

select is(
  (select count(*)::integer
   from information_schema.tables
   where table_schema = 'public'
     and table_type = 'BASE TABLE'
     and table_name in (
       'users', 'genres', 'middle_topics', 'topics', 'periods', 'frames',
       'votes', 'threads', 'comments', 'videos', 'banned_words', 'glossary'
     )),
  12,
  'all application tables exist'
);

select is(
  (select count(*)::integer
   from pg_class as c
   join pg_namespace as n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'users', 'genres', 'middle_topics', 'topics', 'periods', 'frames',
       'votes', 'threads', 'comments', 'videos', 'banned_words', 'glossary'
     )
     and c.relrowsecurity),
  12,
  'RLS is enabled on every application table'
);

insert into auth.users (
  id, aud, role, phone, phone_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated',
    '+810000000101', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated',
    '+810000000102', now(), '{}'::jsonb, '{"username":"second-user"}'::jsonb,
    now(), now(), false, false
  );

select is(
  (select count(*)::integer from public.users
   where id in (
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000000102'
   )),
  2,
  'auth.users trigger creates application profiles'
);

select ok(
  (select username like 'user-%'
   from public.users where id = '00000000-0000-0000-0000-000000000101'),
  'missing username receives a placeholder'
);

insert into public.genres (id, name)
values ('00000000-0000-0000-0000-000000000201', 'Genre');

insert into public.middle_topics (id, genre_id, name)
values (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000201',
  'Middle topic'
);

insert into public.topics (id, middle_topic_id, name, status)
values
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000202', 'Open topic', 'open'
  ),
  (
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000202', 'Locked topic', 'locked'
  ),
  (
    '00000000-0000-0000-0000-000000000205',
    '00000000-0000-0000-0000-000000000202', 'Hidden topic', 'hidden'
  );

insert into public.periods (id, code, start_date, end_date, status)
values (
  '00000000-0000-0000-0000-000000000301', 'TEST-ACTIVE',
  current_date - 1, current_date + 1, 'active'
);

insert into public.frames (id, topic_id, period_id, type, question)
values
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000301', 'question', 'Open question?'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000301', 'question', 'Locked question?'
  ),
  (
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000205',
    '00000000-0000-0000-0000-000000000301', 'question', 'Hidden question?'
  );

select throws_ok(
  $$insert into public.middle_topics (genre_id, name)
    values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Invalid')$$,
  '23503', null,
  'foreign keys reject missing parents'
);

select throws_ok(
  $$insert into public.topics (middle_topic_id, name, status)
    values ('00000000-0000-0000-0000-000000000202', 'Invalid', 'invalid')$$,
  '23514', null,
  'topic status CHECK rejects unknown values'
);

select throws_ok(
  $$insert into public.periods (code, start_date, end_date, status)
    values ('INVALID-DATES', current_date, current_date, 'active')$$,
  '23514', null,
  'period date CHECK requires start before end'
);

select throws_ok(
  $$insert into public.frames (topic_id, period_id, type)
    values (
      '00000000-0000-0000-0000-000000000203',
      '00000000-0000-0000-0000-000000000301', 'question'
    )$$,
  '23514', null,
  'question frames require question text'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.votes (frame_id, user_id, stance)
    values (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000101', 'agree'
    )$$,
  'a user can cast an initial vote'
);

select throws_ok(
  $$insert into public.votes (frame_id, user_id, stance)
    values (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000101', 'agree'
    )$$,
  '23505', null,
  'one user cannot create duplicate votes for one frame'
);

select is(
  (select count(*)::integer from public.votes),
  1,
  'a user can read their own vote'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.votes),
  0,
  'a user cannot read another user vote'
);

select is_empty(
  $$update public.votes set stance = 'disagree'
    where user_id = '00000000-0000-0000-0000-000000000101'
    returning id$$,
  'a user cannot update another user vote'
);

select lives_ok(
  $$insert into public.votes (frame_id, user_id, stance)
    values (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000102', 'disagree'
    )$$,
  'a second user can vote independently'
);

select results_eq(
  $$select agree_count, disagree_count
    from public.get_frame_vote_counts('00000000-0000-0000-0000-000000000401')$$,
  $$values (1::bigint, 1::bigint)$$,
  'vote RPC exposes aggregate counts only'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.votes set stance = 'disagree'
    where frame_id = '00000000-0000-0000-0000-000000000401'$$,
  'P0001', null,
  'vote changes are rejected during the seven-day cooldown'
);

reset role;
alter table public.votes disable trigger enforce_votes;
update public.votes
set updated_at = statement_timestamp() - interval '8 days'
where frame_id = '00000000-0000-0000-0000-000000000401'
  and user_id = '00000000-0000-0000-0000-000000000101';
alter table public.votes enable trigger enforce_votes;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$update public.votes set stance = 'disagree'
    where frame_id = '00000000-0000-0000-0000-000000000401'$$,
  'vote changes are allowed after seven days'
);

select ok(
  (select updated_at > statement_timestamp() - interval '1 minute'
   from public.votes
   where frame_id = '00000000-0000-0000-0000-000000000401'),
  'successful vote changes refresh updated_at'
);

reset role;
grant update (role) on public.users to authenticated;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.users set role = 'admin'
    where id = '00000000-0000-0000-0000-000000000101'$$,
  '42501', 'users may not change their own role',
  'the role trigger prevents self-promotion even with a future broad grant'
);

reset role;
revoke update (role) on public.users from authenticated;

select is(
  (select role from public.users where id = '00000000-0000-0000-0000-000000000101'),
  'user',
  'failed self-promotion leaves the role unchanged'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.threads (frame_id, type, user_id, stance, title, body)
    values (
      '00000000-0000-0000-0000-000000000401', 'user',
      '00000000-0000-0000-0000-000000000101', 'agree', 'Title', 'Body'
    )$$,
  'a user can create their own user thread'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

select is_empty(
  $$update public.threads set title = 'Hijacked'
    where title = 'Title'
    returning id$$,
  'another user cannot update a thread'
);

reset role;
grant update (frame_id) on public.threads to authenticated;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.threads
    set frame_id = '00000000-0000-0000-0000-000000000402'
    where title = 'Title'$$,
  '22000', 'thread identity fields cannot be changed',
  'thread owners cannot move threads to another frame'
);

reset role;
revoke update (frame_id) on public.threads from authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.comments (thread_id, user_id, stance, body)
    values (
      (select id from public.threads where title = 'Title'),
      '00000000-0000-0000-0000-000000000101', 'agree', 'Comment'
    )$$,
  'a user can create their own comment'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

select is_empty(
  $$update public.comments set body = 'Hijacked'
    where body = 'Comment'
    returning id$$,
  'another user cannot update a comment'
);

reset role;
grant update (thread_id) on public.comments to authenticated;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.comments
    set thread_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    where body = 'Comment'$$,
  '22000', 'comment identity fields cannot be changed',
  'comment owners cannot move comments to another thread'
);

reset role;
revoke update (thread_id) on public.comments from authenticated;

insert into public.threads (id, frame_id, type, user_id, stance, title, body)
values (
  '00000000-0000-0000-0000-000000000502',
  '00000000-0000-0000-0000-000000000403', 'user',
  '00000000-0000-0000-0000-000000000101', 'agree', 'Hidden title', 'Hidden body'
);

insert into public.comments (id, thread_id, user_id, body)
values (
  '00000000-0000-0000-0000-000000000602',
  '00000000-0000-0000-0000-000000000502',
  '00000000-0000-0000-0000-000000000101', 'Hidden comment'
);

insert into public.banned_words (word) values ('blocked');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.topics
   where id = '00000000-0000-0000-0000-000000000205'),
  0,
  'hidden topics are not visible'
);

select is(
  (select count(*)::integer from public.frames
   where id = '00000000-0000-0000-0000-000000000403'),
  0,
  'frames under hidden topics are not visible'
);

select is(
  (select count(*)::integer from public.threads
   where id = '00000000-0000-0000-0000-000000000502'),
  0,
  'threads under hidden topics are not visible'
);

select is(
  (select count(*)::integer from public.comments
   where id = '00000000-0000-0000-0000-000000000602'),
  0,
  'comments under hidden topics are not visible'
);

select throws_ok(
  $$select * from public.banned_words$$,
  '42501', null,
  'authenticated users cannot access banned words'
);

select throws_ok(
  $$insert into public.threads (frame_id, type, user_id, stance, title, body)
    values (
      '00000000-0000-0000-0000-000000000402', 'user',
      '00000000-0000-0000-0000-000000000101', 'agree', 'Title', 'Body'
    )$$,
  '42501', null,
  'locked topics reject new threads'
);

select results_eq(
  $$select agree_count, disagree_count
    from public.get_frame_vote_counts('00000000-0000-0000-0000-000000000401')$$,
  $$values (0::bigint, 2::bigint)$$,
  'aggregate counts reflect the allowed vote change'
);

select throws_ok(
  $$delete from public.votes
    where user_id = '00000000-0000-0000-0000-000000000101'$$,
  '42501', null,
  'authenticated users cannot physically delete votes'
);

select is(
  (select count(*)::integer
   from information_schema.role_table_grants
   where grantee = 'anon'
     and table_schema = 'public'
     and table_name in (
       'users', 'genres', 'middle_topics', 'topics', 'periods', 'frames',
       'votes', 'threads', 'comments', 'videos', 'banned_words', 'glossary'
     )),
  0,
  'anon has no application table grants'
);

select throws_ok(
  $$insert into public.threads (frame_id, type, user_id, title, body)
    values (
      '00000000-0000-0000-0000-000000000401', 'user',
      '00000000-0000-0000-0000-000000000101', 'No stance', 'Body'
    )$$,
  '23514', null,
  'user threads require a stance'
);

reset role;

insert into public.threads (id, frame_id, type, user_id, stance, title, body)
values
  (
    '00000000-0000-0000-0000-000000000503',
    '00000000-0000-0000-0000-000000000402', 'user',
    '00000000-0000-0000-0000-000000000101', 'agree',
    'Locked topic thread', 'Locked topic body'
  ),
  (
    '00000000-0000-0000-0000-000000000504',
    '00000000-0000-0000-0000-000000000401', 'user',
    '00000000-0000-0000-0000-000000000101', 'agree',
    'Deleted thread', 'Deleted body'
  );

update public.threads
set deleted_at = now()
where id = '00000000-0000-0000-0000-000000000504';

select has_table(
  'public',
  'thread_reactions',
  'thread_reactions table exists'
);

select ok(
  (select c.relrowsecurity
   from pg_class as c
   join pg_namespace as n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'thread_reactions'),
  'RLS is enabled on thread_reactions'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      (select id from public.threads where title = 'Title'),
      '00000000-0000-0000-0000-000000000101'
    )$$,
  'an authenticated user can react to a visible thread'
);

select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      (select id from public.threads where title = 'Title'),
      '00000000-0000-0000-0000-000000000101'
    )$$,
  '23505', null,
  'duplicate reactions by the same user are rejected'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.thread_reactions),
  0,
  'a user cannot read another user reaction'
);

select is_empty(
  $$delete from public.thread_reactions
    where user_id = '00000000-0000-0000-0000-000000000101'
    returning id$$,
  'a user cannot delete another user reaction'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select lives_ok(
  $$delete from public.thread_reactions
    where user_id = '00000000-0000-0000-0000-000000000101'$$,
  'a user can remove their own reaction'
);

select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      (select id from public.threads where title = 'Title'),
      '00000000-0000-0000-0000-000000000101'
    )$$,
  'a user can react again after removing the reaction'
);

select throws_ok(
  $$update public.thread_reactions set created_at = now()$$,
  '42501', null,
  'authenticated users cannot update reactions'
);

select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      '00000000-0000-0000-0000-000000000504',
      '00000000-0000-0000-0000-000000000101'
    )$$,
  '42501', null,
  'reactions to logically deleted threads are rejected'
);

select throws_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      '00000000-0000-0000-0000-000000000502',
      '00000000-0000-0000-0000-000000000101'
    )$$,
  '42501', null,
  'reactions to threads under hidden topics are rejected'
);

select lives_ok(
  $$insert into public.thread_reactions (thread_id, user_id)
    values (
      '00000000-0000-0000-0000-000000000503',
      '00000000-0000-0000-0000-000000000101'
    )$$,
  'reactions to existing threads under locked topics are allowed'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select * from public.thread_reactions$$,
  '42501', null,
  'anon cannot access thread reactions'
);

reset role;
select * from finish();
rollback;
