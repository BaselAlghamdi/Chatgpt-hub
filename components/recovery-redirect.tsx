'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
const resetPath='/desk-65efdcc4b137b000/reset-password';
const RecoveryContext=createContext<{token:string;ready:boolean;clear:()=>void}>({token:'',ready:false,clear:()=>{}});
export const useRecovery=()=>useContext(RecoveryContext);
export function RecoveryProvider({children}:{children:ReactNode}) {
 const path=usePathname();const router=useRouter();const[token,setToken]=useState('');const[ready,setReady]=useState(false);
 useEffect(()=>{const hash=new URLSearchParams(location.hash.slice(1));const recovery=hash.get('type')==='recovery';
  if(hash.has('access_token')||hash.has('refresh_token')||hash.has('error')) {
   // Tokens stay in memory only; discard the refresh token and scrub browser history.
   if(recovery)setToken(hash.get('access_token')||'');
   history.replaceState(history.state,'',location.pathname+location.search);
   if(recovery&&path!==resetPath)router.replace(resetPath);
  }
  setReady(true);
 },[path,router]);
 return <RecoveryContext.Provider value={{token,ready,clear:()=>setToken('')}}>{children}</RecoveryContext.Provider>;
}
