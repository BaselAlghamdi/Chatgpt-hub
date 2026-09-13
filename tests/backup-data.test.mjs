import test from 'node:test';
import assert from 'node:assert/strict';
import {newEntry,defaultProfile} from '../lib/content.ts';
import {checksum,validateBackup,restoreEntry} from '../lib/backup.ts';
import {listEntries,exportEntries,isPublicAsset} from '../lib/server/data.ts';
const id='11111111-1111-4111-8111-111111111111';
const replacement='22222222-2222-4222-8222-222222222222';
const entry={...newEntry('article'),title:'Original',slug:'original',contentFormat:'markdown',richContent:null,body:'![Chart](/api/media/'+id+')'};
async function backup(){const bytes=new TextEncoder().encode('%PDF-1.7 test');return{version:2,exportedAt:'2026-09-10',profile:defaultProfile,entries:[entry],assets:[{id,filename:'report.pdf',size:bytes.length,content_type:'application/pdf',base64:Buffer.from(bytes).toString('base64'),sha256:await checksum(bytes)}]}}
test('backup verifies every file and rejects tampered or missing files before restore',async()=>{const b=await backup();assert.equal((await validateBackup(b)).assets.length,1);await assert.rejects(validateBackup({...b,assets:[]}),/missing/);await assert.rejects(validateBackup({...b,assets:[{...b.assets[0],sha256:'0'.repeat(64)}]}),/integrity/);await assert.rejects(validateBackup({...b,assets:[b.assets[0],b.assets[0]]}),/duplicate/)});
test('restore creates drafts without IDs/revisions and remaps uploaded file references',()=>{const e=restoreEntry({...entry,id,revision:9,status:'published'},new Map([[id,replacement]]),'abc123');assert.equal(e.id,undefined);assert.equal(e.revision,0);assert.equal(e.status,'draft');assert.match(e.body,new RegExp(replacement));assert.equal(e.slug,'original-restored-abc123')});
test('database list payloads omit body and full export paginates without dropping records',async()=>{const original=fetch;Object.assign(process.env,{SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-only'});try{let requests=[];globalThis.fetch=async(url)=>{const u=new URL(url);requests.push(u);const offset=Number(u.searchParams.get('offset'));if(offset)return Response.json([]);return Response.json([{...entry,id,title:'Title',readingMinutes:3,revision:1,created_at:'2026-09-10',updated_at:'2026-09-10'}])};const entries=await listEntries('article',false);assert.equal(entries[0].body,'');assert.equal(entries[0].readingMinutes,3);assert.equal(requests.length,1);globalThis.fetch=async(url)=>{const offset=Number(new URL(url).searchParams.get('offset'));return Response.json(offset>=503?[]:Array.from({length:Math.min(200,503-offset)},(_,i)=>({id:String(offset+i),data:{...entry,body:'Full content'},revision:1,created_at:'',updated_at:''})))};const full=await exportEntries();assert.equal(full.length,503);assert.equal(full[502].body,'Full content')}finally{globalThis.fetch=original}});
test('legacy public file association alone does not expose a code-only reference',async()=>{const original=fetch;try{globalThis.fetch=async(url)=>Response.json(Number(new URL(url).searchParams.get('offset'))?[]:[{portfolio_entries:{published_data:{...entry,body:'`/api/media/'+id+'`'}}}]);assert.equal(await isPublicAsset(id),false);globalThis.fetch=async(url)=>Response.json(Number(new URL(url).searchParams.get('offset'))?[]:[{portfolio_entries:{published_data:entry}}]);assert.equal(await isPublicAsset(id),true)}finally{globalThis.fetch=original}});
test('public media uses published snapshots across association pages, never the working draft',async()=>{
 const original=fetch;
 Object.assign(process.env,{SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-only'});
 try{
  let requests=0;
  globalThis.fetch=async(url)=>{
   requests++;
   const offset=Number(new URL(url).searchParams.get('offset'));
   return Response.json(offset===0?[{entry_id:'first',portfolio_entries:{data:entry,published_data:{...entry,body:'No media'}}}]:offset===1?[{entry_id:'second',portfolio_entries:{published_data:entry}}]:[]);
  };
  assert.equal(await isPublicAsset(id),true);
  assert.equal(requests,2);
  globalThis.fetch=async(url)=>Response.json(Number(new URL(url).searchParams.get('offset'))?[]:[{entry_id:'first',portfolio_entries:{data:entry,published_data:{...entry,body:'No media'}}}]);
  assert.equal(await isPublicAsset(id),false);
  globalThis.fetch=async()=>Response.json({error:'unexpected response'});
  await assert.rejects(isPublicAsset(id),/Invalid media access response/);
 }finally{globalThis.fetch=original}
});
