import {authorize} from '@/lib/server/auth';
import {getProfile} from '@/lib/server/data';
import {exportPage} from '@/lib/server/backup-export';
import {apiError} from '@/lib/server/http';
export async function GET(r:Request){try{
 const denied=await authorize(r);if(denied)return denied;
 const params=new URL(r.url).searchParams,collection=params.get('collection');
 const value=collection?await exportPage(collection,params.get('after')):{version:2,exportedAt:new Date().toISOString(),profile:await getProfile(true),entries:[],assets:[]};
 return Response.json(value,{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e)}}
