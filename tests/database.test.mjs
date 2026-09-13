import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
import {newEntry} from '../lib/content.ts';
let db;
const asset='11111111-1111-4111-8111-111111111111';
const payload={...newEntry('article'),title:'QA entry',slug:'qa-entry'};
async function save(p,refs=[]){return(await db.query('select public.portfolio_save_entry($1::jsonb,$2::uuid[]) as result',[JSON.stringify(p),refs])).rows[0].result}
test.before(async()=>{db=new PGlite();await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'))});
test.after(async()=>db.close());
test('migration runs and content is empty',async()=>{assert.equal((await db.query('select count(*)::int as n from public.portfolio_entries')).rows[0].n,0)});
test('atomic save, stale edit rejection, missing asset rollback, publish and unpublish',async()=>{let a=await save(payload);assert.equal(a.revision,1);assert.equal(a.status,'draft');await db.query('insert into public.portfolio_assets(id,object_key,filename,content_type,size) values ($1,$2,$3,$4,8)',[asset,asset,'report.pdf','application/pdf']);a=await save({...payload,id:a.id,revision:1,attachments:[{url:'/api/media/'+asset,name:'Report',format:'PDF'}]},[asset]);assert.equal(a.revision,2);await assert.rejects(save({...payload,id:a.id,revision:1,title:'Stale edit'}),e=>e.code==='40001');assert.equal((await db.query('select count(*)::int as n from public.portfolio_entry_assets')).rows[0].n,1);await assert.rejects(save({...payload,id:a.id,revision:2},['22222222-2222-4222-8222-222222222222']),e=>e.code==='23503');assert.equal((await db.query('select revision from public.portfolio_entries where id=$1',[a.id])).rows[0].revision,2);a=await save({...payload,id:a.id,revision:2,status:'published',body:'## Analysis'},[asset]);assert.equal((await db.query("select count(*)::int as n from public.portfolio_entry_assets a join public.portfolio_entries e on e.id=a.entry_id where e.status='published'")).rows[0].n,1);a=await save({...payload,id:a.id,revision:a.revision,status:'draft'},[asset]);assert.equal((await db.query("select count(*)::int as n from public.portfolio_entries where status='published'")).rows[0].n,0);await db.query('delete from public.portfolio_entries where id=$1',[a.id]);assert.equal((await db.query('select count(*)::int as n from public.portfolio_entry_assets')).rows[0].n,0)});
test('duplicate slugs cannot overwrite records',async()=>{await save(payload);await assert.rejects(save(payload),e=>e.code==='23505')});
test('profile revisions prevent lost updates',async()=>{const r=await db.query("select public.portfolio_save_profile($1::jsonb) as result",[JSON.stringify({revision:0,name:'Owner'})]);assert.equal(r.rows[0].result.revision,1);await assert.rejects(db.query("select public.portfolio_save_profile($1::jsonb)",[JSON.stringify({revision:0,name:'Other'})]),e=>e.code==='23505');const next=await db.query("select public.portfolio_save_profile($1::jsonb) as result",[JSON.stringify({revision:1,name:'Updated'})]);assert.equal(next.rows[0].result.revision,2)});
test('version restore is atomic, preserves history, preserves the live snapshot, and rejects stale callers',async()=>{
 let current=await save({...payload,slug:'version-flow',title:'Original'});
 current=await save({...payload,id:current.id,revision:current.revision,slug:'version-flow',title:'Updated',status:'published',body:'## Published'});
 const before=(await db.query('select count(*)::int as n from public.portfolio_entry_versions where entry_id=$1',[current.id])).rows[0].n;
 assert.ok(before>=2);
 const restored=(await db.query('select public.portfolio_restore_entry_version($1,$2,$3) as result',[current.id,1,current.revision])).rows[0].result;
 assert.equal(restored.title,'Original');assert.equal(restored.status,'published');assert.equal(restored.published_data.title,'Updated');assert.equal(restored.revision,current.revision+1);
 assert.ok((await db.query('select count(*)::int as n from public.portfolio_entry_versions where entry_id=$1',[current.id])).rows[0].n>before);
 await assert.rejects(db.query('select public.portfolio_restore_entry_version($1,$2,$3)',[current.id,1,current.revision]),e=>e.code==='40001');
});
test('anonymous and authenticated browser roles cannot read or mutate tables or RPCs',async()=>{for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.portfolio_entries'),e=>e.code==='42501');await assert.rejects(db.query('select * from public.portfolio_entry_versions'),e=>e.code==='42501');await assert.rejects(db.query("select public.portfolio_save_entry($1::jsonb,'{}'::uuid[])",[JSON.stringify(payload)]),e=>e.code==='42501');await assert.rejects(db.query("select public.portfolio_restore_entry_version('11111111-1111-4111-8111-111111111111',1,1)"),e=>e.code==='42501');await db.exec('reset role')}const rows=await db.query("select relname,relrowsecurity from pg_class where relname in ('portfolio_entries','portfolio_assets','portfolio_entry_assets','portfolio_settings','portfolio_entry_versions')");assert.equal(rows.rows.length,5);assert.ok(rows.rows.every(r=>r.relrowsecurity));assert.equal((await db.query("select public from storage.buckets where id='portfolio-files'")).rows[0].public,false)});

test('autosave isolates published content and refs until explicit publish',async()=>{
 let a=await save({...payload,slug:'snapshot-flow',title:'Live title',body:'Live body',status:'published',saveMode:'publish'});
 assert.equal(a.published_data.body,'Live body');
 a=await save({...payload,id:a.id,revision:a.revision,title:'Private title',slug:'private-slug',body:'Private body',status:'published',saveMode:'draft'});
 assert.equal(a.status,'published');assert.equal(a.slug,'snapshot-flow');assert.equal(a.data.body,'Private body');assert.equal(a.published_data.body,'Live body');
 const versionCount=(await db.query('select count(*)::int as n from public.portfolio_entry_versions where entry_id=$1',[a.id])).rows[0].n;
 assert.equal(versionCount,1);
 a=await save({...a.data,id:a.id,revision:a.revision,saveMode:'publish'});
 assert.equal(a.published_data.body,'Private body');assert.equal(a.slug,'private-slug');
 a=await save({...a.data,id:a.id,revision:a.revision,saveMode:'unpublish'});
 assert.equal(a.published_data,null);assert.equal(a.status,'draft');
});
test('schema can be reapplied without exposing unpublished draft changes',async()=>{
 let a=await save({...payload,slug:'migration-snapshot',body:'Published original',status:'published',saveMode:'publish'});
 a=await save({...a.data,id:a.id,revision:a.revision,body:'Private changed',saveMode:'draft'});
 await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 const row=(await db.query('select * from portfolio_entries where id=$1',[a.id])).rows[0];
 assert.equal(row.published_data.body,'Published original');assert.equal(row.data.body,'Private changed');
});
