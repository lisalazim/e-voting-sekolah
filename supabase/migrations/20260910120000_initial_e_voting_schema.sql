create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'committee', 'observer');
create type public.election_status as enum ('draft', 'scheduled', 'open', 'closed', 'archived');
create type public.results_visibility as enum ('private', 'committee', 'public');
create type public.audit_action as enum (
  'school.created',
  'school.updated',
  'election.created',
  'election.updated',
  'candidate.created',
  'candidate.updated',
  'voter.created',
  'voter.updated',
  'vote.cast',
  'results.published'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  npsn text,
  logo_url text,
  address text,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'observer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.election_status not null default 'draft',
  results_visibility public.results_visibility not null default 'private',
  published_at timestamptz,
  finalized_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint elections_valid_period check (ends_at > starts_at)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  ballot_number integer not null,
  name text not null,
  class_name text,
  photo_url text,
  vision text,
  mission text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_positive_ballot_number check (ballot_number > 0),
  unique (id, election_id),
  unique (election_id, ballot_number)
);

create table public.voters (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  external_id text not null,
  full_name text not null,
  class_name text,
  token_hash text not null,
  token_issued_at timestamptz,
  token_revoked_at timestamptz,
  has_voted boolean not null default false,
  voted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, external_id),
  unique (election_id, token_hash),
  constraint voters_vote_timestamp_state check (
    (has_voted = false and voted_at is null)
    or (has_voted = true and voted_at is not null)
  )
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  candidate_id uuid not null,
  ballot_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (election_id, ballot_fingerprint),
  foreign key (candidate_id, election_id)
    references public.candidates(id, election_id)
    on delete restrict
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_school_id_idx on public.profiles(school_id);
create index elections_school_id_idx on public.elections(school_id);
create index candidates_election_id_idx on public.candidates(election_id);
create index voters_election_id_idx on public.voters(election_id);
create index votes_election_id_idx on public.votes(election_id);
create index audit_logs_school_id_created_at_idx on public.audit_logs(school_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger elections_set_updated_at
before update on public.elections
for each row execute function public.set_updated_at();

create trigger candidates_set_updated_at
before update on public.candidates
for each row execute function public.set_updated_at();

create trigger voters_set_updated_at
before update on public.voters
for each row execute function public.set_updated_at();

create or replace function public.is_school_admin(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and school_id = target_school_id
      and role = 'admin'
  );
$$;

create or replace function public.can_manage_election(target_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.elections e
    join public.profiles p on p.school_id = e.school_id
    where e.id = target_election_id
      and p.id = auth.uid()
      and p.role in ('admin', 'committee')
  );
$$;

create or replace function public.can_view_election_results(target_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.elections e
    left join public.profiles p on p.school_id = e.school_id and p.id = auth.uid()
    where e.id = target_election_id
      and (
        e.results_visibility = 'public'
        or (e.results_visibility = 'committee' and p.role in ('admin', 'committee', 'observer'))
        or p.role in ('admin', 'committee')
      )
  );
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.votes enable row level security;
alter table public.audit_logs enable row level security;

create policy "School members can read their school"
on public.schools
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.school_id = schools.id
      and profiles.id = auth.uid()
  )
);

create policy "Admins can update their school"
on public.schools
for update
using (public.is_school_admin(id))
with check (public.is_school_admin(id));

create policy "Users can read their own profile"
on public.profiles
for select
using (id = auth.uid() or public.is_school_admin(school_id));

create policy "Admins can manage school profiles"
on public.profiles
for all
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));

create policy "School operators can read elections"
on public.elections
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.school_id = elections.school_id
      and profiles.id = auth.uid()
      and profiles.role in ('admin', 'committee', 'observer')
  )
);

create policy "Admins and committee can manage elections"
on public.elections
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.school_id = elections.school_id
      and profiles.id = auth.uid()
      and profiles.role in ('admin', 'committee')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.school_id = elections.school_id
      and profiles.id = auth.uid()
      and profiles.role in ('admin', 'committee')
  )
);

create policy "Operators can read candidates"
on public.candidates
for select
using (public.can_manage_election(election_id) or public.can_view_election_results(election_id));

create policy "Admins and committee can manage candidates"
on public.candidates
for all
using (public.can_manage_election(election_id))
with check (public.can_manage_election(election_id));

create policy "Admins and committee can manage voters"
on public.voters
for all
using (public.can_manage_election(election_id))
with check (public.can_manage_election(election_id));

create policy "Results viewers can read votes"
on public.votes
for select
using (public.can_view_election_results(election_id));

create policy "School admins can read audit logs"
on public.audit_logs
for select
using (public.is_school_admin(school_id));

create policy "School operators can insert audit logs"
on public.audit_logs
for insert
with check (
  exists (
    select 1
    from public.profiles
    where profiles.school_id = audit_logs.school_id
      and profiles.id = auth.uid()
      and profiles.role in ('admin', 'committee')
  )
);
