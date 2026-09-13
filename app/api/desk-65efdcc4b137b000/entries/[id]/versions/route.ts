import {authorize} from '@/lib/server/auth';
import {checkpointEntry,listEntryVersions} from '@/lib/server/data';
import {apiError,json,requestJson} from '@/lib/server/http';
import {z} from 'zod';

type Context={params:Promise<{id:string}>};

export async function GET(request:Request,context:Context){
 try{
  const denied=await authorize(request);if(denied)return denied;
  const id=z.string().uuid().parse((await context.params).id);
  return json(await listEntryVersions(id));
 }catch(error){return apiError(error)}
}

export async function POST(request:Request,context:Context){
 try{
  const denied=await authorize(request,true);if(denied)return denied;
  const id=z.string().uuid().parse((await context.params).id);
  const {revision}=z.object({revision:z.number().int().positive()}).parse(await requestJson(request));
  await checkpointEntry(id,revision);
  return json({ok:true});
 }catch(error){return apiError(error)}
}
