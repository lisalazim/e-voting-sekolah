alter type public.audit_action add value if not exists 'voter_tokens.generated';
alter type public.audit_action add value if not exists 'voter_token.regenerated';
