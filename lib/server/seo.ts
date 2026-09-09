import 'server-only';
import type {Metadata} from 'next';
export function pageMetadata(path:string,title:string,description:string,image?:string):Metadata {
 let origin:URL|undefined;
 try{const url=new URL(process.env.SITE_URL||'https://baselalghamdi.me');if(url.protocol==='https:'&&!url.username&&!url.password)origin=new URL(url.origin)}catch{}
 const url=origin?new URL(path,origin).href:undefined;
 const images=image&&origin?[{url:new URL(image,origin).href}]:undefined;
 return {title,description,metadataBase:origin,alternates:url?{canonical:url}:undefined,openGraph:{title,description,url,siteName:'Basel Alghamdi',type:'website',images},twitter:{card:images?'summary_large_image':'summary',title,description,images:images?.map(i=>i.url)}};
}
