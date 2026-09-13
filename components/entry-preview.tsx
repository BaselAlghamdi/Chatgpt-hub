'use client';
import {useMemo} from 'react';
import {renderMarkdown} from '@/lib/markdown';
import {RichContent,RichTableOfContents} from '@/components/rich-content';
import {parseRichDocument,richOutline} from '@/lib/rich-content';
export default function EntryPreview({title,excerpt,body,contentFormat='markdown',richContent=null}:{title:string;excerpt:string;body:string;contentFormat?:'markdown'|'rich';richContent?:unknown}) {
 const legacy=useMemo(()=>renderMarkdown(body),[body]);const rich=useMemo(()=>contentFormat==='rich'?parseRichDocument(richContent):null,[contentFormat,richContent]);const toc=rich?richOutline(rich).toc:legacy.toc;
 return <div className="article-body editor-preview"><h2>{title||'Untitled'}</h2><p>{excerpt}</p>{toc.length>0&&(rich?<RichTableOfContents items={toc} label="Preview article contents"/>:<nav className="preview-toc" aria-label="Preview article contents"><strong>In this article</strong>{toc.map(t=><a key={t.id} href={'#'+encodeURIComponent(t.id)}>{t.label}</a>)}</nav>)}<div dir="auto">{rich?<RichContent document={rich}/>:<div dangerouslySetInnerHTML={{__html:legacy.html}}/>}</div></div>;
}
