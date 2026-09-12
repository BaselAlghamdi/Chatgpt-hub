'use client';
import {useEffect,useRef,useState} from 'react';
import {DRAFT_PREFIX,parseDraft} from '@/lib/drafts';
export function useRecoverableDraft<T>(key:string,value:T,dirty:boolean,valid:(v:unknown)=>v is T,onRestore:(v:T)=>void){
 const storageKey=DRAFT_PREFIX+key;
 const[pending,setPending]=useState<{value:T;updatedAt:string}|null>(null);
 const[ready,setReady]=useState(false);
 const[unavailable,setUnavailable]=useState(false);
 const latest=useRef<string|null>(null);
 useEffect(()=>{try{const draft=parseDraft(sessionStorage.getItem(storageKey),valid);if(draft&&JSON.stringify(draft.value)!==JSON.stringify(value))setPending(draft)}catch{setUnavailable(true)}setReady(true)},[storageKey]);
 useEffect(()=>{if(!ready||pending)return;latest.current=dirty?JSON.stringify({version:1,updatedAt:new Date().toISOString(),value}):null;const persist=()=>{try{if(latest.current)sessionStorage.setItem(storageKey,latest.current);else sessionStorage.removeItem(storageKey)}catch{setUnavailable(true)}};const timer=setTimeout(persist,300);window.addEventListener('pagehide',persist);return()=>{clearTimeout(timer);window.removeEventListener('pagehide',persist);persist()}},[value,dirty,ready,pending,storageKey]);
 function clear(){latest.current=null;setPending(null);try{sessionStorage.removeItem(storageKey)}catch{setUnavailable(true)}}
 const notice=pending?<div className="editor-panel" role="status"><p>Unsaved changes from this tab are available. Recovering them does not publish or save anything.</p><p>If the saved entry changed elsewhere, its revision check will prevent an overwrite.</p><div className="admin-actions"><button type="button" className="button secondary" onClick={()=>{onRestore(pending.value);setPending(null)}}>Recover unsaved changes</button><button type="button" className="text-link" onClick={clear}>Discard recovery copy</button></div></div>:unavailable?<p role="status">This browser cannot keep a recovery copy. Save your changes before leaving.</p>:dirty?<p className="muted" role="status">A recovery copy is kept in this tab. Save to keep your changes permanently.</p>:null;
 return{clear,notice};
}
