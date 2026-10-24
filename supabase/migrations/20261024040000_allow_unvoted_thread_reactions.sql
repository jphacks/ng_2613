alter table public.thread_reactions
  alter column reactor_vote_value drop not null;

-- Serialize vote inserts/changes with reaction snapshots, including the case where
-- no vote row exists yet. Hash collisions only cause harmless extra serialization.
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
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.frame_id::text || ':' || new.user_id::text, 0)
  );

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.frame_id is distinct from old.frame_id
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'vote identity fields cannot be changed'
        using errcode = '22000';
    end if;

    if new.value is not distinct from old.value then
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

create or replace function public.set_thread_reaction_vote_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_frame_id uuid;
  snapshot_value smallint;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> new.user_id then
    raise exception 'reaction user must match the authenticated user'
      using errcode = '42501';
  end if;

  select th.frame_id
  into target_frame_id
  from public.threads as th
  join public.frames as f on f.id = th.frame_id
  join public.topics as t on t.id = f.topic_id
  where th.id = new.thread_id
    and th.deleted_at is null
    and t.status <> 'hidden';

  if not found then
    raise exception 'a visible, non-deleted thread is required'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_frame_id::text || ':' || new.user_id::text, 0)
  );

  select v.value
  into snapshot_value
  from public.votes as v
  where v.frame_id = target_frame_id
    and v.user_id = new.user_id
  for share;

  -- NOT FOUND intentionally means an unvoted reaction snapshot of NULL.
  new.reactor_vote_value := snapshot_value;
  return new;
end;
$$;

revoke all on function public.set_thread_reaction_vote_snapshot()
  from public, anon, authenticated;
