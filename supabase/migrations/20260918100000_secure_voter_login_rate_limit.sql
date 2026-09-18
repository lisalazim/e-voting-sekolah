create table public.voter_login_rate_limits (
  bucket_type text not null,
  bucket_hash text not null,
  window_started_at timestamptz not null,
  failure_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket_type, bucket_hash, window_started_at),
  constraint voter_login_rate_limits_bucket_type_check
    check (bucket_type in ('client', 'token', 'ip')),
  constraint voter_login_rate_limits_hash_check
    check (bucket_hash ~ '^[0-9a-f]{64}$'),
  constraint voter_login_rate_limits_failure_count_check
    check (failure_count >= 0),
  constraint voter_login_rate_limits_expiry_check
    check (expires_at > window_started_at)
);

create index voter_login_rate_limits_expires_at_idx
on public.voter_login_rate_limits(expires_at);

create index voter_login_rate_limits_created_at_idx
on public.voter_login_rate_limits(created_at);

create index voter_login_rate_limits_bucket_window_idx
on public.voter_login_rate_limits(bucket_type, window_started_at desc);

alter table public.voter_login_rate_limits enable row level security;

revoke all on table public.voter_login_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.voter_login_rate_limits to service_role;

create or replace function public.cleanup_voter_login_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_count bigint;
begin
  delete from public.voter_login_rate_limits
  where expires_at <= clock_timestamp()
     or created_at < clock_timestamp() - interval '24 hours';

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.cleanup_voter_login_rate_limits() from public, anon, authenticated;
grant execute on function public.cleanup_voter_login_rate_limits() to service_role;

drop function if exists public.create_voter_session(text, text, timestamptz);

create function public.create_voter_session(
  p_token_hash text,
  p_session_hash text,
  p_expires_at timestamptz,
  p_client_bucket_hash text,
  p_token_bucket_hash text,
  p_ip_bucket_hash text
)
returns table (status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_archived_at timestamptz;
  v_client_failures integer;
  v_election_id uuid;
  v_election_status public.election_status;
  v_failure_status text;
  v_finalized_at timestamptz;
  v_has_voted boolean;
  v_ip_failures integer;
  v_now timestamptz := clock_timestamp();
  v_token_failures integer;
  v_token_revoked_at timestamptz;
  v_voter_id uuid;
  v_window_started_at timestamptz;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_client_bucket_hash !~ '^[0-9a-f]{64}$'
    or p_token_bucket_hash !~ '^[0-9a-f]{64}$'
    or p_ip_bucket_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= v_now
    or p_expires_at > v_now + interval '15 minutes 5 seconds' then
    return query select 'invalid_request'::text;
    return;
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / 600) * 600
  );

  delete from public.voter_login_rate_limits
  where expires_at <= v_now
     or created_at < v_now - interval '24 hours';

  insert into public.voter_login_rate_limits (
    bucket_type,
    bucket_hash,
    window_started_at,
    expires_at
  )
  values
    ('client', p_client_bucket_hash, v_window_started_at, v_window_started_at + interval '24 hours'),
    ('ip', p_ip_bucket_hash, v_window_started_at, v_window_started_at + interval '24 hours'),
    ('token', p_token_bucket_hash, v_window_started_at, v_window_started_at + interval '24 hours')
  on conflict (bucket_type, bucket_hash, window_started_at) do nothing;

  perform 1
  from public.voter_login_rate_limits
  where window_started_at = v_window_started_at
    and (
      (bucket_type = 'client' and bucket_hash = p_client_bucket_hash)
      or (bucket_type = 'ip' and bucket_hash = p_ip_bucket_hash)
      or (bucket_type = 'token' and bucket_hash = p_token_bucket_hash)
    )
  order by bucket_type, bucket_hash
  for update;

  select failure_count into v_client_failures
  from public.voter_login_rate_limits
  where bucket_type = 'client'
    and bucket_hash = p_client_bucket_hash
    and window_started_at = v_window_started_at;

  select failure_count into v_token_failures
  from public.voter_login_rate_limits
  where bucket_type = 'token'
    and bucket_hash = p_token_bucket_hash
    and window_started_at = v_window_started_at;

  select failure_count into v_ip_failures
  from public.voter_login_rate_limits
  where bucket_type = 'ip'
    and bucket_hash = p_ip_bucket_hash
    and window_started_at = v_window_started_at;

  if v_client_failures >= 5
    or v_token_failures >= 5
    or v_ip_failures >= 100 then
    return query select 'rate_limited'::text;
    return;
  end if;

  select
    v.id,
    v.election_id,
    v.has_voted,
    v.token_revoked_at,
    e.status,
    e.archived_at,
    e.finalized_at
  into
    v_voter_id,
    v_election_id,
    v_has_voted,
    v_token_revoked_at,
    v_election_status,
    v_archived_at,
    v_finalized_at
  from public.voters v
  join public.elections e on e.id = v.election_id
  where v.token_hash = p_token_hash
  limit 1;

  if v_voter_id is null or v_token_revoked_at is not null then
    v_failure_status := 'invalid_token';
  elsif v_has_voted then
    v_failure_status := 'already_voted';
  elsif v_election_status = 'paused' then
    v_failure_status := 'paused';
  elsif v_election_status = 'closed' then
    v_failure_status := 'closed';
  elsif v_election_status <> 'open'
    or v_archived_at is not null
    or v_finalized_at is not null then
    v_failure_status := 'not_open';
  end if;

  if v_failure_status is not null then
    update public.voter_login_rate_limits
    set
      failure_count = failure_count + 1,
      updated_at = v_now
    where window_started_at = v_window_started_at
      and (
        (bucket_type = 'client' and bucket_hash = p_client_bucket_hash)
        or (bucket_type = 'ip' and bucket_hash = p_ip_bucket_hash)
        or (bucket_type = 'token' and bucket_hash = p_token_bucket_hash)
      );

    return query select v_failure_status;
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

  update public.voter_login_rate_limits
  set
    failure_count = 0,
    updated_at = v_now
  where window_started_at = v_window_started_at
    and (
      (bucket_type = 'client' and bucket_hash = p_client_bucket_hash)
      or (bucket_type = 'token' and bucket_hash = p_token_bucket_hash)
    );

  return query select 'success'::text;
end;
$$;

revoke all on function public.create_voter_session(text, text, timestamptz, text, text, text)
from public, anon, authenticated;
grant execute on function public.create_voter_session(text, text, timestamptz, text, text, text)
to service_role;
