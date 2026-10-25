-- Trusted publishing code calls this function so video, question, and their
-- relation are written atomically. A video on the same Tokyo calendar date is
-- updated in place. Once votes exist, changing the question text is rejected.
create or replace function public.upsert_daily_video(
  target_title text,
  target_url text,
  target_description text,
  target_published_at timestamptz,
  target_topic_id uuid,
  target_period_id uuid
)
returns table (video_id uuid, frame_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_video_id uuid;
  question_frame_id uuid;
  target_day date;
begin
  if target_title is null or btrim(target_title) = ''
    or target_url is null or btrim(target_url) = ''
    or target_published_at is null
    or target_topic_id is null
    or target_period_id is null then
    raise exception 'title and url must not be blank' using errcode = '22023';
  end if;

  target_day := (target_published_at at time zone 'Asia/Tokyo')::date;

  select v.id
  into existing_video_id
  from public.videos as v
  where (v.published_at at time zone 'Asia/Tokyo')::date = target_day
  for update;

  if existing_video_id is null then
    insert into public.videos (title, url, description, published_at)
    values (target_title, target_url, target_description, target_published_at)
    returning id into existing_video_id;
  else
    update public.videos
    set title = target_title,
        url = target_url,
        description = target_description,
        published_at = target_published_at
    where id = existing_video_id;
  end if;

  select vq.frame_id
  into question_frame_id
  from public.video_questions as vq
  where vq.video_id = existing_video_id;

  if question_frame_id is null then
    insert into public.frames (topic_id, period_id, type, question)
    values (target_topic_id, target_period_id, 'question', target_title)
    returning id into question_frame_id;

    insert into public.video_questions (video_id, frame_id)
    values (existing_video_id, question_frame_id);
  else
    if exists (
      select 1
      from public.votes as v
      where v.frame_id = question_frame_id
    ) and exists (
      select 1
      from public.frames as f
      where f.id = question_frame_id
        and f.question is distinct from target_title
    ) then
      raise exception 'question text cannot be changed after voting has started'
        using errcode = '23514';
    end if;

    update public.frames
    set question = target_title
    where id = question_frame_id;
  end if;

  return query select existing_video_id, question_frame_id;
end;
$$;

revoke all on function public.upsert_daily_video(text, text, text, timestamptz, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_daily_video(text, text, text, timestamptz, uuid, uuid)
  to service_role;
