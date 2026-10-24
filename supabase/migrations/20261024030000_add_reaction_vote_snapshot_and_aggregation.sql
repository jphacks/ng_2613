-- Historical reaction-time vote values cannot be reconstructed reliably.
-- Abort instead of guessing or deleting existing reaction data.
do $$
begin
  if exists (select 1 from public.thread_reactions) then
    raise exception
      'thread_reactions contains existing rows; decide and perform an explicit snapshot backfill before applying this migration'
      using errcode = 'P0001';
  end if;
end;
$$;

alter table public.thread_reactions
  add column reactor_vote_value smallint not null,
  add constraint thread_reactions_vote_value_check
    check (reactor_vote_value between 1 and 5);

-- Read and lock the matching vote row in the same transaction as the reaction
-- insert. FOR SHARE prevents a concurrent vote update until this insert finishes.
create function public.set_thread_reaction_vote_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_value smallint;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> new.user_id then
    raise exception 'reaction user must match the authenticated user'
      using errcode = '42501';
  end if;

  select v.value
  into snapshot_value
  from public.threads as th
  join public.frames as f on f.id = th.frame_id
  join public.topics as t on t.id = f.topic_id
  join public.votes as v
    on v.frame_id = th.frame_id
   and v.user_id = new.user_id
  where th.id = new.thread_id
    and th.deleted_at is null
    and t.status <> 'hidden'
  for share of v;

  if not found then
    raise exception 'a visible thread and matching frame vote are required'
      using errcode = '42501';
  end if;

  new.reactor_vote_value := snapshot_value;
  return new;
end;
$$;

revoke all on function public.set_thread_reaction_vote_snapshot()
  from public, anon, authenticated;

create trigger set_thread_reaction_vote_snapshot
  before insert on public.thread_reactions
  for each row execute function public.set_thread_reaction_vote_snapshot();

-- Internal-only aggregation for trusted ranking processes. The function owner
-- bypasses reaction RLS, while callers receive counts only and never user IDs or
-- individual snapshot values.
create function private.get_thread_reaction_counts(target_frame_id uuid)
returns table (
  thread_id uuid,
  agree_count bigint,
  disagree_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    th.id,
    count(tr.id) filter (where tr.reactor_vote_value in (4, 5))::bigint,
    count(tr.id) filter (where tr.reactor_vote_value in (1, 2))::bigint
  from public.threads as th
  join public.frames as f on f.id = th.frame_id
  join public.topics as t on t.id = f.topic_id
  left join public.thread_reactions as tr on tr.thread_id = th.id
  where f.id = target_frame_id
    and th.deleted_at is null
    and t.status <> 'hidden'
  group by th.id;
$$;

revoke all on function private.get_thread_reaction_counts(uuid)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.get_thread_reaction_counts(uuid) to service_role;
