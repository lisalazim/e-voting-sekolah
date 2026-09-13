alter type public.election_status add value if not exists 'paused';
alter type public.audit_action add value if not exists 'election.status_changed';
