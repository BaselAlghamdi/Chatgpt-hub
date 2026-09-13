import {authorize} from '@/lib/server/auth';
import {getEntryVersion} from '@/lib/server/data';
import {apiError,json} from '@/lib/server/http';
import {z} from 'zod';

type Context={params:Promise<{id:string;revision:string}>};

export async function GET(request:Request,context:Context){
 try{
  const denied=await authorize(request);if(denied)return denied;
  const params=await context.params;
  const id=z.string().uuid().parse(params.id);
  const revision=z.coerce.number().int().positive().parse(params.revision);
  const version=await getEntryVersion(id,revision);
  return version?json(version):json({error:'Version not found.'},404);
 }catch(error){return apiError(error)}
}
