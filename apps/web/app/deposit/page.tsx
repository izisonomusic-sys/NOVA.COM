'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {api,money} from '../../lib/api';

const countries=[
 {code:'TG',name:'Togo',methods:[['t_money_togo','T-Money'],['moov_togo','Moov Togo']]},
 {code:'BJ',name:'Bénin',methods:[['mtn_benin','MTN'],['moov_benin','Moov'],['celtiis_cash','Celtiis Cash']]},
 {code:'CI',name:"Côte d'Ivoire",methods:[['mtn_ci','MTN'],['orange_money_ci','Orange Money'],['moov_ci','Moov'],['wave_ci','Wave'],['djamo_ci','Djamo']]},
 {code:'BF',name:'Burkina Faso',methods:[['orange_money_burkina','Orange Money'],['moov_burkina','Moov']]},
 {code:'ML',name:'Mali',methods:[['orange_money_mali','Orange Money'],['moov_mali','Moov']]},
 {code:'SN',name:'Sénégal',methods:[['orange_money_senegal','Orange Money'],['free_money_senegal','Free Money'],['expresso_senegal','Expresso'],['wave_senegal','Wave'],['djamo_senegal','Djamo']]},
 {code:'CM',name:'Cameroun',methods:[['mtn_cameroun','MTN']]},
];
const amounts=[1000,2000,3000,5000,10000,20000,50000,100000];
export default function DepositPage(){
 const [amount,setAmount]=useState(1000),[custom,setCustom]=useState(''),[country,setCountry]=useState('TG'),[operator,setOperator]=useState('t_money_togo'),[loading,setLoading]=useState(false),[msg,setMsg]=useState('');
 const value=Number(custom||amount||0);
 const selectedCountry=useMemo(()=>countries.find(c=>c.code===country)||countries[0],[country]);
 const methods=selectedCountry.methods;
 function changeCountry(code:string){const c=countries.find(x=>x.code===code)!;setCountry(code);setOperator(c.methods[0][0]);}
 async function submit(){
  setMsg('');
  if(!Number.isFinite(value)||value<1000){setMsg('Le dépôt minimum est de 1 000 XOF.');return;}
  setLoading(true);
  try{
   const r=await api('/payments/deposits',{method:'POST',body:JSON.stringify({amount:value,operator})});
   if(r.checkoutUrl&&r.checkoutUrl.startsWith('http'))window.location.href=r.checkoutUrl;
   else setMsg('Ordre de dépôt créé. Continuez avec le parcours de paiement sécurisé.');
  }catch(e:any){setMsg(e.message||'Impossible de créer le dépôt.')}finally{setLoading(false)}
 }
 return <main className="money-page"><div className="container money-shell">
  <div className="money-top"><Link href="/dashboard" className="money-back">←</Link><div><h1>Dépôt international</h1><p>Pays et opérateur sont maintenant transmis directement à PayDunya.</p></div></div>
  <section className="money-card"><h2>Pays</h2><div className="method-grid">{countries.map(c=><button type="button" key={c.code} onClick={()=>changeCountry(c.code)} className={'method-choice '+(country===c.code?'selected':'')}><span className="method-mark">{c.code}</span><span><b>{c.name}</b><small>{c.methods.length} moyen{c.methods.length>1?'s':''}</small></span></button>)}</div></section>
  <section className="money-card"><h2>Moyen de paiement</h2><div className="method-grid">{methods.map(([id,name])=><button type="button" key={id} onClick={()=>setOperator(id)} className={'method-choice '+(operator===id?'selected':'')}><span><b>{name}</b><small>{selectedCountry.name}</small></span></button>)}</div><button type="button" onClick={()=>{setCountry('INTL');setOperator('card')}} className={'method-choice '+(operator==='card'?'selected':'')}><span><b>Carte bancaire internationale</b><small>Visa / Mastercard selon disponibilité</small></span></button></section>
  <section className="money-card"><h2>Montant du dépôt</h2><div className="amount-grid">{amounts.map(v=><button type="button" key={v} onClick={()=>{setAmount(v);setCustom('')}} className={'amount-choice '+(!custom&&amount===v?'selected':'')}>{money(v)}</button>)}</div><label className="money-label">Montant personnalisé</label><div className="money-input-wrap"><input className="money-input" inputMode="numeric" value={custom} onChange={e=>setCustom(e.target.value.replace(/\D/g,''))} placeholder="Entrez le montant"/><span>XOF</span></div></section>
  <section className="money-summary"><div><span>Pays</span><b>{operator==='card'?'International':selectedCountry.name}</b></div><div><span>Moyen</span><b>{operator==='card'?'Carte bancaire':methods.find(x=>x[0]===operator)?.[1]}</b></div><div><span>Montant</span><b>{money(value)}</b></div></section>
  <button className="money-submit" onClick={submit} disabled={loading}>{loading?'Création du paiement…':'🔒 Déposer maintenant'}</button>
  <p className="money-note">Le paiement reste confirmé par le serveur PayDunya avant tout crédit du portefeuille.</p>{msg&&<p className={msg.includes('créé')?'success':'error'}>{msg}</p>}
 </div></main>
}