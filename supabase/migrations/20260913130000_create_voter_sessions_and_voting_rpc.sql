create table public.voter_sessions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  voter_id uuid not null references public.voters(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint voter_sessions_valid_expiry check (expires_at > created_at)
);

create index voter_sessions_voter_id_idx
on public.voter_sessions(voter_id);

create index voter_sessions_election_id_idx
on public.voter_sessions(election_id);

create unique index voters_token_hash_global_unique_idx
on public.voters(token_hash)
where token_hash is not null;

alter table public.voter_sessions enable row level security;

revoke all on table public.voter_sessions from anon, authenticated;

create or replace function public.create_voter_session(
  p_token_hash text,
  p_session_hash text,
  p_expires_at timestamptz
)
returns table (status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_election_status public.election_status;
  v_ends_at timestamptz;
  v_has_voted boolean;
  v_starts_at timestamptz;
  v_voter_id uuid;
begin
  select
    v.id,
    v.election_id,
    v.has_voted,
    e.status,
    e.starts_at,
    e.ends_at
  into
    v_voter_id,
    v_election_id,
    v_has_voted,
    v_election_status,
    v_starts_at,
    v_ends_at
  from public.voters v
  join public.elections e on e.id = v.election_id
  where v.token_hash = p_token_hash
  limit 1;

  if v_voter_id is null then
    return query select 'invalid_token'::text;
    return;
  end if;

  if v_has_voted then
    return query select 'already_voted'::text;
    return;
  end if;

  if v_election_status = 'paused' then
    return query select 'paused'::text;
    return;
  end if;

  if v_election_status <> 'open' then
    return query select 'not_open'::text;
    return;
  end if;

  if now() < v_starts_at then
    return query select 'not_open'::text;
    return;
  end if;

  if now() >= v_ends_at then
    return query select 'time_expired'::text;
    return;
  end if;

  insert into public.voter_sessions (
    election_id,
    voter_id,
    session_hash,
    expires_at
  )
  values (
    v_election_id,
    v_voter_id,
    p_session_hash,
    p_expires_at
  );

  return query select 'success'::text;
end;
$$;

create or replace function public.get_voting_context(
  p_session_hash text
)
returns table (
  status text,
  election_title text,
  election_term_label text,
  candidate_id uuid,
  ballot_number integer,
  candidate_name text,
  candidate_class_name text,
  candidate_photo_url text,
  candidate_vision text,
  candidate_mission text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_election_status public.election_status;
  v_ends_at timestamptz;
  v_expires_at timestamptz;
  v_has_voted boolean;
  v_starts_at timestamptz;
  v_term_label text;
  v_title text;
  v_used_at timestamptz;
begin
  select
    s.election_id,
    s.expires_at,
    s.used_at,
    v.has_voted,
    e.status,
    e.starts_at,
    e.ends_at,
    e.title,
    e.term_label
  into
    v_election_id,
    v_expires_at,
    v_used_at,
    v_has_voted,
    v_election_status,
    v_starts_at,
    v_ends_at,
    v_title,
    v_term_label
  from public.voter_sessions s
  join public.voters v on v.id = s.voter_id and v.election_id = s.election_id
  join public.elections e on e.id = s.election_id
  where s.session_hash = p_session_hash
  limit 1;

  if v_election_id is null then
    return query select 'session_invalid'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_used_at is not null or v_has_voted then
    return query select 'already_voted'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_expires_at <= now() then
    return query select 'session_expired'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_election_status = 'paused' then
    return query select 'paused'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if v_election_status <> 'open' or now() < v_starts_at then
    return query select 'not_open'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if now() >= v_ends_at then
    return query select 'time_expired'::text, null::text, null::text, null::uuid, null::integer, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  return query
  select
    'success'::text,
    v_title,
    v_term_label,
    c.id,
    c.ballot_number,
    c.name,
    c.class_name,
    c.photo_url,
    c.vision,
    c.mission
  from public.candidates c
  where c.election_id = v_election_id
    and c.is_active = true
  order by c.ballot_number asc;
end;
$$;

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
  v_candidate_exists boolean;
  v_election_id uuid;
  v_election_status public.election_status;
  v_ends_at timestamptz;
  v_expires_at timestamptz;
  v_has_voted boolean;
  v_school_id uuid;
  v_session_id uuid;
  v_starts_at timestamptz;
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
    e.starts_at,
    e.ends_at,
    e.school_id
  into
    v_election_status,
    v_starts_at,
    v_ends_at,
    v_school_id
  from public.elections e
  where e.id = v_election_id;

  if v_election_status = 'paused' then
    return query select 'paused'::text;
    return;
  end if;

  if v_election_status <> 'open' or now() < v_starts_at then
    return query select 'not_open'::text;
    return;
  end if;

  if now() >= v_ends_at then
    return query select 'time_expired'::text;
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
    encode(gen_random_bytes(32), 'hex')
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

revoke all on function public.create_voter_session(text, text, timestamptz) from public;
revoke all on function public.get_voting_context(text) from public;
revoke all on function public.cast_vote(text, uuid) from public;

grant execute on function public.create_voter_session(text, text, timestamptz) to anon, authenticated;
grant execute on function public.get_voting_context(text) to anon, authenticated;
grant execute on function public.cast_vote(text, uuid) to anon, authenticated;
