import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PGlite} from '@electric-sql/pglite';
import {jar} from './mock-headers.mjs';
import {SESSION_COOKIE} from '../lib/server/auth.ts';
import {POST as create} from '../app/api/desk-65efdcc4b137b000/entries/route.ts';
import {PUT as edit} from '../app/api/desk-65efdcc4b137b000/entries/[id]/route.ts';
import {getEntry,getPublishedEntry} from '../lib/server/data.ts';
import {newEntry} from '../lib/content.ts';
import {RichContent} from '../components/rich-content.tsx';

const owner={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'};
const mediaId='22222222-2222-4222-8222-222222222222';
const text=value=>({type:'text',text:value});
const paragraph=value=>({type:'paragraph',content:[text(value)]});
const document={type:'doc',content:[
 {type:'heading',attrs:{level:2,id:'investment-thesis'},content:[text('Investment Thesis')]},
 {type:'paragraph',content:[{...text('Revenue growth'),marks:[{type:'bold'},{type:'underline'}]},text(' supports value.')]},
 {type:'tableOfContents'},
 {type:'table',content:[{type:'tableRow',content:[{type:'tableHeader',content:[paragraph('Revenue')]},{type:'tableHeader',content:[paragraph('2026E')]}]},{type:'tableRow',content:[{type:'tableCell',content:[paragraph('Company')]},{type:'tableCell',content:[paragraph('120')]}]}]},
 {type:'equation',attrs:{latex:'PV=\\frac{CF}{1+r}'}},
 {type:'financeImage',attrs:{src:'/api/media/'+mediaId,alt:'Revenue forecast chart',caption:'Forecast assumptions',width:800,height:400}},
 {type:'callout',attrs:{kind:'risk'},content:[paragraph('Execution risk remains.')]},
 {type:'paragraph',content:[text('Source'),{type:'footnote',attrs:{id:'source-1',text:'Annual report 2025'}}]}
]};
function request(method,payload){return new Request('https://portfolio.example.test/api/desk-65efdcc4b137b000/entries',{method,headers:{origin:'https://portfolio.example.test','Content-Type':'application/json'},body:JSON.stringify(payload)})}
function html(entry){return renderToStaticMarkup(React.createElement(RichContent,{document:entry.richContent}))}

test('API → PostgreSQL → reload → preview → publish → private autosave → republish preserves rich research',async()=>{
 const db=new PGlite();const original=fetch;
 Object.assign(process.env,{SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',SUPABASE_ANON_KEY:'test-anon-key',ADMIN_USER_ID:owner.id,ADMIN_EMAIL:owner.email,SITE_URL:'https://portfolio.example.test'});
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  await db.query('insert into portfolio_assets(id,object_key,filename,content_type,size) values($1::uuid,$1::text,$2,$3,8)',[mediaId,'chart.png','image/png']);
  // Only HTTP transport and external identity verification are substituted.
  // Requests still pass the real route, validation, authorization and SQL RPC.
  globalThis.fetch=async(url,init)=>{
   const u=new URL(url);
   if(u.pathname==='/auth/v1/user')return Response.json(owner);
   if(u.pathname==='/rest/v1/rpc/portfolio_save_entry'){
    const body=JSON.parse(init.body);
    try{return Response.json((await db.query('select portfolio_save_entry($1::jsonb,$2::uuid[]) as result',[JSON.stringify(body.payload),body.asset_ids])).rows[0].result)}
    catch(error){return Response.json({code:error.code,message:error.message},{status:400})}
   }
   if(u.pathname==='/rest/v1/portfolio_entries'){
    const published=u.searchParams.get('status')==='eq.published';
    assert.equal(u.searchParams.get('select'),published?'id,data:published_data,revision,created_at,updated_at:published_updated_at':'id,data,revision,created_at,updated_at');
    const rows=published?await db.query("select id,published_data as data,revision,created_at,published_updated_at as updated_at from portfolio_entries where kind=$1 and slug=$2 and status='published'",[u.searchParams.get('kind').slice(3),u.searchParams.get('slug').slice(3)]):await db.query('select id,data,revision,created_at,updated_at from portfolio_entries where id=$1',[u.searchParams.get('id').slice(3)]);
    return Response.json(rows.rows);
   }
   throw new Error('Unexpected integration request: '+u.pathname);
  };
  jar.set(SESSION_COOKIE,'test-session');
  const payload={...newEntry('article'),title:'Research workflow',slug:'research-workflow',excerpt:'Valuation and forecasts',tags:['Valuation','DCF'],author:'Basel Alghamdi',contentFormat:'rich',richContent:document,seo:{...newEntry('article').seo,title:'Research SEO title',description:'Valuation research preview'}};
  let response=await create(request('POST',payload));assert.equal(response.status,201);
  let entry=await response.json();const context={params:Promise.resolve({id:entry.id})};
  assert.equal(await getPublishedEntry('article',entry.slug),null);
  const savedDocument=structuredClone(document);savedDocument.content.push(paragraph('Autosaved draft conclusion.'));
  response=await edit(request('PUT',{...entry,richContent:savedDocument,saveMode:'draft'}),context);assert.equal(response.status,200);entry=await response.json();
  // Fresh read reconstructs the persisted state as reopening the admin does.
  entry=await getEntry(entry.id);assert.deepEqual(entry.richContent,savedDocument);assert.deepEqual(entry.tags,['Valuation','DCF']);assert.equal(entry.seo.title,'Research SEO title');
  const preview=html(entry);assert.match(preview,/<table/);assert.match(preview,/katex/);assert.match(preview,/Revenue forecast chart/);assert.match(preview,/Autosaved draft conclusion/);
  response=await edit(request('PUT',{...entry,status:'published',saveMode:'publish'}),context);assert.equal(response.status,200);entry=await response.json();
  let live=await getPublishedEntry('article','research-workflow');assert.equal(html(live),preview);
  const privateDocument=structuredClone(savedDocument);privateDocument.content.push(paragraph('Private revision pending publication.'));
  response=await edit(request('PUT',{...entry,title:'Revised title',richContent:privateDocument,saveMode:'draft'}),context);assert.equal(response.status,200);entry=await response.json();
  assert.equal((await getEntry(entry.id)).title,'Revised title');
  live=await getPublishedEntry('article','research-workflow');assert.equal(live.title,'Research workflow');assert.doesNotMatch(html(live),/Private revision/);
  const beforeFailed=await getEntry(entry.id);
  response=await edit(request('PUT',{...entry,revision:1,richContent:{type:'doc',content:[paragraph('Stale overwrite')]},saveMode:'draft'}),context);assert.equal(response.status,409);
  assert.deepEqual((await getEntry(entry.id)).richContent,beforeFailed.richContent);
  response=await edit(request('PUT',{...entry,saveMode:'publish'}),context);assert.equal(response.status,200);
  live=await getPublishedEntry('article','research-workflow');assert.equal(live.title,'Revised title');assert.match(html(live),/Private revision pending publication/);assert.deepEqual(live.richContent,privateDocument);
  response=await create(request('POST',payload));assert.equal(response.status,409);
 }finally{globalThis.fetch=original;jar.clear();await db.close()}
});

test('upgrade backfills a legacy published article without changing its URL or metadata',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table portfolio_entries(id uuid primary key default gen_random_uuid(),kind text not null,slug text not null,title text not null,status text not null default 'draft',featured boolean not null default false,sort_order integer not null default 0,date text not null default '',data jsonb not null,revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(kind,slug));`);
  const legacy={...newEntry('article'),title:'Legacy research',slug:'legacy-research',body:'## Original research\n\nPreserve this article.',status:'published',tags:['DCF']};
  delete legacy.contentFormat;delete legacy.richContent;delete legacy.seo;delete legacy.author;
  await db.query("insert into portfolio_entries(kind,slug,title,status,data) values('article',$1,$2,'published',$3)",[legacy.slug,legacy.title,JSON.stringify(legacy)]);
  await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  const row=(await db.query('select * from portfolio_entries')).rows[0];
  assert.equal(row.slug,'legacy-research');assert.equal(row.revision,1);assert.deepEqual(row.data,JSON.parse(JSON.stringify(legacy)));assert.deepEqual(row.published_data,row.data);
  assert.equal((await db.query('select count(*)::int as n from portfolio_entry_versions')).rows[0].n,0);
 }finally{await db.close()}
});
