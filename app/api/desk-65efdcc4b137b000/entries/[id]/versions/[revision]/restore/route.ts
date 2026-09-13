import {revalidateTag} from 'next/cache.js';
import {authorize} from '@/lib/server/auth';
import {restoreEntryVersion} from '@/lib/server/data';
import {apiError,json,requestJson} from '@/lib/server/http';
import {z} from 'zod';

type Context={params:Promise<{id:string;revision:string}>};

export async function POST(request:Request,context:Context){
 try{
  const denied=await authorize(request,true);if(denied)return denied;
  const params=await context.params;
  const id=z.string().uuid().parse(params.id);
  const targetRevision=z.coerce.number().int().positive().parse(params.revision);
  const {currentRevision}=z.object({currentRevision:z.number().int().positive()}).parse(await requestJson(request));
  const restored=await restoreEntryVersion(id,targetRevision,currentRevision);
  revalidateTag('portfolio-content',{expire:0});
  return json(restored);
 }catch(error){return apiError(error)}
}
