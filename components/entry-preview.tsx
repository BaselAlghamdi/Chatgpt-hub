'use client';
import {useMemo} from 'react';
import {renderMarkdown} from '@/lib/markdown';
export default function EntryPreview({title,excerpt,body}:{title:string;excerpt:string;body:string}) {
 const preview=useMemo(()=>renderMarkdown(body),[body]);
 return <div className="article-body editor-preview"><h2>{title||'Untitled'}</h2><p>{excerpt}</p>{preview.toc.length>0&&<nav className="preview-toc" aria-label="Preview article contents"><strong>In this article</strong>{preview.toc.map(t=><a key={t.id} href={'#'+t.id}>{t.label}</a>)}</nav>}<div dir="auto" dangerouslySetInnerHTML={{__html:preview.html}}/></div>;
}
