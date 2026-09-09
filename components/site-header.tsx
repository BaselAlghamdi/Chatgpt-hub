'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Sheet,SheetTrigger,SheetContent,SheetTitle} from '@/components/ui/sheet';
import {defaultProfile,emailComposeUrl,type Profile} from '@/lib/content';
export function SiteHeader({profile=defaultProfile}:{profile?:Profile}){const email=emailComposeUrl(profile.email);const[open,setOpen]=useState(false);const path=usePathname();return <header className="site-header"><div className="wrap header-inner"><Link href="/" className="wordmark" aria-label="Basel Alghamdi home"><span className="wordmark-name">{profile.name.toUpperCase()}</span></Link><span className="header-descriptor">A JOURNAL OF RESEARCH & IDEAS</span><Sheet open={open} onOpenChange={setOpen}><SheetTrigger className="menu-button" aria-label="Open navigation"><span/><span/><span/></SheetTrigger><SheetContent className="navigation-sheet" aria-describedby={undefined}><SheetTitle className="nav-title">Explore</SheetTitle><nav aria-label="Main navigation">{[['/','Home'],['/research','Research'],['/projects','Projects'],['/about','About']].map(([href,label],i)=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={path===href?'page':undefined}><small>0{i+1}</small><span>{label}</span><ArrowUpRight size={24}/></Link>)}</nav><div className="nav-bottom"><span>LET’S CONNECT</span><a href={email} target="_blank" rel="noopener noreferrer">{profile.email}<ArrowUpRight size={16}/></a></div></SheetContent></Sheet></div></header>}
