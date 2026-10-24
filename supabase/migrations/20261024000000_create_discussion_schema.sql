-- Initial application schema for the political discussion service.
-- Authentication identities remain owned by auth.users.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.users (
  id uuid primary key references auth.users (id) on delete restrict,
  username text not null,
  birth_date date,
  gender text,
  display_mode text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint users_username_not_blank check (btrim(username) <> ''),
  constraint users_role_check check (role in ('user', 'admin'))
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order integer,
  created_at timestamptz not null default now(),
  constraint genres_name_not_blank check (btrim(name) <> '')
);

create table public.middle_topics (
  id uuid primary key default gen_random_uuid(),
  genre_id uuid not null references public.genres (id) on delete restrict,
  name text not null,
  description text,
  sort_order integer,
  created_at timestamptz not null default now(),
  constraint middle_topics_name_not_blank check (btrim(name) <> '')
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  middle_topic_id uuid not null references public.middle_topics (id) on delete restrict,
  name text not null,
  description text,
  sort_order integer,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint topics_name_not_blank check (btrim(name) <> ''),
  constraint topics_status_check check (status in ('open', 'locked', 'hidden'))
);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  constraint periods_code_not_blank check (btrim(code) <> ''),
  constraint periods_date_order_check check (start_date < end_date),
  constraint periods_status_check check (status in ('active', 'closed'))
);

create table public.frames (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete restrict,
  period_id uuid not null references public.periods (id) on delete restrict,
  type text not null,
  question text,
  sort_order integer,
  created_at timestamptz not null default now(),
  constraint frames_type_check check (type in ('question', 'pp', 'other')),
  constraint frames_question_required_check check (
    type <> 'question' or (question is not null and btrim(question) <> '')
  )
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references public.frames (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  stance text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint votes_stance_check check (stance in ('agree', 'disagree')),
  constraint votes_frame_user_key unique (frame_id, user_id)
);

-- threads.video_id is added after videos to keep the circular relationship explicit.
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references public.frames (id) on delete restrict,
  type text not null,
  user_id uuid not null references public.users (id) on delete restrict,
  stance text,
  title text not null,
  body text not null,
  video_id uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint threads_type_check check (type in ('user', 'video')),
  constraint threads_stance_check check (stance in ('agree', 'disagree') or stance is null),
  constraint threads_title_not_blank check (btrim(title) <> ''),
  constraint threads_body_not_blank check (btrim(body) <> ''),
  constraint threads_type_fields_check check (
    (type = 'user' and stance is not null and video_id is null)
    or (type = 'video' and stance is null and video_id is not null)
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  stance text,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint comments_stance_check check (stance in ('agree', 'disagree') or stance is null),
  constraint comments_body_not_blank check (btrim(body) <> '')
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  published_at timestamptz,
  source_thread_id uuid references public.threads (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint videos_title_not_blank check (btrim(title) <> ''),
  constraint videos_url_not_blank check (btrim(url) <> '')
);

alter table public.threads
  add constraint threads_video_id_fkey
  foreign key (video_id) references public.videos (id) on delete restrict;

create table public.banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  created_at timestamptz not null default now(),
  constraint banned_words_word_not_blank check (btrim(word) <> '')
);

create table public.glossary (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  definition text not null,
  created_at timestamptz not null default now(),
  constraint glossary_term_not_blank check (btrim(term) <> ''),
  constraint glossary_definition_not_blank check (btrim(definition) <> '')
);

create index middle_topics_genre_id_idx on public.middle_topics (genre_id);
create index topics_middle_topic_id_idx on public.topics (middle_topic_id);
create index frames_topic_id_idx on public.frames (topic_id);
create index frames_period_id_idx on public.frames (period_id);
-- votes_frame_user_key already supports frame_id lookups through its leading column.
create index votes_user_id_idx on public.votes (user_id);
create index threads_frame_id_idx on public.threads (frame_id);
create index threads_user_id_idx on public.threads (user_id);
create index comments_thread_id_idx on public.comments (thread_id);
create index comments_user_id_idx on public.comments (user_id);
create index videos_source_thread_id_idx on public.videos (source_thread_id)
  where source_thread_id is not null;

-- Create an application profile after a phone-auth identity is created. A generated
-- placeholder keeps Auth signup independent from profile completion.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');

  insert into public.users (id, username)
  values (
    new.id,
    coalesce(requested_username, 'user-' || left(replace(new.id::text, '-', ''), 12))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Defense in depth: column grants already omit role, and this trigger prevents an
-- authenticated owner from changing it even if broader grants are added later.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) = old.id then
    raise exception 'users may not change their own role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_self_role_change() from public, anon, authenticated;

create trigger prevent_users_self_role_change
  before update on public.users
  for each row execute function public.prevent_self_role_change();

-- Enforce ownership fields, server timestamps, valid voting targets, and the
-- seven-day cooldown independently of the API client.
create or replace function public.enforce_vote_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_is_open boolean;
  changed_at timestamptz := statement_timestamp();
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.frame_id is distinct from old.frame_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'vote identity fields cannot be changed'
        using errcode = '22000';
    end if;

    if new.stance is not distinct from old.stance then
      return old;
    end if;

    if changed_at < old.updated_at + interval '7 days' then
      raise exception 'vote cannot be changed until seven days after the previous vote'
        using errcode = 'P0001';
    end if;
  end if;

  select exists (
    select 1
    from public.frames as f
    join public.topics as t on t.id = f.topic_id
    join public.periods as p on p.id = f.period_id
    where f.id = new.frame_id
      and f.type = 'question'
      and t.status = 'open'
      and p.status = 'active'
      and current_date between p.start_date and p.end_date
  ) into target_is_open;

  if not target_is_open then
    raise exception 'votes are accepted only for open question frames in the active period'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := changed_at;
  end if;
  new.updated_at := changed_at;

  return new;
end;
$$;

revoke all on function public.enforce_vote_rules() from public, anon, authenticated;

create trigger enforce_votes
  before insert or update on public.votes
  for each row execute function public.enforce_vote_rules();

create or replace function public.protect_thread_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.frame_id is distinct from old.frame_id
    or new.user_id is distinct from old.user_id
    or new.type is distinct from old.type
    or new.video_id is distinct from old.video_id
    or new.created_at is distinct from old.created_at then
    raise exception 'thread identity fields cannot be changed'
      using errcode = '22000';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_thread_identity() from public, anon, authenticated;

create trigger protect_threads_identity
  before update on public.threads
  for each row execute function public.protect_thread_identity();

create or replace function public.protect_comment_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.thread_id is distinct from old.thread_id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at then
    raise exception 'comment identity fields cannot be changed'
      using errcode = '22000';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_comment_identity() from public, anon, authenticated;

create trigger protect_comments_identity
  before update on public.comments
  for each row execute function public.protect_comment_identity();

-- The definer function is kept outside the exposed public schema. It returns only
-- aggregate counts and verifies that the caller is authenticated and the frame is visible.
create or replace function private.get_frame_vote_counts(target_frame_id uuid)
returns table (frame_id uuid, agree_count bigint, disagree_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    count(v.id) filter (where v.stance = 'agree')::bigint,
    count(v.id) filter (where v.stance = 'disagree')::bigint
  from public.frames as f
  join public.topics as t on t.id = f.topic_id
  left join public.votes as v on v.frame_id = f.id
  where (select auth.uid()) is not null
    and f.id = target_frame_id
    and f.type = 'question'
    and t.status <> 'hidden'
  group by f.id;
$$;

revoke all on function private.get_frame_vote_counts(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.get_frame_vote_counts(uuid) to authenticated;

-- Public RPC wrapper; the privileged implementation above is not directly exposed by
-- the Data API because the private schema is not an exposed schema.
create or replace function public.get_frame_vote_counts(target_frame_id uuid)
returns table (frame_id uuid, agree_count bigint, disagree_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_frame_vote_counts(target_frame_id);
$$;

revoke all on function public.get_frame_vote_counts(uuid) from public, anon;
grant execute on function public.get_frame_vote_counts(uuid) to authenticated;

-- Only the non-sensitive profile fields are exposed to other signed-in users.
create view public.public_profiles
with (security_invoker = false)
as
select id, username, created_at
from public.users
where deleted_at is null;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;

alter table public.users enable row level security;
alter table public.genres enable row level security;
alter table public.middle_topics enable row level security;
alter table public.topics enable row level security;
alter table public.periods enable row level security;
alter table public.frames enable row level security;
alter table public.votes enable row level security;
alter table public.threads enable row level security;
alter table public.comments enable row level security;
alter table public.videos enable row level security;
alter table public.banned_words enable row level security;
alter table public.glossary enable row level security;

-- Remove Supabase's broad default table privileges, then add only client operations.
revoke all on table
  public.users,
  public.genres,
  public.middle_topics,
  public.topics,
  public.periods,
  public.frames,
  public.votes,
  public.threads,
  public.comments,
  public.videos,
  public.banned_words,
  public.glossary
from public, anon, authenticated;

grant select on public.users to authenticated;
grant update (username, birth_date, gender, display_mode, deleted_at)
  on public.users to authenticated;

grant select on
  public.genres,
  public.middle_topics,
  public.topics,
  public.periods,
  public.frames,
  public.videos,
  public.glossary
to authenticated;

grant select on public.votes to authenticated;
grant insert (frame_id, user_id, stance) on public.votes to authenticated;
grant update (stance) on public.votes to authenticated;

grant select on public.threads to authenticated;
grant insert (frame_id, type, user_id, stance, title, body, video_id)
  on public.threads to authenticated;
grant update (stance, title, body, deleted_at) on public.threads to authenticated;

grant select on public.comments to authenticated;
grant insert (thread_id, user_id, stance, body) on public.comments to authenticated;
grant update (stance, body, deleted_at) on public.comments to authenticated;

create policy users_select_own
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy users_update_own
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy genres_select_authenticated
  on public.genres
  for select
  to authenticated
  using (true);

create policy middle_topics_select_authenticated
  on public.middle_topics
  for select
  to authenticated
  using (true);

create policy topics_select_visible
  on public.topics
  for select
  to authenticated
  using (status <> 'hidden');

create policy periods_select_authenticated
  on public.periods
  for select
  to authenticated
  using (true);

create policy frames_select_visible
  on public.frames
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.topics as t
      where t.id = frames.topic_id
        and t.status <> 'hidden'
    )
  );

create policy videos_select_authenticated
  on public.videos
  for select
  to authenticated
  using (true);

create policy glossary_select_authenticated
  on public.glossary
  for select
  to authenticated
  using (true);

create policy votes_select_own
  on public.votes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy votes_insert_own_open_question
  on public.votes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      join public.periods as p on p.id = f.period_id
      where f.id = votes.frame_id
        and f.type = 'question'
        and t.status = 'open'
        and p.status = 'active'
        and current_date between p.start_date and p.end_date
    )
  );

create policy votes_update_own_open_question
  on public.votes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      join public.periods as p on p.id = f.period_id
      where f.id = votes.frame_id
        and f.type = 'question'
        and t.status = 'open'
        and p.status = 'active'
        and current_date between p.start_date and p.end_date
    )
  );

create policy threads_select_visible
  on public.threads
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      where f.id = threads.frame_id
        and t.status <> 'hidden'
    )
  );

create policy threads_insert_own_user_type
  on public.threads
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and type = 'user'
    and video_id is null
    and deleted_at is null
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      join public.periods as p on p.id = f.period_id
      where f.id = threads.frame_id
        and t.status = 'open'
        and p.status = 'active'
        and current_date between p.start_date and p.end_date
    )
  );

create policy threads_update_own
  on public.threads
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and type = 'user'
    and deleted_at is null
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      where f.id = threads.frame_id
        and t.status <> 'hidden'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and type = 'user'
    and exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      where f.id = threads.frame_id
        and t.status <> 'hidden'
    )
  );

create policy comments_select_visible
  on public.comments
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.threads as th
      join public.frames as f on f.id = th.frame_id
      join public.topics as t on t.id = f.topic_id
      where th.id = comments.thread_id
        and th.deleted_at is null
        and t.status <> 'hidden'
    )
  );

create policy comments_insert_own
  on public.comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and deleted_at is null
    and exists (
      select 1
      from public.threads as th
      join public.frames as f on f.id = th.frame_id
      join public.topics as t on t.id = f.topic_id
      join public.periods as p on p.id = f.period_id
      where th.id = comments.thread_id
        and th.deleted_at is null
        and t.status = 'open'
        and p.status = 'active'
        and current_date between p.start_date and p.end_date
    )
  );

create policy comments_update_own
  on public.comments
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and deleted_at is null
    and exists (
      select 1
      from public.threads as th
      join public.frames as f on f.id = th.frame_id
      join public.topics as t on t.id = f.topic_id
      where th.id = comments.thread_id
        and th.deleted_at is null
        and t.status <> 'hidden'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.threads as th
      join public.frames as f on f.id = th.frame_id
      join public.topics as t on t.id = f.topic_id
      where th.id = comments.thread_id
        and th.deleted_at is null
        and t.status <> 'hidden'
    )
  );

-- No policies are intentionally defined for banned_words. Together with the lack
-- of anon/authenticated grants, it is available only to trusted server-side roles.
