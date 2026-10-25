-- Add the destination topic for questions created from the daily political
-- awareness video. The existing genre and middle topic must already exist.
do $$
declare
  target_genre_id uuid;
  target_middle_topic_id uuid;
begin
  select id
  into strict target_genre_id
  from public.genres
  where name = '政治のしくみ';

  select id
  into strict target_middle_topic_id
  from public.middle_topics
  where genre_id = target_genre_id
    and name = '選挙制度';

  if not exists (
    select 1
    from public.topics
    where middle_topic_id = target_middle_topic_id
      and name = '政治を知る'
  ) then
    insert into public.topics (
      middle_topic_id,
      name,
      description,
      sort_order,
      status
    )
    values (
      target_middle_topic_id,
      '政治を知る',
      '政治や選挙について知るための動画と問い',
      (
        select coalesce(max(sort_order), 0) + 1
        from public.topics
        where middle_topic_id = target_middle_topic_id
      ),
      'open'
    );
  end if;
end;
$$;

