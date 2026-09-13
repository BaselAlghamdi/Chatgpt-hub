import type {z} from 'zod';
import type {entryInput,profileInput} from './validation';
export const kinds=['article','project','certificate','honor'] as const;
export type EntryKind=typeof kinds[number];
export type ContentFormat='markdown'|'rich';
export type RichMark={type:string;attrs?:Record<string,unknown>};
export type RichNode={type?:string;attrs?:Record<string,unknown>;content?:RichNode[];marks?:RichMark[];text?:string};
export type RichDocument={type:'doc';content?:RichNode[]};
export type ArticleSeo={title:string;description:string;canonicalUrl:string;socialImageUrl:string;openGraphTitle:string;openGraphDescription:string};
export type ResearchTemplate={id:string;name:string;description:string;content:RichDocument};
export const kindLabels:Record<EntryKind,string>={article:'Research',project:'Projects',certificate:'Certifications',honor:'Academic honors'};
export function validContentUrl(value:string){if(!value)return true;if(/^\/api\/media\/[a-f0-9-]{36}$/.test(value))return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export type EntryInput=z.infer<typeof entryInput>;
export type Entry=EntryInput&{id:string;createdAt:string;updatedAt:string;readingMinutes?:number};
export type Profile=z.infer<typeof profileInput>;
export const defaultProfile:Profile={revision:0,name:'Basel Alghamdi',intro:'A finance student taking a closer look at businesses, markets, and what drives value.',bio:'I’m a finance student at King Abdulaziz University in Jeddah. I’m interested in how businesses create value and how to put a sensible price on it.\n\nMy interests sit at the intersection of financial statements, business fundamentals, and valuation. I use projects to connect the numbers to the operating decisions behind them.',university:'King Abdulaziz University',degree:'Finance',faculty:'Faculty of Economics & Administration',gpa:'',location:'Jeddah, Saudi Arabia',email:'baselmsalghamdi@gmail.com',linkedin:'https://www.linkedin.com/in/imbasel',interests:['Equity research & business analysis','Financial modeling & valuation','Saudi and global capital markets','Technology and the economics of growth']};
export const contactEmail=defaultProfile.email;
export function emailComposeUrl(email:string){return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)}
export const emptySeo:ArticleSeo={title:'',description:'',canonicalUrl:'',socialImageUrl:'',openGraphTitle:'',openGraphDescription:''};
export function newEntry(kind:EntryKind):EntryInput{return{id:undefined,revision:0,kind,title:'',slug:'',excerpt:'',body:'',contentFormat:'markdown',richContent:null,author:'Basel Alghamdi',seo:{...emptySeo},category:'',status:'draft',featured:false,coverUrl:'',coverAlt:'',issuer:'',credentialUrl:'',date:new Date().toISOString().slice(0,10),sortOrder:0,tags:[],attachments:[]}}
export function entryLink(e:Pick<Entry,'kind'|'slug'>){return e.kind==='article'?'/research/'+encodeURIComponent(e.slug):e.kind==='project'?'/projects/'+encodeURIComponent(e.slug):'/about'}
export function displayDate(value:string){return value?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value)):''}
export function readTime(body:string){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/230))}
export function richText(document:RichDocument|null|undefined){const parts:string[]=[];const visit=(node:RichNode)=>{if(node.text)parts.push(node.text);node.content?.forEach(visit);if(['paragraph','heading','blockquote','tableRow','codeBlock','callout'].includes(node.type||''))parts.push('\n')};document?.content?.forEach(visit);return parts.join(' ').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
export function wordCount(text:string){const normalized=text.trim();return normalized?normalized.split(/\s+/u).length:0}
export function slugify(value:string){return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,130)}

const heading=(level:number,text:string):RichNode=>({type:'heading',attrs:{level},content:[{type:'text',text}]});
export const researchTemplates:ResearchTemplate[]=[
 {id:'equity-research',name:'Equity Research Report',description:'A complete company research structure.',content:{type:'doc',content:[heading(2,'Investment Thesis'),{type:'paragraph'},heading(2,'Company Overview'),{type:'paragraph'},heading(2,'Industry Overview'),{type:'paragraph'},heading(2,'Historical Financial Performance'),{type:'paragraph'},heading(2,'Forecast'),{type:'paragraph'},heading(2,'Valuation'),{type:'paragraph'},heading(2,'Catalysts'),{type:'paragraph'},heading(2,'Risks'),{type:'paragraph'},heading(2,'Conclusion'),{type:'paragraph'}]}},
 {id:'company-analysis',name:'Company Analysis',description:'Business model, financial performance, and valuation.',content:{type:'doc',content:[heading(2,'Company Overview'),{type:'paragraph'},heading(2,'Business Model'),{type:'paragraph'},heading(2,'Financial Analysis'),{type:'paragraph'},heading(2,'Valuation'),{type:'paragraph'},heading(2,'Risks'),{type:'paragraph'}]}},
 {id:'earnings-review',name:'Earnings Review',description:'Review a reporting period and changes to estimates.',content:{type:'doc',content:[heading(2,'Key Takeaways'),{type:'paragraph'},heading(2,'Results vs. Expectations'),{type:'paragraph'},heading(2,'Operating Drivers'),{type:'paragraph'},heading(2,'Guidance and Estimates'),{type:'paragraph'},heading(2,'Valuation Impact'),{type:'paragraph'}]}},
 {id:'investment-thesis',name:'Investment Thesis',description:'A concise thesis with catalysts and risks.',content:{type:'doc',content:[heading(2,'Thesis'),{type:'paragraph'},heading(2,'Why the Market May Be Wrong'),{type:'paragraph'},heading(2,'Catalysts'),{type:'paragraph'},heading(2,'Risks'),{type:'paragraph'},heading(2,'What Would Change My View'),{type:'paragraph'}]}},
 {id:'valuation-report',name:'Valuation Report',description:'DCF, comparables, and sensitivity analysis.',content:{type:'doc',content:[heading(2,'Valuation Summary'),{type:'paragraph'},heading(2,'Forecast Assumptions'),{type:'paragraph'},heading(2,'DCF Valuation'),{type:'paragraph'},heading(2,'Comparable Companies'),{type:'paragraph'},heading(2,'Sensitivity Analysis'),{type:'paragraph'}]}},
 {id:'ipo-analysis',name:'IPO Analysis',description:'Offering, business quality, valuation, and risks.',content:{type:'doc',content:[heading(2,'Offering Overview'),{type:'paragraph'},heading(2,'Company and Industry'),{type:'paragraph'},heading(2,'Financial Performance'),{type:'paragraph'},heading(2,'Use of Proceeds'),{type:'paragraph'},heading(2,'Valuation'),{type:'paragraph'},heading(2,'Risks'),{type:'paragraph'}]}},
 {id:'industry-research',name:'Industry Research',description:'Market structure, economics, and competitive outlook.',content:{type:'doc',content:[heading(2,'Industry Overview'),{type:'paragraph'},heading(2,'Market Structure'),{type:'paragraph'},heading(2,'Growth Drivers'),{type:'paragraph'},heading(2,'Competitive Landscape'),{type:'paragraph'},heading(2,'Economics and Valuation'),{type:'paragraph'},heading(2,'Risks and Outlook'),{type:'paragraph'}]}}
];
