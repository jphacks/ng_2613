-- Allow the trusted sample-discussion seed to inspect its target tables.
grant select on table
  public.users,
  public.threads,
  public.comments
to service_role;

grant insert (id, username, birth_date, gender)
  on public.users
  to service_role;

grant insert (id, frame_id, type, user_id, stance, title, body, video_id)
  on public.threads
  to service_role;

grant insert (id, thread_id, user_id, stance, body)
  on public.comments
  to service_role;

-- The Auth trigger creates profiles with these optional fields unset. The seed
-- fills only NULL values after strictly matching the sample Auth identity.
grant update (birth_date, gender)
  on public.users
  to service_role;
