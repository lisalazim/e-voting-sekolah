insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'candidate-photos',
  'candidate-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_candidate_photo_admin(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  school_folder text;
begin
  school_folder := split_part(object_name, '/', 1);

  if school_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.is_school_admin(school_folder::uuid);
end;
$$;

create policy "Candidate photos are publicly readable"
on storage.objects
for select
using (bucket_id = 'candidate-photos');

create policy "School admins can upload candidate photos"
on storage.objects
for insert
with check (
  bucket_id = 'candidate-photos'
  and public.is_candidate_photo_admin(name)
);

create policy "School admins can update candidate photos"
on storage.objects
for update
using (
  bucket_id = 'candidate-photos'
  and public.is_candidate_photo_admin(name)
)
with check (
  bucket_id = 'candidate-photos'
  and public.is_candidate_photo_admin(name)
);

create policy "School admins can delete candidate photos"
on storage.objects
for delete
using (
  bucket_id = 'candidate-photos'
  and public.is_candidate_photo_admin(name)
);
