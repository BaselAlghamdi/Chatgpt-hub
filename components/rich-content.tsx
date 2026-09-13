import React,{type CSSProperties,type ReactNode} from 'react';
import katex from 'katex';
import {plainText,richOutline,safeEmbed,safeRichUrl,type RichDocument,type RichMark,type RichNode,type TocItem} from '@/lib/rich-content';

type Props={document:RichDocument;className?:string};
type Context={headingIds:WeakMap<RichNode,string>;toc:TocItem[];footnoteOrder:string[];footnotes:Map<string,RichNode>;footnoteIds:WeakMap<RichNode,string>;footnoteRefCounts:Map<string,number>;referenceIds:WeakMap<RichNode,{id:string;occurrence:number}>};

const number=(value:unknown,fallback:number,min=1,max=12)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback};
const textAlign=(value:unknown):CSSProperties['textAlign']=>value==='center'||value==='right'||value==='justify'?value:'left';
const string=(value:unknown,max=500)=>typeof value==='string'?value.slice(0,max):'';

function Marks({marks=[],children}:{marks?:RichMark[];children:ReactNode}){
 return marks.reduceRight<ReactNode>((content,mark)=>{
  switch(mark.type){
   case'bold':return <strong>{content}</strong>;case'italic':return <em>{content}</em>;case'underline':return <u>{content}</u>;case'strike':return <s>{content}</s>;case'superscript':return <sup>{content}</sup>;case'subscript':return <sub>{content}</sub>;
   case'highlight':return <mark>{content}</mark>;case'code':return <code>{content}</code>;
   case'link':{const href=safeRichUrl(mark.attrs?.href);return href?<a href={href} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined}>{content}</a>:content}
   default:return content;
  }
 },children);
}

function Children({nodes,ctx}:{nodes?:RichNode[];ctx:Context}){return <>{(nodes??[]).map((node,index)=><NodeView key={index} node={node} ctx={ctx}/>)}</>}

function ImageView({node}:{node:RichNode}){
 const src=safeRichUrl(node.attrs?.src,'image');if(!src)return null;const alt=string(node.attrs?.alt,500);const caption=string(node.attrs?.caption??node.attrs?.title,1000);const href=safeRichUrl(node.attrs?.href);const display=['wide','full'].includes(String(node.attrs?.display))?String(node.attrs?.display):'content';
 const percentage=node.type==='financeImage'?number(node.attrs?.width,100,25,100):undefined;const width=node.type==='financeImage'?undefined:number(node.attrs?.width,0,1,4000)||undefined;const height=node.type==='financeImage'?undefined:number(node.attrs?.height,0,1,4000)||undefined;
 const alignment=textAlign(node.attrs?.alignment??node.attrs?.textAlign);
 const image=<img src={src} alt={alt} width={number(node.attrs?.pixelWidth,width??0,1,12000)||undefined} height={number(node.attrs?.pixelHeight,height??0,1,12000)||undefined} style={{...(percentage?{width:percentage+'%'}:{}),marginInlineStart:alignment==='left'?0:'auto',marginInlineEnd:alignment==='right'?0:'auto'}} loading="lazy" decoding="async"/>;
 return <figure className={'rich-image rich-image-'+display}>{href?<a href={href} target="_blank" rel="noopener noreferrer">{image}</a>:image}{caption&&<figcaption>{caption}</figcaption>}</figure>;
}

function Toc({items,label='In this article'}:{items:TocItem[];label?:string}){return <nav className="rich-inline-toc" aria-label={label}><strong>{label}</strong>{items.map(item=><a key={item.id} href={'#'+encodeURIComponent(item.id)} className={item.level===3?'toc-level-3':undefined}>{item.label}</a>)}</nav>}

function Equation({latex,display}:{latex:string;display:boolean}){if(!latex)return null;const html=katex.renderToString(latex,{displayMode:display,throwOnError:false,strict:'ignore',trust:false,maxExpand:1000,maxSize:20,output:'htmlAndMathml'});const Tag=display?'div':'span';return <Tag tabIndex={display?0:undefined} className={display?'rich-equation':'rich-equation-inline'} dangerouslySetInnerHTML={{__html:html}}/>}
function FootnoteReference({node,ctx}:{node:RichNode;ctx:Context}){const reference=ctx.referenceIds.get(node);if(!reference)return null;const {id,occurrence}=reference;const index=ctx.footnoteOrder.indexOf(id);return <sup className="footnote-reference"><a id={'fnref-'+id+'-'+occurrence} href={'#fn-'+id} aria-label={'Footnote '+(index+1)}>{index+1}</a></sup>}

function NodeView({node,ctx}:{node:RichNode;ctx:Context}):ReactNode{
 const style:CSSProperties={textAlign:textAlign(node.attrs?.textAlign)};
 switch(node.type){
  case'text':return <Marks marks={node.marks}>{node.text??''}</Marks>;
  case'paragraph':return <p style={style}><Children nodes={node.content} ctx={ctx}/></p>;
  case'heading':{const level=number(node.attrs?.level,2,2,6);const id=ctx.headingIds.get(node);return React.createElement('h'+level,{id,style},<Children nodes={node.content} ctx={ctx}/>)}
  case'bulletList':return <ul><Children nodes={node.content} ctx={ctx}/></ul>;
  case'orderedList':return <ol start={number(node.attrs?.start,1,1,9999)}><Children nodes={node.content} ctx={ctx}/></ol>;
  case'listItem':return <li><Children nodes={node.content} ctx={ctx}/></li>;
  case'blockquote':return <blockquote><Children nodes={node.content} ctx={ctx}/></blockquote>;
  case'horizontalRule':return <hr/>;case'hardBreak':return <br/>;
  case'codeBlock':return <pre tabIndex={0}><code data-language={string(node.attrs?.language,40)||undefined}>{plainText(node)}</code></pre>;
  case'table':return <div className="table-scroll" tabIndex={0} role="region" aria-label="Financial data table"><table><tbody><Children nodes={node.content} ctx={ctx}/></tbody></table></div>;
  case'tableRow':return <tr><Children nodes={node.content} ctx={ctx}/></tr>;
  case'tableHeader':case'tableCell':{const Tag=node.type==='tableHeader'?'th':'td';return <Tag colSpan={number(node.attrs?.colspan,1,1,20)} rowSpan={number(node.attrs?.rowspan,1,1,100)} style={style} scope={Tag==='th'?'col':undefined}><Children nodes={node.content} ctx={ctx}/></Tag>}
  case'image':case'financeImage':return <ImageView node={node}/>;
  case'gallery':{const images=(Array.isArray(node.attrs?.images)?node.attrs.images:[]).filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object').slice(0,20);const nodes=images.map(attrs=>({type:'image',attrs}));return <div className={'rich-gallery rich-gallery-'+Math.min(3,Math.max(1,number(node.attrs?.columns,2,1,3)))}><Children nodes={nodes.length?nodes:node.content} ctx={ctx}/></div>}
  case'callout':{const requested=String(node.attrs?.kind??node.attrs?.type);const type=['thesis','takeaway','important','catalyst','risk','valuation','note','warning'].includes(requested)?requested:'note';const label=string(node.attrs?.title??node.attrs?.label,80)||type[0].toUpperCase()+type.slice(1);return <aside className={'research-callout callout-'+type} aria-label={label}><strong>{label}</strong><div><Children nodes={node.content} ctx={ctx}/></div></aside>}
  case'equation':{const latex=string(node.attrs?.latex??node.attrs?.value??plainText(node),4000);return <Equation latex={latex} display={node.attrs?.display!==false}/>}case'mathBlock':return <Equation latex={string(node.attrs?.latex??node.attrs?.value??plainText(node),4000)} display/>;
  case'inlineEquation':case'mathInline':return <Equation latex={string(node.attrs?.latex??node.attrs?.value??plainText(node),1000)} display={false}/>;
  case'footnoteReference':case'footnoteRef':case'footnote':return <FootnoteReference node={node} ctx={ctx}/>;
  case'tableOfContents':case'toc':return <Toc items={ctx.toc}/>;
  case'embed':case'videoEmbed':case'safeEmbed':{const embed=safeEmbed(node.attrs?.url??node.attrs?.src);if(!embed){const url=safeRichUrl(node.attrs?.url??node.attrs?.src);return url?<p className="embed-fallback"><a href={url} target="_blank" rel="noopener noreferrer">Open embedded source</a></p>:null}return <div className={'rich-embed embed-'+embed.kind}><iframe src={embed.src} title={string(node.attrs?.title,200)||embed.kind+' content'} loading="lazy" allow={embed.kind==='youtube'?'accelerometer; autoplay; encrypted-media; picture-in-picture':embed.kind==='spotify'?'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture':undefined} allowFullScreen={embed.kind==='youtube'} referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"/></div>}
  case'video':{const src=safeRichUrl(node.attrs?.src,'media');if(!src)return null;return <figure className="rich-media"><video controls preload="metadata" poster={safeRichUrl(node.attrs?.poster,'image')||undefined}><source src={src}/></video>{string(node.attrs?.caption,1000)&&<figcaption>{string(node.attrs?.caption,1000)}</figcaption>}</figure>}
  case'audio':{const src=safeRichUrl(node.attrs?.src,'media');if(!src)return null;return <figure className="rich-media rich-audio">{string(node.attrs?.title,200)&&<strong>{string(node.attrs?.title,200)}</strong>}<audio controls preload="metadata" src={src}/>{string(node.attrs?.caption??node.attrs?.description,1000)&&<figcaption>{string(node.attrs?.caption??node.attrs?.description,1000)}</figcaption>}</figure>}
  case'doc':return <Children nodes={node.content} ctx={ctx}/>;
  default:return node.content?<Children nodes={node.content} ctx={ctx}/>:null;
 }
}

function collectFootnotes(document:RichDocument){
 const footnotes=new Map<string,RichNode>();const footnoteIds=new WeakMap<RichNode,string>();const footnoteOrder:string[]=[];const footnoteRefCounts=new Map<string,number>();const referenceIds=new WeakMap<RichNode,{id:string;occurrence:number}>();const named=new Map<string,string>();
 const visit=(node:RichNode)=>{if(['footnote','footnoteReference','footnoteRef'].includes(node.type??'')){
  const requested=string(node.attrs?.id??node.attrs?.footnoteId,100);let id=requested?named.get(requested):undefined;if(!id){id='note-'+(footnoteOrder.length+1);footnoteOrder.push(id);if(requested)named.set(requested,id)}
  const occurrence=(footnoteRefCounts.get(id)??0)+1;footnoteRefCounts.set(id,occurrence);referenceIds.set(node,{id,occurrence});footnoteIds.set(node,id);if(node.type==='footnote')footnotes.set(id,node);return;
 }for(const child of node.content??[])visit(child)};visit(document);return{footnotes,footnoteIds,footnoteOrder,footnoteRefCounts,referenceIds};
}

export function RichContent({document,className=''}:Props){
 const {toc,headingIds}=richOutline(document);const collected=collectFootnotes(document);const ctx:Context={toc,headingIds,...collected};
 const body=<NodeView node={document} ctx={ctx}/>;
 return <div className={'rich-content '+className}>{body}{ctx.footnoteOrder.length>0&&<section className="footnotes" aria-label="Footnotes"><h2>Footnotes</h2><ol>{ctx.footnoteOrder.map((id,index)=>{const note=ctx.footnotes.get(id);const text=string(note?.attrs?.text,4000);const hasContent=!!note?.content?.length;return <li id={'fn-'+id} key={id}>{text||hasContent?<>{text||<Children nodes={note?.content} ctx={ctx}/>}</>:<span>Reference unavailable.</span>} <a className="footnote-back" href={'#fnref-'+encodeURIComponent(id)+'-1'} aria-label={'Back to reference '+(index+1)}>↩</a></li>})}</ol></section>}</div>;
}

export {Toc as RichTableOfContents};
