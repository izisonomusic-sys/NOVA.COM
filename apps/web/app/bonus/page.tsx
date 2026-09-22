'use client';
import Link from 'next/link';import {useEffect,useState} from 'react';import {api,money} from '../../lib/api';
export default function BonusPage(){
 const[d,setD]=useState<any>({referrals:[],rewards:[]});const[loading,setLoading]=useState(true);
 useEffect(()=>{api('/referrals').then(setD).catch(()=>location.href='/login').finally(()=>setLoading(false))},[]);
 const rewards=Array.isArray(d.rewards)?d.rewards:[];const total=rewards.reduce((s:any,x:any)=>s+Number(x.rewardAmount||x.amount||0),0);
 const paid=rewards.filter((x:any)=>x.rewardPaid).length;
 return <main className="main mobile-page"><div className="container">
  <div className="mobile-page-head"><div><span className="tag">BONUS</span><h1>Mes bonus</h1><p className="muted">Suivez les récompenses réellement générées par votre activité et vos parrainages.</p></div></div>
  {loading?<div className="card">Chargement...</div>:<>
   <div className="kpis">
    <div className="card"><span className="muted">Bonus gagnés</span><div className="stat">{money(total)}</div></div>
    <div className="card"><span className="muted">Parrainages</span><div className="stat">{d.referrals?.length||0}</div></div>
    <div className="card"><span className="muted">Parrainages récompensés</span><div className="stat">{paid}</div></div>
    <div className="card"><span className="muted">Taux</span><div className="stat">Configuré par nova.com</div></div>
   </div>
   <section className="section"><div className="card bonus-highlight"><span className="tag">PARRAINAGE</span><h2>Gagnez lorsque vos filleuls investissent</h2><p className="muted">Votre récompense est calculée automatiquement par le moteur de la plateforme lors du premier investissement éligible de chaque filleul.</p><Link href="/referrals" className="btn">Voir mon lien de parrainage</Link></div></section>
  </>}
 </div></main>
}
