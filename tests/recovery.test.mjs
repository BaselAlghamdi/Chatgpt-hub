import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as recover} from '../app/api/desk-65efdcc4b137b000/recover/route.ts';
import {POST as reset} from '../app/api/desk-65efdcc4b137b000/reset-password/route.ts';
import {PUT as profile} from '../app/api/desk-65efdcc4b137b000/profile/route.ts';
import {GET as backup} from '../app/api/desk-65efdcc4b137b000/export/route.ts';
import {jar} from './mock-headers.mjs';
const origin='https://portfolio.example.test';
const owner={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.test',email_confirmed_at:'2026-01-01'};
const token='test-token-'.repeat(20),password='test-only-password';
const originalFetch=globalThis.fetch;
Object.assign(process.env,{SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-anon',ADMIN_EMAIL:owner.email,ADMIN_USER_ID:owner.id,SITE_URL:origin});
function req(body,source=origin){return new Request(origin+'/api/desk-65efdcc4b137b000/recover',{method:'POST',headers:{origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)})}
test.after(()=>{globalThis.fetch=originalFetch});
test('recovery rejects hostile origin and invalid/oversized input before provider access',async()=>{
 globalThis.fetch=()=>{throw new Error('Provider must not be called')};
 assert.equal((await recover(req({email:owner.email},'https://evil.test'))).status,403);
 assert.equal((await recover(req({email:'invalid'}))).status,400);
 assert.equal((await recover(req({email:owner.email,redirect_to:'https://evil.test'}))).status,400);
 assert.equal((await recover(req({email:'x'.repeat(5000)}))).status,413);
});
test('recovery sends only to configured owner using fixed HTTPS reset destination',async()=>{
 let calls=0;globalThis.fetch=async(url,init)=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://backend.example.test');assert.equal(u.pathname,'/auth/v1/recover');assert.equal(u.searchParams.get('redirect_to'),origin+'/desk-65efdcc4b137b000/reset-password');assert.deepEqual(JSON.parse(init.body),{email:owner.email});assert.equal(init.headers.apikey,'test-anon');assert.equal(init.method,'POST');assert.equal(init.cache,'no-store');return Response.json({})};
 const good=await recover(req({email:' OWNER@example.test '}));assert.equal(good.status,200);
 const other=await recover(req({email:'someone@example.test'}));assert.equal(other.status,200);assert.deepEqual(await good.json(),await other.json());assert.equal(calls,1);
});
test('provider throttling and failure do not disclose account or provider details',async()=>{
 globalThis.fetch=async()=>Response.json({secret:'provider details'},{status:429});
 const limited=await (await recover(req({email:owner.email}))).json();
 globalThis.fetch=async()=>{throw new Error('network details')};
 assert.deepEqual(await (await recover(req({email:owner.email}))).json(),limited);
 assert.deepEqual(await (await recover(req({email:'someone@example.test'}))).json(),limited);
});
test('recovery fails closed when production redirect is missing or insecure',async()=>{
 const saved=process.env.SITE_URL;
 try{process.env.SITE_URL='http://localhost:3000';assert.equal((await recover(req({email:owner.email}))).status,503);delete process.env.SITE_URL;assert.equal((await recover(req({email:owner.email}))).status,503)}finally{process.env.SITE_URL=saved}
});
test('password reset rejects hostile origins and weak passwords before provider access',async()=>{
 globalThis.fetch=()=>{throw new Error('Provider must not be called')};
 assert.equal((await reset(req({token,password},'https://evil.test'))).status,403);
 assert.equal((await reset(req({token,password:'short'}))).status,400);
 assert.equal((await reset(req({token:'short',password}))).status,400);
});
test('password reset denies expired tokens and authenticated non-owner accounts',async()=>{
 for(const user of [null,{...owner,id:'other'}, {...owner,email_confirmed_at:null}]){
  let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(user,{status:user?200:401})};
  assert.equal((await reset(req({token,password}))).status,401);assert.equal(calls,1);
 }
});
test('password reset uses verified owner token and handles rejected password update',async()=>{
 let reject=false;globalThis.fetch=async(url,init)=>{assert.equal(url,'https://backend.example.test/auth/v1/user');assert.equal(init.headers.Authorization,'Bearer '+token);if(init.method==='PUT'){assert.deepEqual(JSON.parse(init.body),{password});return Response.json({}, {status:reject?400:200})}return Response.json(owner)};
 const response=await reset(req({token,password}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});reject=true;assert.equal((await reset(req({token,password}))).status,400);
});
test('reset provider outage returns a recoverable error without updating a password',async()=>{
 globalThis.fetch=async()=>{throw new Error('test upstream unavailable')};
 assert.equal((await reset(req({token,password}))).status,503);
});
test('profile updates and content export require an administrator session',async()=>{
 jar.clear();globalThis.fetch=()=>{throw new Error('Anonymous request must not access provider')};
 assert.equal((await profile(req({}))).status,401);
 assert.equal((await backup(new Request(origin+'/api/desk-65efdcc4b137b000/export'))).status,401);
});
