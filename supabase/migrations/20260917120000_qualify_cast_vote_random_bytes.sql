create or replace function public.cast_vote(
  p_session_hash text,
  p_candidate_id uuid
)
returns table (status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived_at timestamptz;
  v_candidate_exists boolean;
  v_election_id uuid;
  v_election_status public.election_status;
  v_expires_at timestamptz;
  v_finalized_at timestamptz;
  v_has_voted boolean;
  v_school_id uuid;
  v_session_id uuid;
  v_used_at timestamptz;
  v_voter_id uuid;
begin
  select
    s.id,
    s.election_id,
    s.voter_id,
    s.expires_at,
    s.used_at
  into
    v_session_id,
    v_election_id,
    v_voter_id,
    v_expires_at,
    v_used_at
  from public.voter_sessions s
  where s.session_hash = p_session_hash
  for update;

  if v_session_id is null then
    return query select 'session_invalid'::text;
    return;
  end if;

  if v_used_at is not null then
    return query select 'already_voted'::text;
    return;
  end if;

  if v_expires_at <= now() then
    return query select 'session_expired'::text;
    return;
  end if;

  select v.has_voted
  into v_has_voted
  from public.voters v
  where v.id = v_voter_id
    and v.election_id = v_election_id
  for update;

  if v_has_voted is null then
    return query select 'session_invalid'::text;
    return;
  end if;

  if v_has_voted then
    update public.voter_sessions
    set used_at = coalesce(used_at, now())
    where id = v_session_id;

    return query select 'already_voted'::text;
    return;
  end if;

  select
    e.status,
    e.school_id,
    e.archived_at,
    e.finalized_at
  into
    v_election_status,
    v_school_id,
    v_archived_at,
    v_finalized_at
  from public.elections e
  where e.id = v_election_id;

  if v_election_status = 'paused' then
    return query select 'paused'::text;
    return;
  end if;

  if v_election_status = 'closed' then
    return query select 'closed'::text;
    return;
  end if;

  if v_election_status <> 'open'
    or v_archived_at is not null
    or v_finalized_at is not null then
    return query select 'not_open'::text;
    return;
  end if;

  select exists (
    select 1
    from public.candidates c
    where c.id = p_candidate_id
      and c.election_id = v_election_id
      and c.is_active = true
  )
  into v_candidate_exists;

  if not v_candidate_exists then
    return query select 'candidate_invalid'::text;
    return;
  end if;

  insert into public.votes (
    election_id,
    candidate_id,
    ballot_fingerprint
  )
  values (
    v_election_id,
    p_candidate_id,
    encode(extensions.gen_random_bytes(32), 'hex')
  );

  update public.voters
  set
    has_voted = true,
    voted_at = now()
  where id = v_voter_id
    and election_id = v_election_id
    and has_voted = false;

  update public.voter_sessions
  set used_at = now()
  where id = v_session_id;

  insert into public.audit_logs (
    school_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_school_id,
    'vote.cast',
    'election',
    v_election_id,
    '{"accepted": true}'::jsonb
  );

  return query select 'success'::text;
end;
$$;

revoke all on function public.cast_vote(text, uuid) from public;
grant execute on function public.cast_vote(text, uuid) to anon, authenticated;
