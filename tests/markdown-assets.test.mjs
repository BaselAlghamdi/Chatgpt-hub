import test from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown,safeLink} from '../lib/markdown.ts';
import {newEntry} from '../lib/content.ts';
import {assetReferences} from '../lib/server/asset-references.ts';

const id='11111111-1111-4111-8111-111111111111';
const url='/api/media/'+id;
const refs=body=>assetReferences({...newEntry('article'),body});

test('asset access ignores examples and URLs that do not render as local destinations',()=>{
 for(const body of [url,'`'+url+'`','```md\n![private]('+url+')\n```','    [private]('+url+')','<img src="'+url+'">','[unused]: '+url,'[external](https://example.com'+url+')','[query](https://example.com?asset='+url+')','[suffix]('+url+'-extra)']){
  assert.deepEqual(refs(body),[],body);
 }
});

test('rendered inline and reference links/images grant the same assets as rendering',()=>{
 for(const body of ['[download]('+url+')','![chart]('+url+')','![chart][asset]\n\n[asset]: '+url,'> [download]('+url+')','|File|\n|-|\n|[download]('+url+')|']){
  assert.deepEqual(refs(body),[id],body);
 }
 assert.deepEqual(assetReferences({...newEntry('article'),coverUrl:url,credentialUrl:url,attachments:[{name:'File',url}],body:'![chart]('+url+')'}),[id]);
 assert.deepEqual(assetReferences({...newEntry('article'),coverUrl:'https://example.com'+url}),[]);
});

test('TOC labels decode entities once and preserve Arabic anchor destinations',()=>{
 const {html,toc}=renderMarkdown('## Company\'s &quot;value&quot; &copy; &#x2014; &#8217;\n\n## تحليل الشَركة\n\n[اذهب](#تحليل-الشَركة)');
 assert.equal(toc[0].label,'Company\'s "value" © — ’');
 assert.equal(toc[1].id,'تحليل-الشَركة');
 assert.ok(html.includes('href="#'+encodeURIComponent(toc[1].id)+'"'));
 assert.equal(safeLink('#'+encodeURIComponent(toc[1].id)),'#'+encodeURIComponent(toc[1].id));
 assert.equal(safeLink('#bad%ZZ'),'');
 assert.equal(safeLink('#%22onclick%3Dalert(1)'),'');
 const escaped=renderMarkdown('## &lt;script&gt; &amp;amp;');
 assert.equal(escaped.toc[0].label,'<script> &amp;');
 assert.doesNotMatch(escaped.html,/<script>/);
});
