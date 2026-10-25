-- A binary agree/disagree vote cannot be converted to a five-point value without
-- making a product decision. Abort rather than silently transforming or deleting data.
do $$
begin
  if exists (select 1 from public.votes) then
    raise exception
      'votes contains existing rows; decide and perform an explicit data migration before applying the five-point scale'
      using errcode = 'P0001';
  end if;
end;
$$;

-- PostgreSQL cannot change a function return table in place. Drop the public
-- wrapper first because it depends on the private implementation.
drop function public.get_frame_vote_counts(uuid);
drop function private.get_frame_vote_counts(uuid);

alter table public.votes
  drop column stance,
  add column value smallint not null,
  add constraint votes_value_check check (value between 1 and 5);

revoke insert, update on public.votes from authenticated;
grant insert (frame_id, user_id, value) on public.votes to authenticated;
grant update (value) on public.votes to authenticated;

-- Keep the existing voting target checks, immutable identity fields, server-owned
-- timestamps, and seven-day cooldown. Only the compared vote field changes.
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

create function private.get_frame_vote_counts(target_frame_id uuid)
returns table (
  frame_id uuid,
  count_1 bigint,
  count_2 bigint,
  count_3 bigint,
  count_4 bigint,
  count_5 bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    count(v.id) filter (where v.value = 1)::bigint,
    count(v.id) filter (where v.value = 2)::bigint,
    count(v.id) filter (where v.value = 3)::bigint,
    count(v.id) filter (where v.value = 4)::bigint,
    count(v.id) filter (where v.value = 5)::bigint,
    count(v.id)::bigint
  from public.frames as f
  join public.topics as t on t.id = f.topic_id
  left join public.votes as v on v.frame_id = f.id
  where (select auth.uid()) is not null
    and f.id = target_frame_id
    and f.type = 'question'
    and t.status <> 'hidden'
  group by f.id;
$$;

revoke all on function private.get_frame_vote_counts(uuid)
  from public, anon, authenticated;
grant execute on function private.get_frame_vote_counts(uuid) to authenticated;

create function public.get_frame_vote_counts(target_frame_id uuid)
returns table (
  frame_id uuid,
  count_1 bigint,
  count_2 bigint,
  count_3 bigint,
  count_4 bigint,
  count_5 bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_frame_vote_counts(target_frame_id);
$$;

revoke all on function public.get_frame_vote_counts(uuid) from public, anon;
grant execute on function public.get_frame_vote_counts(uuid) to authenticated;
