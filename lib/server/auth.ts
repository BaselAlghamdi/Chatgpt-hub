import 'server-only';
import {cookies} from 'next/headers';
import {config,configured} from './supabase';
export const SESSION_COOKIE='portfolio_session';
export function isOwner(user:{id?:string;email?:string;email_confirmed_at?:string}|null){const id=process.env.ADMIN_USER_ID;const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();return !!(id&&email&&user?.id===id&&user.email?.toLowerCase()===email&&user.email_confirmed_at)}
export function authConfigured(){return configured()&&!!process.env.ADMIN_USER_ID&&!!process.env.ADMIN_EMAIL&&!!process.env.SUPABASE_ANON_KEY}
export async function adminSession(){if(!authConfigured())return null;const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token||token.length>16000)return null;const{url}=config();try{const r=await fetch(url+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON_KEY!,Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return null;const u=await r.json();return isOwner(u)?{email:u.email,id:u.id}:null}catch{return null}}
export function sameOrigin(request:Request,configuredOrigin?:string){const origin=request.headers.get('origin');if(!origin)return false;try{return origin===new URL(request.url).origin||(!!configuredOrigin&&origin===new URL(configuredOrigin).origin)}catch{return false}}
export async function authorize(request:Request,write=false){if(!await adminSession())return Response.json({error:'Your administrator session has expired. Sign in again. Your unsaved changes remain in this window.'},{status:401,headers:{'Cache-Control':'no-store'}});if(write&&!sameOrigin(request,process.env.SITE_URL))return Response.json({error:'This request must come from your site.'},{status:403,headers:{'Cache-Control':'no-store'}});return null}
export function cookieOptions(maxAge:number){return{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge}}
