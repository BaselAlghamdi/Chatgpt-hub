import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDraft,isEntryDraft,isProfileDraft} from '../lib/drafts.ts';
import {newEntry,defaultProfile} from '../lib/content.ts';
const wrap=value=>JSON.stringify({version:1,updatedAt:'2026-09-10T12:00:00Z',value});
test('recovery preserves incomplete edits and their original revision',()=>{
 const value={...newEntry('article'),revision:4,body:'Unfinished research',tags:[''],attachments:[{name:'',url:'',format:''}]};
 assert.deepEqual(parseDraft(wrap(value),isEntryDraft)?.value,JSON.parse(JSON.stringify(value)));
 assert.equal(parseDraft(wrap(value),isEntryDraft).value.revision,4);
});
test('malformed, oversized, or wrong-shape copies cannot reach editor rendering',()=>{
 for(const raw of ['{',null,'x'.repeat(1_000_001),wrap({...newEntry('article'),attachments:[null]}),wrap({...newEntry('article'),tags:[{}]}),wrap({...newEntry('article'),kind:'other'}),wrap({...newEntry('article'),body:{}})])assert.equal(parseDraft(raw,isEntryDraft),null);
 assert.equal(parseDraft(JSON.stringify({version:2,value:newEntry('article')}),isEntryDraft),null);
});
test('profile copies preserve text but reject broken interests arrays',()=>{
 const value={...defaultProfile,revision:3,email:'unfinished@',bio:'Pending edit'};
 assert.deepEqual(parseDraft(wrap(value),isProfileDraft)?.value,value);
 assert.equal(parseDraft(wrap({...value,interests:[null]}),isProfileDraft),null);
});
