'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {api,money,go} from '../../lib/api';

export default function Profile(){
  const [f,setF]=useState<any>({}); const [msg,setMsg]=useState(''); const [loading,setLoading]=useState(true);
  async function load(){try{const data=await api('/profile');setF(data);setMsg('')}catch(e:any){setMsg(e?.message||'Impossible de charger le profil.');}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function save(e:any){e.preventDefault();setMsg('');try{await api('/profile',{method:'PATCH',body:JSON.stringify(f)});setMsg('Profil enregistré.');await load()}catch(e:any){setMsg(e.message)}}
  const firstName=(f.fullName||'').trim().split(' ')[0]||'vous';
  const initials=(f.fullName||'N').trim().split(/\s+/).slice(0,2).map((x:string)=>x[0]).join('').toUpperCase()||'N';
  const active=Boolean(f.isActive);
  const stats=f.stats||{};
  const rows=useMemo(()=>[
    {href:'/investments',icon:'◫',title:'Mes investissements',sub:'Suivre mes placements'},
    {href:'/wallet',icon:'▣',title:'Historique financier',sub:'Dépôts, retraits et rendements'},
    {href:'/notifications',icon:'♢',title:'Notifications',sub:'Vos alertes et confirmations'},
    {href:'/referrals',icon:'♧',title:'Parrainage',sub:'Votre lien et vos récompenses'},
    {href:'/bonus',icon:'✦',title:'Mes bonus',sub:'Récompenses disponibles'},
  ],[]);
  if(loading)return <main className="mobile-page"><div className="container profile-page"><div className="card profile-skeleton"/></div></main>;
  return <main className="mobile-page profile-mobile">
    <div className="container profile-page">
      <header className="profile-mobile-head">
        <div><span className="tag">MON ESPACE</span><h1>Profil</h1></div>
        <div className="profile-avatar-large">{initials}</div>
      </header>

      <section className="profile-balance-card">
        <div className="profile-balance-top"><span>Solde disponible</span><span className={active?'profile-status active':'profile-status'}>● {active?'Compte actif':'Compte suspendu'}</span></div>
        <strong>{money(f.wallet?.balance)}</strong>
        <p>Votre solde utilisable pour investir ou retirer.</p>
        <div className="profile-balance-actions"><Link href="/deposit" className="btn profile-deposit">Déposer</Link><Link href="/withdraw" className="btn profile-withdraw">Retirer</Link></div>
      </section>

      <section className="profile-stats-grid">
        <div className="profile-stat"><span>Capital investi</span><b>{money(stats.invested)}</b></div>
        <div className="profile-stat"><span>Rendements reçus</span><b className="positive">{money(stats.earningsReceived)}</b></div>
        <div className="profile-stat"><span>Total dépôts</span><b>{money(stats.deposited)}</b></div>
        <div className="profile-stat"><span>Total retraits</span><b>{money(stats.withdrawn)}</b></div>
      </section>

      <section className="profile-menu-card card">
        <div className="profile-menu-title"><h2>Mon activité</h2><span>Accès rapide</span></div>
        {rows.map(r=><Link href={r.href} className="profile-menu-row" key={r.href}><span className="profile-menu-icon">{r.icon}</span><span className="profile-menu-copy"><b>{r.title}</b><small>{r.sub}</small></span><span className="profile-chevron">›</span></Link>)}
      </section>

      <section className="profile-edit card">
        <div className="profile-menu-title"><div><h2>Mes informations</h2><span>Votre identité sur nova.com</span></div><span className="status-pill success">Sécurisé</span></div>
        <form onSubmit={save}>
          <label>Nom complet</label><input className="input" value={f.fullName||''} onChange={e=>setF({...f,fullName:e.target.value})}/>
          <label>Numéro de téléphone</label><input className="input" value={f.phone||''} readOnly inputMode="tel"/>
          <label>Nouveau mot de passe</label><input className="input" type="password" placeholder="Laisser vide pour conserver l'actuel" value={f.password||''} onChange={e=>setF({...f,password:e.target.value})}/>
          <button className="btn" type="submit">Enregistrer les modifications</button>
        </form>
        {msg&&<p className={msg.toLowerCase().includes('enregistr')?'success':'error'}>{msg}</p>}
      </section>

      <section className="profile-security-card card"><div className="profile-menu-title"><div><h2>Statut du compte</h2><span>Informations de sécurité</span></div><span className="security-check">✓</span></div><div className="security-line"><span>Compte</span><b>{active?'Actif':'Suspendu'}</b></div><div className="security-line"><span>Rôle</span><b>{f.role==='SUPER_ADMIN'?'Fondateur':'Investisseur'}</b></div><div className="security-line"><span>Code parrainage</span><b>{f.referralCode||'—'}</b></div></section>
    </div>
  </main>
}
