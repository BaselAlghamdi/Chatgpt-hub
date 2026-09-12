import {z} from 'zod';
import {sameOrigin} from '@/lib/server/auth';
import {config} from '@/lib/server/supabase';
import {apiError,boundedBody,json} from '@/lib/server/http';
const message='If this email belongs to the administrator, a reset link will be sent. Check your inbox and spam folder. If it does not arrive, wait a minute before trying again.';
export async function POST(request:Request){
 try{
  if(!sameOrigin(request,process.env.SITE_URL))return json({error:'Invalid request origin.'},403);
  const {email}=z.object({email:z.string().trim().email().max(254)}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,4096))));
  const owner=process.env.ADMIN_EMAIL?.trim().toLowerCase(),key=process.env.SUPABASE_ANON_KEY;
  const site=process.env.SITE_URL?new URL(process.env.SITE_URL):null;
  if(!owner||!key||!site||site.protocol!=='https:'||site.username||site.password)return json({error:'Password recovery is not configured.'},503);
  const {url}=config();
  if(email.toLowerCase()===owner){
   // The normal Auth endpoint enforces Supabase email and recovery rate limits.
   // The destination is server configured, never taken from request input.
   const endpoint=new URL(url+'/auth/v1/recover');
   endpoint.searchParams.set('redirect_to',new URL('/desk-65efdcc4b137b000/reset-password',site.origin).href);
   try{
    const response=await fetch(endpoint.href,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:owner}),cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)console.warn('Password recovery provider declined request',response.status);
   }catch{console.warn('Password recovery provider unavailable')}
  }
  // Do not expose account existence or provider errors in the public response.
  return json({ok:true,message});
 }catch(error){return apiError(error)}
}
