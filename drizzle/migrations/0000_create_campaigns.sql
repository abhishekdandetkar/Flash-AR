create table public.campaigns (
  id text primary key,
  owner_id uuid not null,
  name text not null default 'Untitled album',
  artist text not null default 'Untitled artist',
  kind text not null default 'album' check (kind in ('vinyl','album','photo')),
  target_image text not null,
  aspect real not null default 1,
  quality jsonb,
  layers jsonb not null default '[]'::jsonb,
  mind_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.campaigns to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;

alter table public.campaigns enable row level security;

create policy "campaigns_select_public"
  on public.campaigns for select to anon, authenticated
  using (true);

create policy "campaigns_insert_owner"
  on public.campaigns for insert to authenticated
  with check (owner_id = auth.uid());

create policy "campaigns_update_owner"
  on public.campaigns for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "campaigns_delete_owner"
  on public.campaigns for delete to authenticated
  using (owner_id = auth.uid());

create index campaigns_owner_idx on public.campaigns (owner_id);

create policy "ar_assets_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'ar-assets');

create policy "ar_assets_owner_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ar-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ar_assets_owner_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'ar-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ar-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ar_assets_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ar-assets' and (storage.foldername(name))[1] = auth.uid()::text);