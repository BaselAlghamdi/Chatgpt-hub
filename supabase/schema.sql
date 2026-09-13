-- Run once in your Supabase SQL Editor. Creates a separate portfolio namespace.
-- Does not seed reports or modify tables used by another website.
begin;
create table if not exists public.portfolio_entries (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('article','project','certificate','honor')),
 slug text not null,
 title text not null,
 status text not null default 'draft' check (status in ('draft','published')),
 featured boolean not null default false,
 sort_order integer not null default 0,
 date text not null default '',
 data jsonb not null,
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(kind,slug)
);
-- Public snapshot remains unchanged while the owner edits a working draft.
alter table public.portfolio_entries add column if not exists published_data jsonb;
alter table public.portfolio_entries add column if not exists published_updated_at timestamptz;
update public.portfolio_entries set published_data=data,published_updated_at=updated_at where status='published' and published_data is null;
create index if not exists portfolio_public_list on public.portfolio_entries(kind,status,featured,sort_order,date);
create table if not exists public.portfolio_assets (
 id uuid primary key,
 object_key text not null unique,
 filename text not null,
 content_type text not null,
 size integer not null check (size>0 and size<=4194304),
 created_at timestamptz not null default now()
);
create table if not exists public.portfolio_entry_assets (
 entry_id uuid not null references public.portfolio_entries(id) on delete cascade,
 asset_id uuid not null references public.portfolio_assets(id) on delete restrict,
 primary key(entry_id,asset_id)
);
create index if not exists portfolio_asset_visibility on public.portfolio_entry_assets(asset_id);
create table if not exists public.portfolio_settings (
 key text primary key,
 value jsonb not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_entry_versions (
 entry_id uuid not null references public.portfolio_entries(id) on delete cascade,
 revision integer not null check (revision>0),
 data jsonb not null,
 asset_ids uuid[] not null default '{}',
 reason text not null default 'autosave' check (reason in ('created','autosave','manual','published','unpublished','restored')),
 created_at timestamptz not null default now(),
 primary key(entry_id,revision)
);
create index if not exists portfolio_entry_versions_recent on public.portfolio_entry_versions(entry_id,created_at desc);
-- All content access is mediated by the Next.js server. No browser key can
-- access drafts, files, settings, or mutations directly, even when signed in.
alter table public.portfolio_entries enable row level security;
alter table public.portfolio_assets enable row level security;
alter table public.portfolio_entry_assets enable row level security;
alter table public.portfolio_settings enable row level security;
alter table public.portfolio_entry_versions enable row level security;
revoke all on public.portfolio_entries,public.portfolio_assets,public.portfolio_entry_assets,public.portfolio_settings,public.portfolio_entry_versions from anon,authenticated;
grant all on public.portfolio_entries,public.portfolio_assets,public.portfolio_entry_assets,public.portfolio_settings,public.portfolio_entry_versions to service_role;

create or replace function public.portfolio_save_entry(payload jsonb,asset_ids uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 result public.portfolio_entries;
 previous public.portfolio_entries;
 entry_id uuid;
 version_reason text;
 previous_asset_ids uuid[];
 save_mode text := coalesce(payload->>'saveMode',case when payload->>'status'='published' then 'publish' else 'unpublish' end);
begin
 if save_mode not in ('draft','publish','unpublish') then raise exception 'Invalid save mode' using errcode='22023'; end if;
 payload:=payload-'saveMode';
 if (payload->>'id') is null then
  payload:=payload || jsonb_build_object('status',case when save_mode='publish' then 'published' else 'draft' end);
  insert into public.portfolio_entries(kind,slug,title,status,featured,sort_order,date,data)
  values(payload->>'kind',payload->>'slug',payload->>'title',payload->>'status',(payload->>'featured')::boolean,(payload->>'sortOrder')::integer,payload->>'date',payload)
  returning * into result;
  insert into public.portfolio_entry_versions(entry_id,revision,data,asset_ids,reason)
  values(result.id,result.revision,result.data,coalesce(asset_ids,'{}'),'created');
 else
  select * into previous from public.portfolio_entries
   where id=(payload->>'id')::uuid and kind=payload->>'kind' for update;
  if not found or previous.revision<>(payload->>'revision')::integer then
   raise exception 'Edit conflict' using errcode='40001';
  end if;
  if not exists(select 1 from public.portfolio_entry_versions v where v.entry_id=previous.id) then
   select coalesce(array_agg(a.asset_id order by a.asset_id),'{}') into previous_asset_ids from public.portfolio_entry_assets a where a.entry_id=previous.id;
   insert into public.portfolio_entry_versions(entry_id,revision,data,asset_ids,reason)
   values(previous.id,previous.revision,previous.data,previous_asset_ids,'created');
  end if;
  if save_mode='draft' and previous.status='published' then
   select coalesce(array_agg(a.asset_id),'{}') into previous_asset_ids from public.portfolio_entry_assets a where a.entry_id=previous.id;
  else previous_asset_ids:='{}'; end if;
  if save_mode='draft' then payload:=payload || jsonb_build_object('status',previous.status); end if;
  if save_mode='unpublish' then payload:=payload || jsonb_build_object('status','draft'); end if;
  if save_mode='publish' then payload:=payload || jsonb_build_object('status','published'); end if;
  update public.portfolio_entries set
   slug=case when save_mode='draft' and previous.status='published' then previous.slug else payload->>'slug' end,title=payload->>'title',status=payload->>'status',
   featured=(payload->>'featured')::boolean,sort_order=(payload->>'sortOrder')::integer,
   date=payload->>'date',data=payload,revision=revision+1,updated_at=now()
  where id=previous.id
  returning * into result;
  version_reason:=case when save_mode='publish' then 'published' when previous.status<>result.status then 'unpublished' else 'autosave' end;
  if version_reason<>'autosave' or not exists (
   select 1 from public.portfolio_entry_versions v where v.entry_id=result.id and v.created_at>now()-interval '10 minutes'
  ) then
   insert into public.portfolio_entry_versions(entry_id,revision,data,asset_ids,reason)
   values(result.id,result.revision,result.data,coalesce(asset_ids,'{}'),version_reason)
   on conflict on constraint portfolio_entry_versions_pkey do nothing;
  end if;
 end if;
 if save_mode='publish' then
  update public.portfolio_entries set published_data=data,published_updated_at=updated_at where id=result.id returning * into result;
 elsif save_mode='unpublish' then
  update public.portfolio_entries set published_data=null,published_updated_at=null where id=result.id returning * into result;
 end if;
 entry_id:=result.id;
 delete from public.portfolio_entry_assets a where a.entry_id=result.id;
 insert into public.portfolio_entry_assets(entry_id,asset_id)
  select result.id,v from (select distinct unnest(asset_ids || coalesce(previous_asset_ids,'{}')) as v) refs;
 return to_jsonb(result);
end;
$$;
create or replace function public.portfolio_checkpoint_entry(target_id uuid,expected_revision integer,checkpoint_reason text default 'manual')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_entry public.portfolio_entries; refs uuid[];
begin
 if checkpoint_reason not in ('manual','published','unpublished') then raise exception 'Invalid checkpoint reason' using errcode='22023'; end if;
 select * into current_entry from public.portfolio_entries where id=target_id and revision=expected_revision for update;
 if not found then raise exception 'Edit conflict' using errcode='40001'; end if;
 select coalesce(array_agg(asset_id order by asset_id),'{}') into refs from public.portfolio_entry_assets where entry_id=target_id;
 insert into public.portfolio_entry_versions(entry_id,revision,data,asset_ids,reason)
 values(current_entry.id,current_entry.revision,current_entry.data,refs,checkpoint_reason)
 on conflict on constraint portfolio_entry_versions_pkey do update set reason=excluded.reason;
 return to_jsonb(current_entry);
end;
$$;
create or replace function public.portfolio_restore_entry_version(target_id uuid,target_revision integer,expected_revision integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_entry public.portfolio_entries; old_version public.portfolio_entry_versions; result public.portfolio_entries; restored_data jsonb;
begin
 select * into current_entry from public.portfolio_entries where id=target_id for update;
 if not found or current_entry.revision<>expected_revision then raise exception 'Edit conflict' using errcode='40001'; end if;
 select * into old_version from public.portfolio_entry_versions where entry_id=target_id and revision=target_revision;
 if not found then raise exception 'Version not found' using errcode='P0002'; end if;
 perform public.portfolio_checkpoint_entry(target_id,expected_revision,'manual');
 restored_data:=old_version.data || jsonb_build_object('id',target_id::text,'revision',expected_revision+1);
 update public.portfolio_entries set
  kind=restored_data->>'kind',slug=case when current_entry.status='published' then current_entry.slug else restored_data->>'slug' end,title=restored_data->>'title',status=current_entry.status,
  featured=(restored_data->>'featured')::boolean,sort_order=(restored_data->>'sortOrder')::integer,
  date=restored_data->>'date',data=restored_data || jsonb_build_object('status',current_entry.status),revision=revision+1,updated_at=now()
 where id=target_id returning * into result;
 insert into public.portfolio_entry_assets(entry_id,asset_id) select target_id,u.asset_id from unnest(old_version.asset_ids) as u(asset_id) on conflict do nothing;
 insert into public.portfolio_entry_versions(entry_id,revision,data,asset_ids,reason)
 values(result.id,result.revision,result.data,old_version.asset_ids,'restored');
 return to_jsonb(result);
end;
$$;
create or replace function public.portfolio_save_profile(payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.portfolio_settings;
begin
 if (payload->>'revision')::integer=0 then
  insert into public.portfolio_settings(key,value) values('profile',payload-'revision') returning * into result;
 else
  update public.portfolio_settings set value=payload-'revision',revision=revision+1,updated_at=now()
  where key='profile' and revision=(payload->>'revision')::integer returning * into result;
  if not found then raise exception 'Edit conflict' using errcode='40001'; end if;
 end if;
 return to_jsonb(result);
end;
$$;
revoke all on function public.portfolio_save_entry(jsonb,uuid[]) from public,anon,authenticated;
revoke all on function public.portfolio_save_profile(jsonb) from public,anon,authenticated;
revoke all on function public.portfolio_checkpoint_entry(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.portfolio_restore_entry_version(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.portfolio_save_entry(jsonb,uuid[]) to service_role;
grant execute on function public.portfolio_save_profile(jsonb) to service_role;
grant execute on function public.portfolio_checkpoint_entry(uuid,integer,text) to service_role;
grant execute on function public.portfolio_restore_entry_version(uuid,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-files','portfolio-files',false,4194304,array[
 'image/jpeg','image/png','image/webp','image/gif','application/pdf',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Do not add public storage policies. Media is authorized and proxied by /api/media/:id.
commit;
