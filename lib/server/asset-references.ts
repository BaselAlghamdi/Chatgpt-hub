import 'server-only';
import type {EntryInput} from '../content';
import {renderMarkdown} from '../markdown';
import {parseRichDocument,richAssetIds} from '../rich-content';

// Public access follows actual rendered destinations, not text that happens to
// mention an asset (code samples, escaped HTML, unused definitions, external URLs).
export function assetReferences(input:EntryInput):string[]{
 const ids=new Set<string>();
 for(const url of [input.coverUrl,input.credentialUrl,input.seo?.socialImageUrl??'',...input.attachments.map(item=>item.url)]){
  const match=/^\/api\/media\/([a-f0-9-]{36})$/.exec(url);
  if(match)ids.add(match[1]);
 }
 if(input.contentFormat==='rich')for(const id of richAssetIds(parseRichDocument(input.richContent)))ids.add(id);
 else for(const id of renderMarkdown(input.body).assetIds)ids.add(id);
 return [...ids];
}
