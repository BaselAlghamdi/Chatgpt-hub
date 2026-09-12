'use client';
import {useState,useEffect} from 'react';
import {Field} from './admin-field';
export function AdminLogin(){
 const[updated,setUpdated]=useState(false),[recover,setRecover]=useState(false);
 const[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const[error,setError]=useState(''),[message,setMessage]=useState('');
 const[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{setUpdated(new URLSearchParams(location.search).get('password')==='updated')},[]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(timer)},[cooldown]);
 return <form onSubmit={async e=>{
  e.preventDefault();if(busy||(recover&&cooldown))return;setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/desk-65efdcc4b137b000/'+(recover?'recover':'session'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(recover?{email}:{email,password})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'The request failed. Please try again.');
   if(recover){setMessage(d.message);setCooldown(60);setBusy(false)}else window.location.assign('/desk-65efdcc4b137b000');
  }catch(e){setError((e as Error).message);setBusy(false)}
 }}>
  {updated&&!recover&&<p role="status">Password updated. Sign in with your new password.</p>}
  <p>{recover?'Enter your administrator email to request a password reset link.':'Sign in to manage your research, projects, and credentials.'}</p>
  <Field label="Email"><input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></Field>
  {!recover&&<Field label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></Field>}
  <div className="button-row"><button className="button" disabled={busy||(recover&&cooldown>0)}>{busy?(recover?'Requesting…':'Signing in…'):recover?(cooldown?`Try again in ${cooldown}s`:'Send reset link'):'Sign in'}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>{setRecover(!recover);setPassword('');setError('');setMessage('')}}>{recover?'Back to sign in':'Forgot password?'}</button></div>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="form-error">{error}</p>}
 </form>
}
export function AdminLogout(){return <button className="button secondary" onClick={async()=>{const r=await fetch('/api/desk-65efdcc4b137b000/session',{method:'DELETE'});if(r.ok){try{for(const key of Object.keys(sessionStorage))if(key.startsWith('portfolio-draft:'))sessionStorage.removeItem(key)}catch{}window.location.assign('/desk-65efdcc4b137b000')}}}>Sign out</button>}
