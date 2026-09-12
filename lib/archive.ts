import {readTime,type Entry} from './content';

// Archive cards need summaries and reading time, never full article Markdown.
export function toArchiveEntry(entry:Entry):Entry {
  return {...entry,body:'',attachments:[],readingMinutes:entry.readingMinutes??(entry.body?readTime(entry.body):undefined)};
}
