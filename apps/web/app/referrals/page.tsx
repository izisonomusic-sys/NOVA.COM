'use client';
import {useEffect,useState}from'react';
import Link from'next/link';
import {api}from'../../lib/api';

export default function Referrals(){
 const[d,setD]=useState<any>();
 const[copied,setCopied]=useState(false);

 useEffect(()=>{
   api('/referrals').then(setD).catch(()=>location.href='/login')
 },[]);

 async function copyReferralLink(){
   if(!d?.referralLink)return;
   try{
     await navigator.clipboard.writeText(d.referralLink);
     setCopied(true);
     setTimeout(()=>setCopied(false),2000);
   }catch{
     setCopied(false);
   }
 }

 return <main className="container section">
   <div className="row">
     <h1>Parrainage</h1>
     <Link href="/dashboard" className="btn secondary">Retour</Link>
   </div>

   <div className="card">
     <p className="muted">Votre lien de parrainage</p>

     <div className="referral-link-box">
       <input
         className="input"
         readOnly
         value={d?.referralLink||''}
       />
       <button
         type="button"
         className="btn referral-copy-btn"
         onClick={copyReferralLink}
         disabled={!d?.referralLink}
       >
         {copied?'Copié ✓':'Copier'}
       </button>
     </div>

     <p className="muted referral-help">
       Partagez ce lien pour inviter vos filleuls à créer leur compte.
     </p>

     <div className="grid2">
       <div>
         <span className="muted">Filleuls</span>
         <div className="stat">{d?.referrals?.length||0}</div>
       </div>

       <div>
         <span className="muted">Prime par filleul</span>
         <div className="stat">500 XOF</div>
       </div>
     </div>

     <div className="card" style={{marginTop:12}}>
       <b>Règle du bonus</b>
       <p className="muted">
         Quand votre filleul crée son compte et effectue son premier dépôt confirmé,
         500 XOF sont crédités sur votre compte principal et 500 XOF sur le compte
         principal du filleul. Pour demander un retrait, vous devez avoir investi
         au moins une fois dans un projet.
       </p>
     </div>
   </div>
 </main>
}
