'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {api,money,go} from '../../lib/api';
const countries=[
 {code:'TG',name:'Togo',prefix:'+228',methods:[['t-money-togo','T-Money'],['moov-togo','Moov Togo']]},
 {code:'BJ',name:'Bénin',prefix:'+229',methods:[['mtn-benin','MTN'],['moov-benin','Moov'],['celtiis-cash','Celtiis Cash']]},
 {code:'CI',name:"Côte d'Ivoire",prefix:'+225',methods:[['mtn-ci','MTN'],['orange-money-ci','Orange Money'],['moov-ci','Moov'],['wave-ci','Wave'],['djamo-ci','Djamo']]},
 {code:'BF',name:'Burkina Faso',prefix:'+226',methods:[['orange-money-burkina','Orange Money'],['moov-burkina-faso','Moov']]},
 {code:'ML',name:'Mali',prefix:'+223',methods:[['orange-money-mali','Orange Money']]},
 {code:'SN',name:'Sénégal',prefix:'+221',methods:[['orange-money-senegal','Orange Money'],['free-money-senegal','Free Money'],['expresso-senegal','Expresso'],['wave-senegal','Wave'],['djamo-sn','Djamo']]},
 {code:'CM',name:'Cameroun',prefix:'+237',methods:[['mtn-cameroun','MTN']]},
];
const amounts=[1000,2000,3000,5000,10000,20000,50000,100000];
export default function WithdrawPage(){
 const [wallet,setWallet]=useState<any>({}),[amount,setAmount]=useState(1000),[custom,setCustom]=useState(''),[country,setCountry]=useState('TG'),[operator,setOperator]=useState('t-money-togo'),[phone,setPhone]=useState(''),[accountName,setAccountName]=useState(''),[loading,setLoading]=useState(false),[msg,setMsg]=useState('');
 const value=Number(custom||amount||0);
 const selectedCountry=useMemo(()=>countries.find(c=>c.code===country)||countries[0],[country]);
 const methods=selectedCountry.methods;
 useEffect(()=>{api('/wallet').then(setWallet).catch(()=>go('/login'))},[]);
 function changeCountry(code:string){const c=countries.find(x=>x.code===code)!;setCountry(code);setOperator(c.methods[0][0]);}
 async function submit(){
  setMsg('');
  if(!Number.isFinite(value)||value<1000){setMsg('Le retrait minimum est de 1 000 XOF.');return;}
  if(phone.replace(/\D/g,'').length<8){setMsg('Entrez un numéro de téléphone valide.');return;}
  if(accountName.trim().length<2){setMsg('Entrez le nom du titulaire du compte.');return;}
  setLoading(true);
  try{await api('/withdrawals',{method:'POST',body:JSON.stringify({amount:value,countryCode:country,operator,phone,accountName})});setMsg('Demande de retrait envoyée. Le statut sera mis à jour par PayDunya.');setWallet((w:any)=>({...w,balance:Math.max(0,Number(w?.balance||0)-value)}));}
  catch(e:any){setMsg(e.message||'Impossible de demander le retrait.')}finally{setLoading(false)}
 }
 return <main className="money-page"><div className="container money-shell">
  <div className="money-top"><Link href="/dashboard" className="money-back">←</Link><div><h1>Retrait international</h1><p>Choisissez le pays, l'opérateur et le numéro bénéficiaire.</p></div></div>
  <section className="money-card money-balance"><div><span>Solde disponible</span><strong>{money(wallet?.balance)}</strong></div><div className="money-currency">XOF (CFA)</div></section>
  <section className="money-card"><h2>Pays bénéficiaire</h2><div className="method-grid">{countries.map(c=><button type="button" key={c.code} onClick={()=>changeCountry(c.code)} className={'method-choice '+(country===c.code?'selected':'')}><span className="method-mark">{c.code}</span><span><b>{c.name}</b><small>{c.prefix}</small></span></button>)}</div></section>
  <section className="money-card"><h2>Opérateur</h2><div className="method-grid">{methods.map(([id,name])=><button type="button" key={id} onClick={()=>setOperator(id)} className={'method-choice '+(operator===id?'selected':'')}><span><b>{name}</b><small>{selectedCountry.name}</small></span></button>)}</div></section>
  <section className="money-card"><h2>Montant et bénéficiaire</h2><div className="amount-grid">{amounts.map(v=><button type="button" key={v} onClick={()=>{setAmount(v);setCustom('')}} className={'amount-choice '+(!custom&&amount===v?'selected':'')}>{money(v)}</button>)}</div><label className="money-label">Montant personnalisé</label><div className="money-input-wrap"><input className="money-input" inputMode="numeric" value={custom} onChange={e=>setCustom(e.target.value.replace(/\D/g,''))} placeholder="Entrez le montant"/><span>XOF</span></div><label className="money-label">Nom du titulaire</label><input className="money-input" value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Nom complet"/><label className="money-label">Numéro {methods.find(x=>x[0]===operator)?.[1]}</label><div className="money-input-wrap"><input className="money-input" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numéro sans indicatif pays"/><span>{selectedCountry.prefix}</span></div></section>
  <section className="money-summary"><div><span>Pays</span><b>{selectedCountry.name}</b></div><div><span>Opérateur</span><b>{methods.find(x=>x[0]===operator)?.[1]}</b></div><div><span>Montant</span><b>{money(value)}</b></div></section>
  <button className="money-submit" onClick={submit} disabled={loading}>{loading?'Envoi de la demande…':'↗ Demander le retrait'}</button>
  <p className="money-note">Les fonds sont réservés dans NOVA puis le statut PayDunya confirme succès ou échec. Un échec recrédite automatiquement le solde.</p>{msg&&<p className={msg.startsWith('Demande')?'success':'error'}>{msg}</p>}
 </div></main>
}