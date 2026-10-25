-- Representative-opinion selection runs only on the server with service_role.
-- This migration only adds objects; existing tables and functions are unchanged.

-- Expose the existing internal aggregation through the API schema without
-- exposing the private schema itself. Only service_role may execute it.
create function public.get_thread_reaction_counts(target_frame_id uuid)
returns table (
  thread_id uuid,
  agree_count bigint,
  disagree_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.thread_id, c.agree_count, c.disagree_count
  from private.get_thread_reaction_counts(target_frame_id) as c;
$$;

revoke all on function public.get_thread_reaction_counts(uuid)
  from public, anon, authenticated;
grant execute on function public.get_thread_reaction_counts(uuid) to service_role;

-- Cached text embeddings used to avoid picking opinions with the same viewpoint.
-- RLS is enabled with no policies, so only service_role can read or write rows.
create table public.thread_embeddings (
  thread_id uuid primary key references public.threads (id) on delete cascade,
  model text not null,
  embedding real[] not null,
  created_at timestamptz not null default now(),
  constraint thread_embeddings_embedding_check
    check (array_ndims(embedding) = 1 and cardinality(embedding) = 768)
);

alter table public.thread_embeddings enable row level security;

revoke all on table public.thread_embeddings from public, anon, authenticated;
grant select, insert, update, delete on table public.thread_embeddings to service_role;
