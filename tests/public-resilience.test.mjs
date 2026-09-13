import test from 'node:test';
import assert from 'node:assert/strict';
import {emailComposeUrl} from '../lib/content.ts';
import {config} from '../lib/server/supabase.ts';
import {publicEntries} from '../lib/server/public-content.ts';
test('email opens the default mail handler',()=>assert.equal(emailComposeUrl(' baselmsalghamdi@gmail.com '),'mailto:baselmsalghamdi@gmail.com'));
test('configuration accepts pasted REST endpoint and trims whitespace',()=>{process.env.SUPABASE_URL=' https://example.supabase.co/rest/v1/ ';process.env.SUPABASE_SERVICE_ROLE_KEY=' fixture ';assert.deepEqual(config(),{url:'https://example.supabase.co',key:'fixture'})});
test('unavailable public content is explicitly distinguished from an empty portfolio',async()=>{const original=fetch;const log=console.error;try{globalThis.fetch=async()=>Response.json({code:'PGRST205',message:'Missing table'},{status:404});console.error=()=>{};assert.deepEqual(await publicEntries('article'),{entries:[],unavailable:true});globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await publicEntries('article'),{entries:[],unavailable:false})}finally{globalThis.fetch=original;console.error=log}});
