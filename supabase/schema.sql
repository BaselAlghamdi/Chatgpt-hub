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
-- All content access is mediated by the Next.js server. No browser key can
-- access drafts, files, settings, or mutations directly, even when signed in.
alter table public.portfolio_entries enable row level security;
alter table public.portfolio_assets enable row level security;
alter table public.portfolio_entry_assets enable row level security;
alter table public.portfolio_settings enable row level security;
revoke all on public.portfolio_entries,public.portfolio_assets,public.portfolio_entry_assets,public.portfolio_settings from anon,authenticated;
grant all on public.portfolio_entries,public.portfolio_assets,public.portfolio_entry_assets,public.portfolio_settings to service_role;

create or replace function public.portfolio_save_entry(payload jsonb,asset_ids uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 result public.portfolio_entries;
 entry_id uuid;
begin
 if (payload->>'id') is null then
  insert into public.portfolio_entries(kind,slug,title,status,featured,sort_order,date,data)
  values(payload->>'kind',payload->>'slug',payload->>'title',payload->>'status',(payload->>'featured')::boolean,(payload->>'sortOrder')::integer,payload->>'date',payload)
  returning * into result;
 else
  update public.portfolio_entries set
   slug=payload->>'slug',title=payload->>'title',status=payload->>'status',
   featured=(payload->>'featured')::boolean,sort_order=(payload->>'sortOrder')::integer,
   date=payload->>'date',data=payload,revision=revision+1,updated_at=now()
  where id=(payload->>'id')::uuid and kind=payload->>'kind' and revision=(payload->>'revision')::integer
  returning * into result;
  if not found then raise exception 'Edit conflict' using errcode='40001'; end if;
 end if;
 entry_id:=result.id;
 delete from public.portfolio_entry_assets a where a.entry_id=result.id;
 insert into public.portfolio_entry_assets(entry_id,asset_id)
  select result.id,v from (select distinct unnest(asset_ids) as v) refs;
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
grant execute on function public.portfolio_save_entry(jsonb,uuid[]) to service_role;
grant execute on function public.portfolio_save_profile(jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-files','portfolio-files',false,4194304,array[
 'image/jpeg','image/png','image/webp','image/gif','application/pdf',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Do not add public storage policies. Media is authorized and proxied by /api/media/:id.
commit;
