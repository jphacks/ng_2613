-- 設問ごとの投票者の年代・性別の内訳を返す。
-- users の生年月日・性別は本人しか読めないため、get_frame_vote_counts と同じく
-- 集計だけを返す definer 関数を private に置き、public からは invoker のラッパーで呼ぶ。
-- このファイルは関数を追加するだけで、テーブルや既存データは変更しない。
-- 同じ内容を再実行しても失敗しないよう create or replace にしている。

create or replace function private.get_frame_vote_demographics(target_frame_id uuid)
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
  -- 少人数だと内訳から投票した人を推測できるため、投票者が5人未満のあいだは何も返さない
  enough_voters as (
    select count(*) >= 5 as ok from voters
  ),
  bucketed as (
    select
      -- 区分は画面の「10, 20代」に合わせ、10代も最初の区分に含める。
      -- 未来の日付は入力時の検証で弾いている。
      case
        when birth_date is null then 'unknown'
        when extract(year from age(current_date, birth_date)) < 30 then '10s_20s'
        when extract(year from age(current_date, birth_date)) < 40 then '30s'
        when extract(year from age(current_date, birth_date)) < 50 then '40s'
        when extract(year from age(current_date, birth_date)) < 60 then '50s'
        when extract(year from age(current_date, birth_date)) < 70 then '60s'
        else '70s_plus'
      end as age_bucket,
      -- 保存される値はプロフィール API の検証で 男性・女性・その他 に限られる
      case
        when gender in ('男性', '女性', 'その他') then gender
        else 'unknown'
      end as gender_bucket
    from voters
  ),
  counts as (
    select 'age' as category, age_bucket as bucket, count(*) as n
    from bucketed
    group by age_bucket
    union all
    select 'gender', gender_bucket, count(*)
    from bucketed
    group by gender_bucket
  ),
  -- 5人未満の区分は名前を出さず「hidden」にまとめる。
  -- まとめた人数自体が5人未満だと、総投票数との差から1つの区分の人数が分かってしまうため、
  -- そのときは5人以上の区分のうち最も小さいものも一緒にまとめる。
  flagged as (
    select
      category,
      bucket,
      n,
      n < 5 as small,
      sum(n) filter (where n < 5) over (partition by category) as small_total,
      row_number() over (
        partition by category
        order by (n < 5) desc, n, bucket
      ) as small_first_rank,
      count(*) filter (where n < 5) over (partition by category) as small_count
    from counts
  ),
  suppressed as (
    select
      category,
      case
        when small then 'hidden'
        when coalesce(small_total, 0) between 1 and 4
          and small_first_rank = small_count + 1 then 'hidden'
        else bucket
      end as bucket,
      n
    from flagged
  )
  select category, bucket, sum(n)::bigint
  from suppressed
  where (select ok from enough_voters)
  group by category, bucket;
$$;

revoke all on function private.get_frame_vote_demographics(uuid)
  from public, anon, authenticated;
-- private スキーマは Data API に公開していないため、アプリから直接は呼べない。
-- invoker のラッパーから呼ぶために authenticated の実行権限だけを残す（get_frame_vote_counts と同じ）。
grant execute on function private.get_frame_vote_demographics(uuid) to authenticated;

create or replace function public.get_frame_vote_demographics(target_frame_id uuid)
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
