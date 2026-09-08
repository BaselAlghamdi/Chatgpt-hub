import type {Metadata} from 'next';
import {SiteHeader} from '@/components/site-header';
import {SiteFooter} from '@/components/site-footer';
import './globals.css';
import {getProfile} from '@/lib/server/data';
import {defaultProfile} from '@/lib/content';
export const metadata:Metadata={title:{default:'Basel M. Alghamdi | Research & Projects',template:'%s | Basel M. Alghamdi'},description:'Independent financial research, valuation models, and investment ideas by Basel M. Alghamdi, a finance student at King Abdulaziz University.',robots:{index:true,follow:true}};
export const dynamic="force-dynamic";
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){const profile=await getProfile().catch(()=>defaultProfile);return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader profile={profile}/>{children}<SiteFooter profile={profile}/></body></html>}
