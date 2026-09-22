'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {api,money,go} from '../../lib/api';

function shortDate(value:any){return value?new Date(value).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'—'}

export default function Dashboard(){
  const [w,setW]=useState<any>({balance:0});
  const [i,setI]=useState<any[]>([]);
  const [n,setN]=useState<any[]>([]);
  const [profile,setProfile]=useState<any>({});
  const [loading,setLoading]=useState(true);

  async function load(){
    try{
      // Le profil est le seul appel qui confirme réellement que la session est valide.
      // Les autres données peuvent être momentanément indisponibles sans déconnecter l'utilisateur.
      const user=await api('/profile');
      setProfile(user||{});

      const results=await Promise.allSettled([
        api('/wallet'),api('/investments/me'),api('/notifications')
      ]);
      const wallet=results[0].status==='fulfilled'?results[0].value:null;
      const investments=results[1].status==='fulfilled'?results[1].value:[];
      const notifications=results[2].status==='fulfilled'?results[2].value:[];
      setW(wallet||{}); setI(Array.isArray(investments)?investments:[]);
      setN(Array.isArray(notifications)?notifications:[]);
    }catch(e:any){
      // Une erreur réseau/serveur temporaire ne doit jamais déconnecter l'utilisateur.
      // On ne renvoie vers Login que si l'API confirme une session réellement invalide.
      if(e?.status===401){
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        document.cookie='nova_access_token=; Max-Age=0; path=/';
        go('/login');
      }
    }finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  const invested=useMemo(()=>i.reduce((s,x)=>s+Number(x.amount||0),0),[i]);
  const expected=useMemo(()=>i.reduce((s,x)=>s+Number(x.expectedProfit||0),0),[i]);
  const active=i.filter(x=>!['MATURED','COMPLETED','CANCELLED','REFUNDED'].includes(String(x.status||'').toUpperCase()));
  const unread=n.filter(x=>!x.readAt).length;

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    document.cookie='nova_access_token=; Max-Age=0; path=/';
    go('/login');
  }

  return <div className="app-shell">
    <aside className="sidebar dashboard-sidebar">
      <Link href="/" className="brand"><span className="brand-mark">N</span><span>nova.com<small>INVESTISSEMENT • IMPACT • AVENIR</small></span></Link>
      <nav className="side" aria-label="Navigation">
        <Link className="active" href="/dashboard">⌂ <span>Accueil</span></Link>
        <Link href="/projects">▦ <span>Projets</span></Link>
        <Link href="/investments">◫ <span>Mes investissements</span></Link>
        <Link href="/wallet">◉ <span>Portefeuille</span></Link>
        <Link href="/bonus">✦ <span>Bonus</span></Link>
        <Link href="/referrals">♧ <span>Parrainage</span></Link>
        <Link href="/profile">● <span>Profil</span></Link>
        {profile?.role==='SUPER_ADMIN'&&<Link href="/admin">⚙ <span>Administration</span></Link>}
        <a href="#" onClick={(e)=>{e.preventDefault();logout()}}>↪ <span>Déconnexion</span></a>
      </nav>
    </aside>

    <main className="main dashboard-main">
      <div className="dashboard-container">
        <header className="dashboard-clean-head">
          <div>
            <span className="tag">MON ESPACE</span>
            <h1>Tableau de bord</h1>
          </div>
          <div className="top-actions">
            {profile?.role==='SUPER_ADMIN'&&<Link href="/admin" className="btn secondary">Administration</Link>}
            <Link href="/profile" className="avatar">{String(profile?.fullName||'N').trim().charAt(0).toUpperCase()||'N'}</Link>
          </div>
        </header>

        {loading ? <div className="dashboard-skeleton"><div className="card skeleton-block"/><div className="card skeleton-block"/><div className="card skeleton-block"/></div> : <>
          <section className="balance-card">
            <div className="balance-head">
              <div><span>Solde disponible</span><strong>{money(w?.balance)}</strong></div>
              <span className="secure-pill">● Compte actif</span>
            </div>
            <div className="balance-actions">
              <Link href="/deposit" className="btn white">+ Déposer</Link>
              <Link href="/withdraw" className="btn ghost-white">↗ Retirer</Link>
              <Link href="/wallet" className="balance-link">Voir le portefeuille →</Link>
            </div>
          </section>

          <section className="dashboard-kpis">
            <div className="card dashboard-kpi"><span className="kpi-icon">◫</span><div><small>Capital investi</small><b>{money(invested)}</b></div></div>
            <div className="card dashboard-kpi"><span className="kpi-icon green">↗</span><div><small>Gains attendus</small><b className="positive">{money(expected)}</b></div></div>
            <div className="card dashboard-kpi"><span className="kpi-icon gold">✦</span><div><small>Investissements actifs</small><b>{active.length}</b></div></div>
          </section>

          <section className="quick-grid">
            <Link href="/projects" className="quick-card"><span>▦</span><div><b>Projets disponibles</b><small>Investir dans une opportunité</small></div><i>→</i></Link>
            <Link href="/investments" className="quick-card"><span>◫</span><div><b>Mes investissements</b><small>{i.length} placement{i.length>1?'s':''}</small></div><i>→</i></Link>
            <Link href="/bonus" className="quick-card"><span>✦</span><div><b>Mes bonus</b><small>Récompenses & avantages</small></div><i>→</i></Link>
            <Link href="/referrals" className="quick-card"><span>♧</span><div><b>Parrainage</b><small>Inviter et suivre les récompenses</small></div><i>→</i></Link>
          </section>

          <div className="dashboard-columns">
            <section className="card dashboard-panel">
              <div className="panel-head"><div><h2>Mes investissements</h2><p className="muted">Vos placements en cours</p></div><Link href="/investments">Tout voir →</Link></div>
              {i.length===0 ? <div className="empty-state"><div className="empty-icon">◫</div><b>Aucun investissement</b><p className="muted">Découvrez les projets publiés et investissez depuis votre portefeuille.</p><Link href="/projects" className="btn">Voir les projets</Link></div> :
              <div className="investment-list">{i.slice(0,5).map(x=><Link href={`/projects/${x.project?.id||x.projectId||''}`} className="investment-row" key={x.id}>
                <span className="project-avatar">N</span><div className="investment-info"><b>{x.project?.title||x.projectTitle||'Projet nova.com'}</b><small>{String(x.status||'ACTIVE').toLowerCase()} · échéance {shortDate(x.maturityAt)}</small></div>
                <div className="investment-value"><b>{money(x.amount)}</b><small className="positive">+{money(x.expectedProfit)}</small></div>
              </Link>)}</div>}
            </section>

            <section className="card dashboard-panel">
              <div className="panel-head"><div><h2>Activité</h2><p className="muted">Vos dernières notifications</p></div><span className="notification-count">{unread}</span></div>
              {n.length===0 ? <div className="empty-mini"><span>✓</span><p>Aucune notification.</p></div> :
              <div className="notification-list">{n.slice(0,5).map(x=><div className="notification-row" key={x.id}><span className="notification-dot">●</span><div><b>{x.title}</b><p>{x.message}</p><small>{shortDate(x.createdAt)}</small></div></div>)}</div>}
              <Link href="/notifications" className="dashboard-more">Voir toutes les notifications →</Link>
            </section>
          </div>

          <section className="referral-banner">
            <div><span className="tag light-tag">PARRAINAGE</span><h2>Invitez vos proches</h2><p>Partagez votre lien personnel et suivez vos récompenses.</p></div>
            <Link href="/referrals" className="btn white">Mon parrainage</Link>
          </section>
        </>}
      </div>
    </main>
  </div>
}
