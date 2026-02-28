-- Migration: 00007_storage_buckets
-- Creates private storage buckets and per-user RLS policies (idempotent)

-- ===========================
-- 1. Create buckets (no-op if they exist)
-- ===========================

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', false)
on conflict (id) do update set public = false;

-- ===========================
-- 2. Drop existing policies (clean slate)
-- ===========================

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like '%profile-images%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like '%thumbnails%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- ===========================
-- 3. Enable RLS on storage.objects (idempotent)
-- ===========================

alter table storage.objects enable row level security;

-- ===========================
-- 4. profile-images policies
-- ===========================

create policy "profile-images: select own objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile-images' and owner = auth.uid());

create policy "profile-images: insert own objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-images' and owner = auth.uid());

create policy "profile-images: update own objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-images' and owner = auth.uid())
  with check (bucket_id = 'profile-images' and owner = auth.uid());

create policy "profile-images: delete own objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-images' and owner = auth.uid());

-- ===========================
-- 5. thumbnails policies
-- ===========================

create policy "thumbnails: select own objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'thumbnails' and owner = auth.uid());

create policy "thumbnails: insert own objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'thumbnails' and owner = auth.uid());

create policy "thumbnails: update own objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'thumbnails' and owner = auth.uid())
  with check (bucket_id = 'thumbnails' and owner = auth.uid());

create policy "thumbnails: delete own objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'thumbnails' and owner = auth.uid());
