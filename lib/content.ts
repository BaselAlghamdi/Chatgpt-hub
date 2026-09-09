import type {z} from 'zod';
import type {entryInput,profileInput} from './validation';
export const kinds=['article','project','certificate','honor'] as const;
export type EntryKind=typeof kinds[number];
export const kindLabels:Record<EntryKind,string>={article:'Research',project:'Projects',certificate:'Certifications',honor:'Academic honors'};
export function validContentUrl(value:string){if(!value)return true;if(/^\/api\/media\/[a-f0-9-]{36}$/.test(value))return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export type EntryInput=z.infer<typeof entryInput>;
export type Entry=EntryInput&{id:string;createdAt:string;updatedAt:string;readingMinutes?:number};
export type Profile=z.infer<typeof profileInput>;
export const defaultProfile:Profile={revision:0,name:'Basel Alghamdi',intro:'A finance student taking a closer look at businesses, markets, and what drives value.',bio:'I’m a finance student at King Abdulaziz University in Jeddah. I’m interested in how businesses create value and how to put a sensible price on it.\n\nMy interests sit at the intersection of financial statements, business fundamentals, and valuation. I use projects to connect the numbers to the operating decisions behind them.',university:'King Abdulaziz University',degree:'Finance',faculty:'Faculty of Economics & Administration',gpa:'',location:'Jeddah, Saudi Arabia',email:'baselmsalghamdi@gmail.com',linkedin:'https://www.linkedin.com/in/imbasel',interests:['Equity research & business analysis','Financial modeling & valuation','Saudi and global capital markets','Technology and the economics of growth']};
export const contactEmail=defaultProfile.email;
export function emailComposeUrl(email:string){return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)}
export function newEntry(kind:EntryKind):EntryInput{return{id:undefined,revision:0,kind,title:'',slug:'',excerpt:'',body:'',category:'',status:'draft',featured:false,coverUrl:'',coverAlt:'',issuer:'',credentialUrl:'',date:new Date().toISOString().slice(0,10),sortOrder:0,tags:[],attachments:[]}}
export function entryLink(e:Pick<Entry,'kind'|'slug'>){return e.kind==='article'?'/research/'+encodeURIComponent(e.slug):e.kind==='project'?'/projects/'+encodeURIComponent(e.slug):'/about'}
export function displayDate(value:string){return value?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value)):''}
export function readTime(body:string){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/230))}
export function slugify(value:string){return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,130)}
export function assetReferences(input:EntryInput){const s=[input.coverUrl,input.credentialUrl,input.body,...input.attachments.map(x=>x.url)].join('\n');return [...new Set([...s.matchAll(/\/api\/media\/([a-f0-9-]{36})/g)].map(x=>x[1]))]}
