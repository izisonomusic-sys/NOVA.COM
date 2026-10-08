import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual, randomUUID } from 'crypto';
import { PayDunyaPaymentProvider } from './payments/paydunya.provider';
import { SupabaseFinanceService } from './supabase-finance.service';
import { externalApis } from './config-external-apis';

@Injectable()
export class PaymentsService {
  constructor(private s:PayDunyaPaymentProvider, private db:SupabaseFinanceService) {}

  async deposit(uid:string, amount:number, operator='card') {
    if(!Number.isFinite(amount)||amount<1000) throw new BadRequestException('Le dépôt minimum est de 1 000 XOF.');
    const {data:profile}=await this.db.db.from('profiles').select('display_name,phone').eq('id',uid).maybeSingle();
    const reference='DEP-'+randomUUID();
    const {data:tx,error}=await this.db.db.from('payment_transactions').insert({
      user_id:uid,reference,provider:'paydunya',amount:Math.round(amount),currency:'XOF',status:'pending'
    }).select('*').single();
    if(error||!tx) throw new BadRequestException(error?.message||'Impossible de créer la transaction de dépôt.');
    try{
      const r=await this.s.createDeposit({
        userId:uid,amount,reference,operator,
        customer:{name:profile?.display_name||undefined,phone:profile?.phone||undefined}
      });
      const {data:updated,error:updateError}=await this.db.db.from('payment_transactions').update({
        provider_token:r.providerRef,provider_payload:r.providerResponse||null
      }).eq('id',tx.id).select('*').single();
      if(updateError) throw new Error(updateError.message);
      return {...updated,checkoutUrl:r.checkoutUrl};
    }catch(e){
      await this.db.db.from('payment_transactions').update({status:'failed',provider_payload:{error:String(e)}}).eq('id',tx.id);
      throw e;
    }
  }

  async mockConfirm(uid:string,providerReference:string){
    if(externalApis.paydunya.mode!=='mock') throw new BadRequestException('Mode mock uniquement');
    const {data:tx}=await this.db.db.from('payment_transactions').select('*').eq('user_id',uid).eq('provider_token',providerReference).maybeSingle();
    if(!tx) throw new BadRequestException('Dépôt mock introuvable');
    await this.db.rpc('nova_confirm_paydunya_payment',{p_payment_id:tx.id,p_provider_token:providerReference,p_paid_amount:tx.amount,p_provider_payload:{token:providerReference,status:'completed',mock:true}});
    return {ok:true};
  }

  async webhook(rawBody:any){
    const body=rawBody?.data && typeof rawBody.data==='string'?{...rawBody,data:JSON.parse(rawBody.data)}:rawBody;
    const data=body?.data||body;
    if(!data||typeof data!=='object') throw new BadRequestException('Payload PayDunya invalide');
    if(externalApis.paydunya.masterKey&&!this.verifyHash(String(data.hash||''))) throw new UnauthorizedException('Webhook PayDunya non authentifié');

    const token=String(data?.invoice?.token||data?.token||data?.provider_reference||'');
    const status=String(data?.status||data?.payment_status||'pending').toLowerCase();
    if(!token) throw new BadRequestException('Référence PayDunya manquante');

    const {data:tx,error}=await this.db.db.from('payment_transactions').select('*').eq('provider_token',token).maybeSingle();
    if(!tx||error) throw new BadRequestException('Transaction PayDunya introuvable');
    if(status==='completed'||status==='success'||status==='paid'){
      const paidAmount=Number(data?.invoice?.total_amount||data?.amount||tx.amount);
      await this.db.rpc('nova_confirm_paydunya_payment',{p_payment_id:tx.id,p_provider_token:token,p_paid_amount:paidAmount,p_provider_payload:data});
      return {ok:true,status:'completed'};
    }
    if(['failed','cancelled','pending'].includes(status)){
      await this.db.rpc('nova_reconcile_paydunya_state',{p_payment_id:tx.id,p_provider_token:token,p_provider_status:status,p_provider_payload:data});
      return {ok:true,status};
    }
    return {ok:true,status:'ignored'};
  }

  private verifyHash(received:string){
    const expected=createHash('sha512').update(externalApis.paydunya.masterKey,'utf8').digest('hex');
    const a=Buffer.from(received,'utf8'),b=Buffer.from(expected,'utf8');
    return a.length===b.length&&timingSafeEqual(a,b);
  }
}
