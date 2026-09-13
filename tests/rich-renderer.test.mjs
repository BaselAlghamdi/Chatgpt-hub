import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RichContent} from '../components/rich-content.tsx';
import {parseRichDocument,plainText,richWordCount,richAssetIds,richOutline,safeEmbed,safeRichUrl} from '../lib/rich-content.ts';
const text=value=>({type:'text',text:value});const p=value=>({type:'paragraph',content:[text(value)]});
const doc=content=>({type:'doc',content});
const html=d=>renderToStaticMarkup(React.createElement(RichContent,{document:d}));
test('rich document validates bounded trees and rejects executable URLs',()=>{
 assert.ok(parseRichDocument(doc([p('hello')])));
 assert.equal(parseRichDocument(doc([{type:'script',text:'bad'}])),null);
 assert.equal(parseRichDocument(doc([{type:'financeImage',attrs:{src:'javascript:alert(1)'}}])),null);
 assert.equal(parseRichDocument(doc([{type:'text',text:'click',marks:[{type:'link',attrs:{href:'data:text/html,bad'}}]}])),null);
 let deep=p('x');for(let n=0;n<45;n++)deep={type:'blockquote',content:[deep]};assert.equal(parseRichDocument(doc([deep])),null);
 assert.equal(parseRichDocument({type:'doc',content:{bad:1}}),null);
});
test('paragraph boundaries and inline formatting preserve accurate words',()=>{
 const value=doc([{type:'paragraph',content:[text('Com'),{...text('pany'),marks:[{type:'bold'}]},text(' value')]},p('Next line')]);assert.equal(plainText(value),'Company value\nNext line');assert.equal(richWordCount(value),4);
});
test('only rendered rich destinations grant asset access',()=>{
 const url='/api/media/11111111-1111-4111-8111-111111111111';
 assert.deepEqual(richAssetIds(doc([{type:'codeBlock',attrs:{src:url},content:[text(url)]},{type:'paragraph',attrs:{src:url},content:[text(url)]}])),[]);
 assert.deepEqual(richAssetIds(doc([{type:'paragraph',content:[{...text('download'),marks:[{type:'link',attrs:{href:url}}]}]}])),[url.split('/').pop()]);
 assert.deepEqual(richAssetIds(doc([{type:'gallery',attrs:{images:[{src:url,alt:'chart'}]}}])),[url.split('/').pop()]);
});
test('allowlisted embeds canonicalize and unsafe schemes are blocked',()=>{
 assert.equal(safeEmbed('https://youtu.be/abcdefghijk').src,'https://www.youtube-nocookie.com/embed/abcdefghijk');
 assert.equal(safeEmbed('https://open.spotify.com/track/abc123').kind,'spotify');
 assert.equal(safeEmbed('https://evil.example/embed/video'),null);assert.equal(safeEmbed('https://youtube.com.evil.example/watch?v=abcdefghijk'),null);
 assert.equal(safeRichUrl('javascript:alert(1)'), '');assert.equal(safeRichUrl('#القيمة'),'#%D8%A7%D9%84%D9%82%D9%8A%D9%85%D8%A9');
});
test('published content renders finance blocks, safe math, and ordered footnotes',()=>{
 const d=doc([{type:'heading',attrs:{level:2,id:'thesis'},content:[text('Thesis')]},{type:'paragraph',content:[text('One'),{type:'footnote',attrs:{text:'Source A'}},text(' two'),{type:'footnote',attrs:{text:'Source B'}}]},{type:'equation',attrs:{latex:'WACC = w_e r_e + w_d r_d(1-T)'}},{type:'inlineEquation',attrs:{latex:'x^2'}},{type:'callout',attrs:{kind:'risk',title:'Risk'},content:[p('Risk analysis')]},{type:'tableOfContents'},{type:'gallery',attrs:{images:[{src:'https://example.com/chart.gif',alt:'Animated chart',caption:'Revenue growth'}]}},{type:'safeEmbed',attrs:{url:'https://youtu.be/abcdefghijk'}}]);
 const rendered=html(d);assert.match(rendered,/class="katex/);assert.match(rendered,/Footnote 1/);assert.match(rendered,/Footnote 2/);assert.match(rendered,/id="fn-note-1"/);assert.match(rendered,/href="#fnref-note-1-1"/);assert.match(rendered,/Revenue growth/);assert.match(rendered,/youtube-nocookie/);assert.match(rendered,/href="#thesis"/);assert.doesNotMatch(rendered,/<script/);
 const reversed=doc([d.content[1],{type:'paragraph',content:[{type:'footnote',attrs:{text:'Source C'}}]}]);assert.match(html(reversed),/Footnote 3/);
});
test('malicious text and attribute values never become executable HTML',()=>{
 const d=doc([p('<script>alert(1)</script>'),{type:'financeImage',attrs:{src:'javascript:alert(1)',alt:'x'}},{type:'safeEmbed',attrs:{url:'https://evil.example/attack'}},{type:'equation',attrs:{latex:'\\href{javascript:alert(1)}{X}'}}]);const rendered=html(d);assert.doesNotMatch(rendered,/<script|src="javascript:|href="javascript:/);assert.match(rendered,/&lt;script&gt;/);assert.doesNotMatch(rendered,/<iframe/);
});
test('stable heading IDs and Unicode labels remain unique on reorder',()=>{
 const a={type:'heading',attrs:{level:2,id:'stable'},content:[text('Company\'s value')]};const b={type:'heading',attrs:{level:3},content:[text('القيمة')]};const result=richOutline(doc([a,b]));assert.equal(result.toc[0].label,"Company's value");assert.equal(richOutline(doc([b,a])).headingIds.get(a),'stable');assert.equal(result.toc[1].id,'القيمة');
});
