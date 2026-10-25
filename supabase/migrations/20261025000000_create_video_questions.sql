-- Relate a daily video to the question frame created from it without
-- overloading the user discussion thread relationship.
create table if not exists public.video_questions (
  video_id uuid primary key references public.videos (id) on delete restrict,
  frame_id uuid not null unique references public.frames (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- published_at remains the single publication field. There can be only one
-- video per calendar day in Asia/Tokyo.
create unique index if not exists videos_one_per_jst_date_key
  on public.videos (((published_at at time zone 'Asia/Tokyo')::date))
  where published_at is not null;

alter table public.video_questions enable row level security;

revoke all on table public.video_questions from public, anon, authenticated;
grant select on table public.video_questions to authenticated;

drop policy if exists video_questions_select_authenticated
  on public.video_questions;

create policy video_questions_select_authenticated
  on public.video_questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.frames as f
      join public.topics as t on t.id = f.topic_id
      where f.id = video_questions.frame_id
        and f.type = 'question'
        and t.status <> 'hidden'
    )
  );

