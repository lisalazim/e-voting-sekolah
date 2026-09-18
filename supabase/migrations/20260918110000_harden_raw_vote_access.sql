drop policy if exists "Results viewers can read votes" on public.votes;

revoke all on table public.votes from anon;

create policy "School operators can read raw votes"
on public.votes
for select
to authenticated
using (
  exists (
    select 1
    from public.elections e
    join public.profiles p on p.school_id = e.school_id
    where e.id = votes.election_id
      and p.id = auth.uid()
      and p.role in ('admin', 'committee')
  )
);
