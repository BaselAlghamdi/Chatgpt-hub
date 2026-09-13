export type RichMark={type:string;attrs?:Record<string,unknown>};
export type RichNode={type?:string;attrs?:Record<string,unknown>;content?:RichNode[];marks?:RichMark[];text?:string};
export type RichDocument={type:'doc';content?:RichNode[]};
export type TocItem={id:string;label:string;level?:number};

const localAsset=/^\/api\/media\/([a-f0-9-]{36})$/;
const safeId=/^[\p{L}\p{N}\p{M}_-]{1,160}$/u;

export function safeRichUrl(value:unknown,kind:'link'|'image'|'media'='link'){
 if(typeof value!=='string'||value.length>4000)return '';
 if(localAsset.test(value))return value;
 if(kind==='link'&&value.startsWith('#')){try{const id=decodeURIComponent(value.slice(1));return safeId.test(id)?'#'+encodeURIComponent(id):''}catch{return ''}}
 try{const url=new URL(value);if(url.username||url.password)return '';if(url.protocol==='https:'||(kind==='link'&&url.protocol==='mailto:'))return url.href}catch{}
 return '';
}

export function plainText(node:RichNode):string{
 if(typeof node.text==='string')return node.text;
 const children=(node.content??[]).map(plainText);
 return children.join(['doc','bulletList','orderedList','listItem','table','tableRow','tableCell','tableHeader','callout','blockquote'].includes(node.type??'')?'\n':'');
}

function slug(value:string){return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]+/gu,'-').replace(/^-|-$/g,'').slice(0,120)||'section'}

export function richOutline(document:RichDocument|null|undefined){
 const toc:TocItem[]=[];const headingIds=new WeakMap<RichNode,string>();const used=new Set<string>();
 const visit=(node:RichNode)=>{if(node.type==='heading'){
   const level=Math.min(6,Math.max(2,Number(node.attrs?.level)||2));const label=plainText(node);
   let id=typeof node.attrs?.id==='string'&&safeId.test(node.attrs.id)?node.attrs.id:slug(label);const base=id;let n=2;while(used.has(id))id=base+'-'+n++;used.add(id);headingIds.set(node,id);
   if(label&&(level===2||level===3))toc.push({id,label,level});
  }for(const child of node.content??[])visit(child)};
 if(document?.type==='doc')visit(document);
 return{toc,headingIds};
}

const nodeTypes=new Set(['doc','text','paragraph','heading','bulletList','orderedList','listItem','blockquote','horizontalRule','hardBreak','codeBlock','table','tableRow','tableHeader','tableCell','image','financeImage','gallery','callout','equation','mathBlock','inlineEquation','mathInline','footnote','footnoteReference','footnoteRef','tableOfContents','toc','embed','videoEmbed','safeEmbed','video','audio']);
const markTypes=new Set(['bold','italic','underline','strike','superscript','subscript','highlight','link','code']);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function parseRichDocument(value:unknown):RichDocument|null{
 try{
  if(typeof value==='string'){if(value.length>800000)return null;value=JSON.parse(value)}
  if(!record(value)||value.type!=='doc'||JSON.stringify(value).length>800000)return null;
  let count=0,textSize=0;
  const visit=(node:unknown,depth:number):boolean=>{
   if(!record(node)||depth>40||++count>5000||typeof node.type!=='string'||!nodeTypes.has(node.type))return false;
   if(node.attrs!==undefined&&!record(node.attrs))return false;
   if(node.text!==undefined&&typeof node.text!=='string')return false;
   textSize+=typeof node.text==='string'?node.text.length:0;if(textSize>160000)return false;
   if(node.content!==undefined&&(!Array.isArray(node.content)||node.content.length>1000||!node.content.every(child=>visit(child,depth+1))))return false;
   if(node.marks!==undefined&&(!Array.isArray(node.marks)||node.marks.length>20||!node.marks.every(mark=>record(mark)&&typeof mark.type==='string'&&markTypes.has(mark.type)&&(mark.attrs===undefined||record(mark.attrs))&&!(mark.type==='link'&&mark.attrs?.href&&!safeRichUrl(mark.attrs.href)))))return false;
   const attrs=record(node.attrs)?node.attrs:{};
   for(const key of ['src','href','url','poster'])if(attrs[key]!==undefined&&(typeof attrs[key]!=='string'||(attrs[key]&&!safeRichUrl(attrs[key],key==='href'||key==='url'?'link':'media'))))return false;
   if(node.type==='gallery'&&attrs.images!==undefined&&(!Array.isArray(attrs.images)||attrs.images.length>20||!attrs.images.every(image=>record(image)&&typeof image.src==='string'&&!!safeRichUrl(image.src,'image')&&['alt','caption'].every(key=>image[key]===undefined||typeof image[key]==='string'))))return false;
   return true;
  };
  return visit(value,0)?value as RichDocument:null;
 }catch{return null}
}

export function richWordCount(document:RichDocument|null|undefined){const text=document?plainText(document).trim():'';return text?text.split(/\s+/u).filter(Boolean).length:0}

export function richAssetIds(document:RichDocument|null|undefined){
 const ids=new Set<string>();const add=(value:unknown)=>{if(typeof value==='string'){const match=localAsset.exec(value);if(match)ids.add(match[1])}};
 const visit=(node:RichNode)=>{
  if(['image','financeImage','audio','video'].includes(node.type??'')){add(node.attrs?.src);if(node.type==='video')add(node.attrs?.poster);if(['image','financeImage'].includes(node.type??''))add(node.attrs?.href)}
  if(['embed','videoEmbed','safeEmbed'].includes(node.type??''))add(node.attrs?.url??node.attrs?.src);
  if(node.type==='text')for(const mark of node.marks??[])if(mark.type==='link')add(mark.attrs?.href);
  if(node.type==='gallery')for(const image of Array.isArray(node.attrs?.images)?node.attrs.images:[]){if(record(image)){add(image.src);add(image.href)}}
  if(!['codeBlock','footnote'].includes(node.type??''))for(const child of node.content??[])visit(child);
 };
 if(document)visit(document);return [...ids];
}

export function safeEmbed(value:unknown):{kind:'youtube'|'spotify'|'datawrapper';src:string}|null{
 if(typeof value!=='string')return null;try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;const host=u.hostname.toLowerCase();
  if(host==='youtu.be'||host==='www.youtube.com'||host==='youtube.com'||host==='www.youtube-nocookie.com'){
   const id=host==='youtu.be'?u.pathname.slice(1).split('/')[0]:u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v');
   return id&&/^[\w-]{6,20}$/.test(id)?{kind:'youtube',src:'https://www.youtube-nocookie.com/embed/'+id}:null;
  }
  if(host==='open.spotify.com'&&/^\/(?:embed\/)?(track|episode|show|album|playlist)\/[A-Za-z0-9]+\/?$/.test(u.pathname))return{kind:'spotify',src:'https://open.spotify.com/embed/'+u.pathname.replace(/^\/(?:embed\/)?/,'')};
  if((host==='datawrapper.dwcdn.net'||host==='www.datawrapper.de')&&/^\/[^/]+\/?(?:\d+\/?)?$/.test(u.pathname))return{kind:'datawrapper',src:'https://datawrapper.dwcdn.net/'+u.pathname.split('/').filter(Boolean)[0]+'/'};
 }catch{}return null;
}
