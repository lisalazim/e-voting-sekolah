create or replace function public.get_public_revealed_candidate_classes()
returns table (
  candidate_id uuid,
  candidate_class_name text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.class_name
  from public.candidates c
  join public.elections e on e.id = c.election_id
  where e.status = 'closed'
    and e.archived_at is null
    and e.finalized_at is not null
    and e.published_at is not null
    and e.results_revealed_at is not null
    and now() >= e.results_revealed_at
    and e.id = (
      select current_election.id
      from public.elections current_election
      where current_election.status = 'closed'
        and current_election.archived_at is null
        and current_election.finalized_at is not null
        and current_election.published_at is not null
        and current_election.results_revealed_at is not null
        and now() >= current_election.results_revealed_at
      order by current_election.published_at desc, current_election.created_at desc
      limit 1
    )
  order by c.ballot_number asc;
$$;

revoke all on function public.get_public_revealed_candidate_classes() from public;
grant execute on function public.get_public_revealed_candidate_classes() to anon, authenticated;
