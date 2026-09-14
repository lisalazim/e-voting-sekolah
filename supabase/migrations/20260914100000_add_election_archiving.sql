alter table public.elections
add column archived_at timestamptz,
add column is_test boolean not null default false;

alter type public.audit_action add value if not exists 'election.archived';

create unique index elections_one_current_per_school_idx
on public.elections(school_id)
where archived_at is null;

create index elections_school_id_archived_at_idx
on public.elections(school_id, archived_at desc);

create or replace function public.get_public_announcement_state()
returns table (
  status text,
  server_now timestamptz,
  school_name text,
  school_logo_url text,
  election_title text,
  election_term_label text,
  announcement_started_at timestamptz,
  results_revealed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_school_name text;
  v_school_logo_url text;
  v_election_title text;
  v_election_term_label text;
  v_announcement_started_at timestamptz;
  v_results_revealed_at timestamptz;
begin
  select
    e.id,
    s.name,
    s.logo_url,
    e.title,
    e.term_label,
    e.announcement_started_at,
    e.results_revealed_at
  into
    v_election_id,
    v_school_name,
    v_school_logo_url,
    v_election_title,
    v_election_term_label,
    v_announcement_started_at,
    v_results_revealed_at
  from public.elections e
  join public.schools s on s.id = e.school_id
  where e.status = 'closed'
    and e.archived_at is null
    and e.finalized_at is not null
    and e.published_at is not null
  order by e.published_at desc, e.created_at desc
  limit 1;

  if v_election_id is null then
    return query
    select
      'not_ready'::text,
      now(),
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  if v_announcement_started_at is null then
    return query
    select
      'waiting'::text,
      now(),
      v_school_name,
      v_school_logo_url,
      v_election_title,
      v_election_term_label,
      v_announcement_started_at,
      v_results_revealed_at;
    return;
  end if;

  if v_results_revealed_at is null or now() < v_results_revealed_at then
    return query
    select
      'counting_down'::text,
      now(),
      v_school_name,
      v_school_logo_url,
      v_election_title,
      v_election_term_label,
      v_announcement_started_at,
      v_results_revealed_at;
    return;
  end if;

  return query
  select
    'revealed'::text,
    now(),
    v_school_name,
    v_school_logo_url,
    v_election_title,
    v_election_term_label,
    v_announcement_started_at,
    v_results_revealed_at;
end;
$$;

create or replace function public.get_public_final_results()
returns table (
  status text,
  school_name text,
  school_logo_url text,
  election_title text,
  election_term_label text,
  total_valid_votes bigint,
  candidate_id uuid,
  ballot_number integer,
  candidate_name text,
  candidate_photo_url text,
  vote_count bigint,
  percentage numeric,
  is_top boolean,
  is_tied_top boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_school_name text;
  v_school_logo_url text;
  v_election_title text;
  v_election_term_label text;
  v_results_revealed_at timestamptz;
  v_total_valid_votes bigint;
  v_top_vote_count bigint;
  v_top_candidate_count bigint;
begin
  select
    e.id,
    s.name,
    s.logo_url,
    e.title,
    e.term_label,
    e.results_revealed_at
  into
    v_election_id,
    v_school_name,
    v_school_logo_url,
    v_election_title,
    v_election_term_label,
    v_results_revealed_at
  from public.elections e
  join public.schools s on s.id = e.school_id
  where e.status = 'closed'
    and e.archived_at is null
    and e.finalized_at is not null
    and e.published_at is not null
    and e.results_revealed_at is not null
  order by e.published_at desc, e.created_at desc
  limit 1;

  if v_election_id is null then
    return query
    select
      'not_ready'::text,
      null::text,
      null::text,
      null::text,
      null::text,
      0::bigint,
      null::uuid,
      null::integer,
      null::text,
      null::text,
      0::bigint,
      0::numeric,
      false,
      false;
    return;
  end if;

  if now() < v_results_revealed_at then
    return query
    select
      'not_revealed'::text,
      null::text,
      null::text,
      null::text,
      null::text,
      0::bigint,
      null::uuid,
      null::integer,
      null::text,
      null::text,
      0::bigint,
      0::numeric,
      false,
      false;
    return;
  end if;

  select count(*)
  into v_total_valid_votes
  from public.votes
  where election_id = v_election_id;

  with candidate_vote_counts as (
    select
      c.id,
      coalesce(count(v.id), 0)::bigint as vote_count
    from public.candidates c
    left join public.votes v
      on v.candidate_id = c.id
      and v.election_id = c.election_id
    where c.election_id = v_election_id
    group by c.id
  )
  select
    coalesce(max(candidate_vote_counts.vote_count), 0),
    count(*) filter (
      where candidate_vote_counts.vote_count = (
        select coalesce(max(inner_counts.vote_count), 0)
        from candidate_vote_counts inner_counts
      )
    )
  into
    v_top_vote_count,
    v_top_candidate_count
  from candidate_vote_counts;

  return query
  with candidate_vote_counts as (
    select
      c.id,
      c.ballot_number,
      c.name,
      c.photo_url,
      coalesce(count(v.id), 0)::bigint as vote_count
    from public.candidates c
    left join public.votes v
      on v.candidate_id = c.id
      and v.election_id = c.election_id
    where c.election_id = v_election_id
    group by c.id, c.ballot_number, c.name, c.photo_url
  )
  select
    'success'::text,
    v_school_name,
    v_school_logo_url,
    v_election_title,
    v_election_term_label,
    v_total_valid_votes,
    candidate_vote_counts.id,
    candidate_vote_counts.ballot_number,
    candidate_vote_counts.name,
    candidate_vote_counts.photo_url,
    candidate_vote_counts.vote_count,
    case
      when v_total_valid_votes <= 0 then 0::numeric
      else round((candidate_vote_counts.vote_count::numeric / v_total_valid_votes::numeric) * 100, 2)
    end,
    v_top_vote_count > 0 and candidate_vote_counts.vote_count = v_top_vote_count,
    v_top_vote_count > 0
      and v_top_candidate_count > 1
      and candidate_vote_counts.vote_count = v_top_vote_count
  from candidate_vote_counts
  order by candidate_vote_counts.ballot_number asc;
end;
$$;

revoke all on function public.get_public_announcement_state() from public;
revoke all on function public.get_public_final_results() from public;

grant execute on function public.get_public_announcement_state() to anon, authenticated;
grant execute on function public.get_public_final_results() to anon, authenticated;
