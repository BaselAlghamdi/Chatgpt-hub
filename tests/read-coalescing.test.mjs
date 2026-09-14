import test from 'node:test';
import assert from 'node:assert/strict';
import {rest} from '../lib/server/supabase.ts';
test('concurrent reads share a request, failures are evicted, and writes are never shared',async()=>{
 const original=fetch;Object.assign(process.env,{SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture'});
 let calls=0,release;
 try{
 globalThis.fetch=()=>{calls++;return new Promise(resolve=>release=resolve)};
 const a=rest('items'),b=rest('items');assert.equal(calls,1);
 release(Response.json({message:'unavailable'},{status:503}));
 const failed=await Promise.allSettled([a,b]);assert.ok(failed.every(x=>x.status==='rejected'));
 globalThis.fetch=async()=>{calls++;return Response.json([{id:1}])};
 assert.deepEqual(await rest('items'),[{id:1}]);assert.equal(calls,2);
 await Promise.all([rest('items',{method:'POST',body:'{}'}),rest('items',{method:'POST',body:'{}'})]);assert.equal(calls,4);
 }finally{globalThis.fetch=original}
});
