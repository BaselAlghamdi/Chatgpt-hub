import test from 'node:test';
import assert from 'node:assert/strict';
import {requestJson} from '../lib/server/http.ts';
import {listEntries} from '../lib/server/data.ts';
import {renderMarkdown} from '../lib/markdown.ts';
import {pageMetadata} from '../lib/server/seo.ts';

test('long Arabic content saves within the bounded JSON limit',async()=>{
 const body='م'.repeat(160000);
 assert.equal((await requestJson(new Request('https://example.test',{method:'POST',body:JSON.stringify({body})}))).body,body);
 await assert.rejects(requestJson(new Request('https://example.test',{method:'POST',body:JSON.stringify({body:'x'.repeat(1024*1024)})})),e=>e.status===413);
});
test('backend failure is not returned as an empty published portfolio',async()=>{
 const original=globalThis.fetch;process.env.SUPABASE_URL='https://backend.example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';
 try{globalThis.fetch=async()=>Response.json({message:'Unavailable'},{status:503});await assert.rejects(listEntries('article'),/Unavailable/);
 globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await listEntries('article'),[]);
 }finally{globalThis.fetch=original}
});
test('Markdown images use valid phrasing markup and content does not add an H1',()=>{
 const {html}=renderMarkdown('# Heading\n\nText ![A chart](https://example.test/chart.png "Caption") after.');
 assert.doesNotMatch(html,/<h1|<figure|<figcaption/);assert.match(html,/<h2/);assert.match(html,/alt="A chart"/);assert.match(html,/markdown-caption/);
});
test('page metadata has page-specific canonical and share URLs',()=>{
 process.env.SITE_URL='https://baselalghamdi.me';const m=pageMetadata('/projects/model','Model','Description','/api/media/example');
 assert.equal(m.alternates.canonical,'https://baselalghamdi.me/projects/model');assert.equal(m.openGraph.url,m.alternates.canonical);assert.equal(m.twitter.card,'summary_large_image');
});
