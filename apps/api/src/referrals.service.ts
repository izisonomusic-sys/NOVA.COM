import {Injectable}from'@nestjs/common';
import {SupabaseFinanceService}from'./supabase-finance.service';
@Injectable()
export class ReferralsService{
 constructor(private db:SupabaseFinanceService){}
 async get(uid:string){
  const {data:u,error:ue}=await this.db.db.from('profiles').select('referral_code,member_code,display_name').eq('id',uid).maybeSingle();
  if(ue) throw new Error(ue.message);
  const {data:refs,error:re}=await this.db.db.from('referrals').select('id,referred_user_id,bonus_amount,status,created_at,referrer_qualified_at,referred_qualified_at').eq('referrer_id',uid).order('created_at',{ascending:false});
  if(re) throw new Error(re.message);
  const ids=(refs||[]).map((x:any)=>x.referred_user_id);
  let children:any[]=[];
  if(ids.length){
   const {data:p,error:pe}=await this.db.db.from('profiles').select('id,display_name,member_code,created_at').in('id',ids);
   if(pe) throw new Error(pe.message); children=p||[];
  }
  const childMap=new Map(children.map((p:any)=>[p.id,p]));
  const {data:ledger,error:le}=await this.db.db.from('wallet_ledger').select('amount,status,entry_type,reference,created_at').eq('user_id',uid).eq('entry_type','referral_bonus').eq('status','posted');
  if(le) throw new Error(le.message);
  const total=(ledger||[]).reduce((s:any,x:any)=>s+Number(x.amount||0),0);
  const frontendUrl=(process.env.FRONTEND_URL||'https://nova-com-web.vercel.app').replace(/\/+$/,'');
  return {
   referralCode:u?.referral_code||u?.member_code,
   referralLink:`${frontendUrl}/register?ref=${u?.referral_code||u?.member_code||''}`,
   referrals:(refs||[]).map((r:any)=>({...r,referredUser:childMap.get(r.referred_user_id)||null})),
   rewards:(ledger||[]).map((x:any)=>({...x,amount:Number(x.amount||0)})),
   commissionTotal:total,
   bonusPerReferral:250
  };
 }
}