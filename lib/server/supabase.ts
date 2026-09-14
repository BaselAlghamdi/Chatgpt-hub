import 'server-only';
export function configured(){return !!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
export function config(){const url=process.env.SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Content service is not configured.');if(new URL(url).protocol!=='https:')throw new Error('HTTPS is required for the content service.');return{url,key}}
export async function service(path:string,init:RequestInit={},timeoutMs=20000){const{url,key}=config();const legacyJwt=key.startsWith('eyJ');const r=await fetch(url+path,{...init,cache:'no-store',headers:{apikey:key,...(legacyJwt?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(timeoutMs)});if(!r.ok){const e=await r.json().catch(()=>({}));const err=new Error(e.message||e.error_description||'Content service unavailable') as Error&{code?:string;status?:number};err.code=e.code;err.status=r.status;throw err}return r}
// Share concurrent identical GETs only; never retain failures or cache writes.
const pendingReads=new Map<string,Promise<any>>();
async function readRest(path:string,init:RequestInit,timeoutMs:number){const r=await service('/rest/v1/'+path,init,timeoutMs);if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null}
export async function rest(path:string,init:RequestInit={},timeoutMs=20000){
 if(Object.keys(init).length)return readRest(path,init,timeoutMs);
 const {url,key}=config();const identity=url+'\n'+key+'\n'+timeoutMs+'\n'+path;
 const pending=pendingReads.get(identity);if(pending)return pending;
 const request=readRest(path,init,timeoutMs);pendingReads.set(identity,request);
 try{return await request}finally{if(pendingReads.get(identity)===request)pendingReads.delete(identity)}
}
