create table public.thread_reactions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint thread_reactions_thread_user_key unique (thread_id, user_id)
);

-- The unique index above covers lookups whose leading condition is thread_id.
-- This index supports owner-only reads and deletes by user_id.
create index thread_reactions_user_id_idx
  on public.thread_reactions (user_id);

alter table public.thread_reactions enable row level security;

revoke all on table public.thread_reactions
  from public, anon, authenticated;

grant select on public.thread_reactions to authenticated;
grant insert (thread_id, user_id) on public.thread_reactions to authenticated;
grant delete on public.thread_reactions to authenticated;

create policy thread_reactions_select_own
  on public.thread_reactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy thread_reactions_insert_own_visible_thread
  on public.thread_reactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.threads as th
      join public.frames as f on f.id = th.frame_id
      join public.topics as t on t.id = f.topic_id
      where th.id = thread_reactions.thread_id
        and th.deleted_at is null
        and t.status <> 'hidden'
    )
  );

create policy thread_reactions_delete_own
  on public.thread_reactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- UPDATE is intentionally unavailable: there is no UPDATE grant or policy.
