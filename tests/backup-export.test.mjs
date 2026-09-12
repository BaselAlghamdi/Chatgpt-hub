import test from 'node:test';
import assert from 'node:assert/strict';
import {exportPage} from '../lib/server/backup-export.ts';
import {decodeFile} from '../lib/backup.ts';
const id='11111111-1111-4111-8111-111111111111';
Object.assign(process.env,{SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-only'});
test('backup full-body pages use bounded keyset queries and preserve content',async()=>{
 const original=fetch;let query;
 try{globalThis.fetch=async(url)=>{query=new URL(url).searchParams;return Response.json([{id,data:{body:'Full body'},revision:2,created_at:'created',updated_at:'updated'}])};
 const page=await exportPage('entries',id);
 assert.equal(query.get('limit'),'2');assert.equal(query.get('id'),'gt.'+id);assert.equal(query.get('offset'),null);
 assert.equal(page.items[0].body,'Full body');assert.equal(page.items[0].revision,2);assert.equal(page.next,id);
 globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await exportPage('entries',id),{items:[],next:null});
 }finally{globalThis.fetch=original}
});
test('backup page rejects malformed collection/cursors before querying',async()=>{
 await assert.rejects(exportPage('secrets',null),/cursor/);
 await assert.rejects(exportPage('entries','x&limit=999'),/cursor/);
});
test('backup refuses oversized response rather than returning a truncated page',async()=>{
 const original=fetch;
 try{globalThis.fetch=async()=>Response.json([{id,data:{body:'a'.repeat(3*1024*1024)}}]);await assert.rejects(exportPage('entries',null),/page size/)}finally{globalThis.fetch=original}
});
test('backup decodes maximum upload bytes without regex stack overflow and rejects noncanonical encoding',()=>{
 const bytes=Buffer.alloc(4*1024*1024,9);assert.equal(decodeFile(bytes.toString('base64')).length,bytes.length);
 assert.throws(()=>decodeFile('YQ'),/encoding/);assert.throws(()=>decodeFile('YW Jj'),/encoding/);
});
