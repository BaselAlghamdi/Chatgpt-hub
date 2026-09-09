import {Marked} from 'marked';
function escape(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
export function safeLink(value:string,image=false){if(/^\/api\/media\/[a-f0-9-]{36}$/.test(value))return value;if(!image&&/^#[a-zA-Z0-9_-]+$/.test(value))return value;try{const u=new URL(value);if((u.protocol==='https:'||(!image&&u.protocol==='http:'))&&!u.username&&!u.password)return u.href;if(!image&&u.protocol==='mailto:'&&!/[\r\n]/.test(value))return u.href}catch{}return ''}
export function renderMarkdown(markdown:string){const toc:{id:string;label:string}[]=[];const ids=new Set<string>();const parser=new Marked({gfm:true,breaks:false});
 parser.use({renderer:{
 html({text}){return escape(text)},
 heading({tokens,depth}){depth=Math.max(2,depth);const content=this.parser.parseInline(tokens);const label=content.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');let id=label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';const base=id;let n=1;while(ids.has(id))id=base+'-'+n++;ids.add(id);if(depth===2||depth===3)toc.push({id,label});return '<h'+depth+' id="'+escape(id)+'">'+content+'</h'+depth+'>\n'},
 link({href,tokens}){const url=safeLink(href);const label=this.parser.parseInline(tokens);return url?'<a href="'+escape(url)+'"'+(url.startsWith('http')?' target="_blank" rel="noopener noreferrer"':'')+'>'+label+'</a>':label},
 image({href,text,title}){const url=safeLink(href,true);if(!url)return '<span>'+escape(text)+'</span>';return '<span class="markdown-image"><img src="'+escape(url)+'" alt="'+escape(text)+'" loading="lazy" decoding="async"/>'+(title?'<span class="markdown-caption">'+escape(title)+'</span>':'')+'</span>'}
 }});
 let html=parser.parse(markdown,{async:false}) as string;html=html.replace(/<table>/g,'<div class="table-scroll" tabindex="0" role="region" aria-label="Data table"><table>').replace(/<\/table>/g,'</table></div>');return{html,toc}
}
