grant usage on schema public to service_role;

grant select, insert on table
  public.genres,
  public.middle_topics,
  public.topics,
  public.periods,
  public.frames,
  public.glossary,
  public.banned_words
to service_role;
