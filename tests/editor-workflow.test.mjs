import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Editor} from '@tiptap/core';
import {researchExtensions} from '../components/rich-editor/editor-config.ts';
import {parseRichDocument} from '../lib/rich-content.ts';
import {renderMarkdown} from '../lib/markdown.ts';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test'});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','DOMParser','getComputedStyle'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key]});
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
function editor(content){return new Editor({element:document.createElement('div'),extensions:researchExtensions(),content})}
test('real editor commands survive JSON refresh and safe validation',()=>{
 const e=editor('<p>Investment thesis</p>');
 e.commands.selectAll();e.commands.toggleBold();e.commands.toggleItalic();e.commands.toggleUnderline();
 assert.ok(e.getJSON().content[0].content[0].marks.some(m=>m.type==='underline'));
 e.commands.setTextSelection(e.state.doc.content.size-1);
 e.commands.insertContent([{type:'heading',attrs:{level:2},content:[{type:'text',text:'Valuation'}]},{type:'equation',attrs:{latex:'V=\\frac{FCF}{r-g}'}},{type:'footnote',attrs:{text:'Annual report'}},{type:'callout',attrs:{kind:'risk',title:'Risk'},content:[{type:'paragraph',content:[{type:'text',text:'Margin pressure'}]}]},{type:'tableOfContents'},{type:'financeImage',attrs:{src:'/api/media/11111111-1111-4111-8111-111111111111',alt:'DCF chart',caption:'Forecast'}}]);
 e.commands.insertTable({rows:3,cols:4,withHeaderRow:true});e.commands.addRowAfter();e.commands.addColumnAfter();
 const json=e.getJSON();assert.ok(parseRichDocument(json));
 const fresh=editor(JSON.parse(JSON.stringify(json)));assert.deepEqual(fresh.getJSON(),json);
 fresh.commands.insertContent(' extra');assert.notDeepEqual(fresh.getJSON(),json);assert.equal(fresh.commands.undo(),true);assert.deepEqual(fresh.getJSON(),json);assert.equal(fresh.commands.redo(),true);
 e.destroy();fresh.destroy();
});
test('legacy Markdown import preserves formatted text and persisted images',()=>{
 const e=editor(renderMarkdown('## Valuation\n\n**Strong** cash flows.\n\n![Chart](/api/media/11111111-1111-4111-8111-111111111111)').html);
 const json=e.getJSON();assert.ok(json.content.some(n=>n.type==='financeImage'&&n.attrs.alt==='Chart'));assert.match(JSON.stringify(json),/bold/);assert.ok(parseRichDocument(json));e.destroy();
});
test('equations and footnotes preserve their data through HTML copy and paste',()=>{
 const e=editor({type:'doc',content:[{type:'equation',attrs:{latex:'E=mc^2'}},{type:'paragraph',content:[{type:'text',text:'Source'},{type:'footnote',attrs:{text:'Company annual report'}}]}]});
 const copy=editor(e.getHTML());assert.deepEqual(copy.getJSON(),e.getJSON());e.destroy();copy.destroy();
});
