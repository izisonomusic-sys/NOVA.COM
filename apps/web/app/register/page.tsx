'use client';
import {useEffect,useState}from'react';import Link from'next/link';import {api,go}from'../../lib/api';
export default function Register(){
 const[ref,setRef]=useState('');const[form,setForm]=useState({phone:'',password:'',confirmPassword:'',firstName:'',lastName:''});const[err,setErr]=useState('');const[busy,setBusy]=useState(false);
 useEffect(()=>{setRef(new URLSearchParams(window.location.search).get('ref')||'')},[]);
 async function submit(e:any){e.preventDefault();setErr('');setBusy(true);try{const r=await api('/auth/register',{method:'POST',body:JSON.stringify({...form,referredBy:ref||undefined})});localStorage.setItem('token',r.accessToken);if(r.refreshToken)localStorage.setItem('refreshToken',r.refreshToken);document.cookie=`nova_access_token=${encodeURIComponent(r.accessToken)}; Max-Age=604800; Path=/; SameSite=Lax`;
      // Vérifie que la session nouvellement créée est immédiatement utilisable avant de quitter l'inscription.
      let sessionReady=false;
      for(let attempt=0;attempt<5&&!sessionReady;attempt++){
        try{await api('/profile');sessionReady=true}catch{if(attempt<4)await new Promise(resolve=>setTimeout(resolve,800));}
      }
      if(!sessionReady)throw new Error('Le compte a été créé, mais la session met un peu de temps à démarrer. Réessayez dans quelques secondes.');
      go('/dashboard')}catch(e:any){setErr(e.message||'Impossible de créer le compte')}finally{setBusy(false)}}
 return <main className="container"><div className="form card"><span className="tag">NOUVEAU COMPTE</span><h1>Créer mon compte</h1><p className="muted">Créez votre compte avec votre numéro de téléphone et votre mot de passe. Aucun SMS ni code de confirmation n'est nécessaire.</p><form onSubmit={submit}>{[['firstName','Prénom'],['lastName','Nom'],['phone','Numéro de téléphone']].map(([k,l])=><div key={k}><label>{l}</label><input className="input" type="text" inputMode={k==='phone'?'tel':'text'} placeholder={k==='phone'?'+228XXXXXXXX':''} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==='phone'||k==='firstName'}/></div>)}<label>Mot de passe</label><input className="input" type="password" minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/><label>Confirmer le mot de passe</label><input className="input" type="password" minLength={8} value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} required/><button className="btn" disabled={busy}>{busy?'Création du compte...':'Créer mon compte'}</button></form>{err&&<p className="error">{err}</p>}<p>Déjà inscrit ? <Link href="/login">Se connecter</Link></p></div></main>
}
