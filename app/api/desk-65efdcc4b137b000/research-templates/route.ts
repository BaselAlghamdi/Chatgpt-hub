import {authorize} from '@/lib/server/auth';
import {researchTemplates} from '@/lib/content';
import {apiError,json} from '@/lib/server/http';

export async function GET(request:Request){try{const denied=await authorize(request);if(denied)return denied;return json(researchTemplates)}catch(error){return apiError(error)}}
