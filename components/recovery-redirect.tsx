'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
const resetPath='/desk-65efdcc4b137b000/reset-password';
export function RecoveryRedirect(){const path=usePathname();const router=useRouter();useEffect(()=>{if(path===resetPath)return;const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('type')==='recovery'&&hash.get('access_token'))router.replace(resetPath+location.hash)},[path,router]);return null}
