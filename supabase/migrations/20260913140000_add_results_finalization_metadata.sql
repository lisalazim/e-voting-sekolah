alter table public.elections
add column finalized_by uuid references public.profiles(id) on delete set null;

alter type public.audit_action add value if not exists 'results.finalized';
alter type public.audit_action add value if not exists 'results.unpublished';
