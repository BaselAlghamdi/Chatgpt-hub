import 'server-only';
import type {EntryInput} from '../content';
import {renderMarkdown} from '../markdown';

// Public access follows actual rendered destinations, not text that happens to
// mention an asset (code samples, escaped HTML, unused definitions, external URLs).
export function assetReferences(input:EntryInput):string[]{
 const ids=new Set<string>();
 for(const url of [input.coverUrl,input.credentialUrl,...input.attachments.map(item=>item.url)]){
  const match=/^\/api\/media\/([a-f0-9-]{36})$/.exec(url);
  if(match)ids.add(match[1]);
 }
 for(const id of renderMarkdown(input.body).assetIds)ids.add(id);
 return [...ids];
}
