import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RichContent} from '../components/rich-content.tsx';
import {richAssetIds,safeEmbed,safeRichUrl} from '../lib/rich-content.ts';

test('rich URLs reject executable, credentialed, insecure, and malformed destinations',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','http://example.com','https://user:pass@example.com','//example.com']){
  assert.equal(safeRichUrl(value), '', value);
 }
 assert.equal(safeRichUrl('mailto:basel@example.com'),'mailto:basel@example.com');
 assert.equal(safeRichUrl('https://example.com/report').startsWith('https://example.com/report'),true);
 assert.equal(safeRichUrl('#تحليل'),'#'+encodeURIComponent('تحليل'));
});

test('external embeds use a strict provider allowlist and canonical URLs',()=>{
 assert.deepEqual(safeEmbed('https://youtu.be/dQw4w9WgXcQ?feature=share'),{kind:'youtube',src:'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'});
 assert.equal(safeEmbed('https://evil.example/embed/video'),null);
 assert.equal(safeEmbed('javascript:alert(1)'),null);
 assert.equal(safeEmbed('https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ'),null);
});

test('rich renderer escapes text and ignores unknown attributes and executable URLs',()=>{
 const document={type:'doc',content:[
  {type:'heading',attrs:{level:2,id:'safe" onmouseover="alert(1)'},content:[{type:'text',text:'<img src=x onerror=alert(1)>'}]},
  {type:'paragraph',attrs:{style:'background:url(javascript:alert(1))',onClick:'alert(1)'},content:[{type:'text',text:'open',marks:[{type:'link',attrs:{href:'javascript:alert(1)',onmouseover:'alert(1)'}}]}]},
  {type:'image',attrs:{src:'data:image/svg+xml,<svg onload=alert(1)>',alt:'" onerror="alert(1)'}},
  {type:'embed',attrs:{url:'https://evil.example/embed',srcdoc:'<script>alert(1)</script>'}},
  {type:'unknown',attrs:{dangerouslySetInnerHTML:{__html:'<script>alert(1)</script>'}},content:[{type:'text',text:'kept safely'}]}
 ]};
 const html=renderToStaticMarkup(React.createElement(RichContent,{document}));
 assert.doesNotMatch(html,/<script|<img|<iframe|javascript:|dangerouslySetInnerHTML|href="javascript:|style="background|srcdoc=/i);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/kept safely/);
});

test('only exact persisted media references are associated with rich content',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const document={type:'doc',content:[
  {type:'image',attrs:{src:'/api/media/'+id}},
  {type:'paragraph',content:[{type:'text',text:'Mention /api/media/22222222-2222-4222-8222-222222222222 only as text.'}]},
  {type:'image',attrs:{src:'/api/media/'+id+'/extra'}},
  {type:'gallery',attrs:{images:[{src:'/api/media/'+id}]}}
 ]};
 assert.deepEqual(richAssetIds(document),[id]);
});
