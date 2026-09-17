alter type public.audit_action add value if not exists 'election.test_deleted';

create or replace function public.delete_archived_test_election(
  p_election_id uuid
)
returns table (
  status text,
  candidate_photo_paths text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_archived_at timestamptz;
  v_candidate_photo_paths text[];
  v_deleted_at timestamptz := now();
  v_election_title text;
  v_is_test boolean;
  v_school_id uuid;
  v_term_label text;
begin
  select p.id, p.school_id
  into v_admin_id, v_school_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin';

  if v_admin_id is null then
    return query select 'forbidden'::text, array[]::text[];
    return;
  end if;

  select
    e.title,
    e.term_label,
    e.is_test,
    e.archived_at
  into
    v_election_title,
    v_term_label,
    v_is_test,
    v_archived_at
  from public.elections e
  where e.id = p_election_id
    and e.school_id = v_school_id
  for update;

  if not found then
    return query select 'not_found'::text, array[]::text[];
    return;
  end if;

  if not v_is_test then
    return query select 'not_test'::text, array[]::text[];
    return;
  end if;

  if v_archived_at is null then
    return query select 'not_archived'::text, array[]::text[];
    return;
  end if;

  select coalesce(
    array_agg(
      split_part(c.photo_url, '/object/public/candidate-photos/', 2)
    ) filter (
      where c.photo_url is not null
        and c.photo_url like '%/object/public/candidate-photos/%'
        and split_part(c.photo_url, '/object/public/candidate-photos/', 2)
          like v_school_id::text || '/%'
    ),
    array[]::text[]
  )
  into v_candidate_photo_paths
  from public.candidates c
  where c.election_id = p_election_id;

  insert into public.audit_logs (
    school_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_school_id,
    v_admin_id,
    'election.test_deleted',
    'election',
    p_election_id,
    jsonb_build_object(
      'election_title', v_election_title,
      'term_label', v_term_label,
      'deleted_at', v_deleted_at,
      'admin_id', v_admin_id,
      'candidate_photo_paths', to_jsonb(v_candidate_photo_paths)
    )
  );

  delete from public.voter_sessions
  where election_id = p_election_id;

  delete from public.votes
  where election_id = p_election_id;

  delete from public.voters
  where election_id = p_election_id;

  delete from public.candidates
  where election_id = p_election_id;

  delete from public.elections
  where id = p_election_id
    and school_id = v_school_id
    and is_test = true
    and archived_at is not null;

  if not found then
    raise exception 'Archived test election changed during deletion';
  end if;

  return query select 'success'::text, v_candidate_photo_paths;
end;
$$;

revoke all on function public.delete_archived_test_election(uuid) from public;
revoke all on function public.delete_archived_test_election(uuid) from anon;
grant execute on function public.delete_archived_test_election(uuid) to authenticated;
