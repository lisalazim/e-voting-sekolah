alter table public.voters
alter column token_hash drop not null;

alter table public.voters
add column gender text;

alter table public.voters
add constraint voters_gender_check
check (gender is null or gender in ('L', 'P'));

create index voters_election_id_class_name_idx
on public.voters(election_id, class_name);

create index voters_election_id_gender_idx
on public.voters(election_id, gender);
