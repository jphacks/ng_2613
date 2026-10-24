-- 設問ごとの投票者の年代・性別の内訳を返す。
-- users の生年月日・性別は本人しか読めないため、get_frame_vote_counts と同じく
-- 集計だけを返す definer 関数を private に置き、public からは invoker のラッパーで呼ぶ。
-- このファイルは関数を追加するだけで、テーブルや既存データは変更しない。

create function private.get_frame_vote_demographics(target_frame_id uuid)
returns table (
  category text,
  bucket text,
  voter_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with voters as (
    select u.birth_date, u.gender
    from public.frames as f
    join public.topics as t on t.id = f.topic_id
    join public.votes as v on v.frame_id = f.id
    join public.users as u on u.id = v.user_id
    where (select auth.uid()) is not null
      and f.id = target_frame_id
      and f.type = 'question'
      and t.status <> 'hidden'
  ),
  -- 少人数だと内訳から投票した人を推測できるため、5人未満のあいだは何も返さない
  enough_voters as (
    select count(*) >= 5 as ok from voters
  ),
  bucketed as (
    select
      case
        when birth_date is null then 'unknown'
        when extract(year from age(current_date, birth_date)) < 30 then '10s_20s'
        when extract(year from age(current_date, birth_date)) < 40 then '30s'
        when extract(year from age(current_date, birth_date)) < 50 then '40s'
        when extract(year from age(current_date, birth_date)) < 60 then '50s'
        when extract(year from age(current_date, birth_date)) < 70 then '60s'
        else '70s_plus'
      end as age_bucket,
      case
        when gender in ('男性', '女性', 'その他') then gender
        else 'unknown'
      end as gender_bucket
    from voters
  )
  select 'age', age_bucket, count(*)::bigint
  from bucketed
  where (select ok from enough_voters)
  group by age_bucket
  union all
  select 'gender', gender_bucket, count(*)::bigint
  from bucketed
  where (select ok from enough_voters)
  group by gender_bucket;
$$;

revoke all on function private.get_frame_vote_demographics(uuid)
  from public, anon, authenticated;
grant execute on function private.get_frame_vote_demographics(uuid) to authenticated;

create function public.get_frame_vote_demographics(target_frame_id uuid)
returns table (
  category text,
  bucket text,
  voter_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_frame_vote_demographics(target_frame_id);
$$;

revoke all on function public.get_frame_vote_demographics(uuid) from public, anon;
grant execute on function public.get_frame_vote_demographics(uuid) to authenticated;
