import test from 'node:test';
import assert from 'node:assert/strict';
import {toArchiveEntry} from '../lib/archive.ts';
import {newEntry,readTime} from '../lib/content.ts';
import {getProfile} from '../lib/server/data.ts';

test('archive payload omits article bodies and retains search fields and reading time',()=>{
 const entry={...newEntry('article'),id:'test',title:'Valuation',tags:['DCF'],body:'analysis '.repeat(10000),createdAt:'',updatedAt:''};
 const card=toArchiveEntry(entry);
 assert.equal(card.body,'');assert.equal(card.readingMinutes,readTime(entry.body));
 assert.deepEqual(card.tags,entry.tags);assert.equal(card.title,entry.title);
 assert.ok(JSON.stringify(card).length<JSON.stringify(entry).length/10);
 assert.ok(entry.body.length>0);
});
test('administrator profile reads reflect each backend revision and surface failures',async()=>{
 const original=globalThis.fetch;
 process.env.SUPABASE_URL='https://backend.example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test';
 let revision=0;
 try{
 globalThis.fetch=async()=>Response.json([{value:{name:'Owner'},revision:++revision}]);
 assert.equal((await getProfile(true)).revision,1);
 assert.equal((await getProfile(true)).revision,2);
 globalThis.fetch=async()=>Response.json({message:'Unavailable'},{status:503});
 await assert.rejects(getProfile(true),/Unavailable/);
 }finally{globalThis.fetch=original}
});
