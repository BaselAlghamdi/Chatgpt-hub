import 'server-only';
import {listEntries} from './data';
import type {EntryKind} from '../content';
// Keep page identity and navigation available; never describe an outage as an empty portfolio.
export async function publicEntries(kind:EntryKind){
 try{return {entries:await listEntries(kind),unavailable:false}}
 catch(error){const e=error as {code?:string;status?:number;name?:string};console.error('portfolio_public_read_failed',{kind,code:e.code,status:e.status,name:e.name});return{entries:[],unavailable:true}}
}
