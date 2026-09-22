'use client';
import {useState}from'react';
import Link from'next/link';
import {api,go}from'../../lib/api';

function persistSession(accessToken:string, refreshToken?:string){
  localStorage.setItem('token',accessToken);
  if(refreshToken)localStorage.setItem('refreshToken',refreshToken);
  document.cookie=`nova_access_token=${encodeURIComponent(accessToken)}; Max-Age=604800; Path=/; SameSite=Lax`;
}

export default function Login(){
  const[p,setP]=useState('');const[pw,setPw]=useState('');const[err,setErr]=useState('');const[busy,setBusy]=useState(false);
  async function submit(x:any){
    x.preventDefault();setErr('');setBusy(true);
    try{
      const r=await api('/auth/login',{method:'POST',body:JSON.stringify({phone:p,password:pw})});
      persistSession(r.accessToken,r.refreshToken);
      // Always resolve the role from the authenticated API session before routing.
      const profile=await api('/profile');
      const next=new URLSearchParams(window.location.search).get('next');
      const destination=next&&next.startsWith('/')
        ? (next==='/admin' && profile?.role!=='SUPER_ADMIN' ? '/dashboard' : next)
        : (profile?.role==='SUPER_ADMIN'?'/admin':'/dashboard');
      window.location.assign(destination);
    }catch(e:any){setErr(e.message||'Connexion impossible.')}finally{setBusy(false)}
  }
  return <main className="container"><div className="form card"><h1>Connexion</h1><form onSubmit={submit}><label>Numéro de téléphone</label><input className="input" value={p} onChange={x=>setP(x.target.value)} type="tel" inputMode="tel" placeholder="+228XXXXXXXX" required/><label>Mot de passe</label><input className="input" value={pw} onChange={x=>setPw(x.target.value)} type="password" required/><button className="btn" disabled={busy}>{busy?'Connexion...':'Se connecter'}</button>{err&&<p className="error">{err}</p>}</form><p>Pas encore de compte ? <Link href="/register">Créer un compte</Link></p></div></main>
}
