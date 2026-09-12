import 'server-only';
import {rest} from './supabase';
import {ContentError} from './data';

// Small keyset pages keep full Markdown below the hosting response-size limit.
export async function exportPage(collection:string,after:string|null){
 if(!['entries','assets'].includes(collection)||after!==null&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(after))throw new ContentError('Invalid backup cursor.');
 const entries=collection==='entries';
 const rows=await rest((entries?'portfolio_entries?select=id,data,revision,created_at,updated_at':'portfolio_assets?select=id,filename,content_type,size')+'&order=id.asc&limit='+(entries?2:100)+(after?'&id=gt.'+encodeURIComponent(after):''));
 if(!Array.isArray(rows))throw new Error('Invalid backup response.');
 const items=entries?rows.map(({data,id,revision,created_at,updated_at})=>({...data,id,revision,createdAt:created_at,updatedAt:updated_at})):rows;
 const page={items,next:rows.length?rows[rows.length-1].id:null};
 if(new TextEncoder().encode(JSON.stringify(page)).length>3*1024*1024)throw new ContentError('An entry exceeds the supported backup page size. No partial backup was downloaded.',413);
 return page;
}
