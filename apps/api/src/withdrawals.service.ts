import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PayDunyaPaymentProvider } from './payments/paydunya.provider';
import { SupabaseFinanceService } from './supabase-finance.service';

@Injectable()
export class WithdrawalsService {
  constructor(private s:PayDunyaPaymentProvider, private db:SupabaseFinanceService) {}

  async list(uid:string){
    const {data,error}=await this.db.db.from('withdrawal_requests').select('*').eq('user_id',uid).order('created_at',{ascending:false});
    if(error) throw new BadRequestException(error.message);
    return data||[];
  }

  async request(uid:string,amount:number,countryCode:string,operator:string,phone:string,accountName:string){
    if(!Number.isFinite(amount)||amount<1000) throw new BadRequestException('Le retrait minimum est de 1 000 XOF.');
    if(!countryCode||!operator||!phone||!accountName) throw new BadRequestException('Pays, opérateur, téléphone et nom du titulaire sont obligatoires.');
    const {count}=await this.db.db.from('investments').select('id',{count:'exact',head:true}).eq('user_id',uid);
    if(!count) throw new BadRequestException('Vous devez investir dans au moins un projet avant de demander un retrait.');
    const withdrawalId=await this.db.rpc<string>('nova_request_withdrawal',{
      p_user_id:uid,p_amount:Math.round(amount),p_country_code:countryCode,p_operator:operator,p_phone:phone,p_account_name:accountName
    });
    const reference='WD-'+withdrawalId;
    try{
      const r=await this.s.requestWithdrawal({amount,destination:phone,reference,operator});
      await this.db.rpc('nova_set_withdrawal_processing',{p_withdrawal_id:withdrawalId,p_provider_token:r.providerRef,p_provider_payload:r.providerResponse||{status:r.status,withdraw_mode:r.withdrawMode}});
      const status=String(r.status||'pending').toLowerCase();
      if(status==='success'){
        await this.db.rpc('nova_finalize_withdrawal_success',{p_withdrawal_id:withdrawalId,p_provider_token:r.providerRef,p_provider_payload:r.providerResponse||{}});
      }else if(status==='failed'){
        await this.db.rpc('nova_finalize_withdrawal_failure',{p_withdrawal_id:withdrawalId,p_provider_token:r.providerRef,p_provider_payload:r.providerResponse||{},p_failure_reason:'PayDunya a refusé le déboursement.'});
      }
      const {data}=await this.db.db.from('withdrawal_requests').select('*').eq('id',withdrawalId).single();
      return data;
    }catch(e){
      await this.db.rpc('nova_finalize_withdrawal_failure',{p_withdrawal_id:withdrawalId,p_provider_token:'',p_provider_payload:{error:String(e)},p_failure_reason:String(e)});
      throw e;
    }
  }

  async webhook(rawBody:any){
    const body=rawBody?.data&&typeof rawBody.data==='string'?{...rawBody,data:JSON.parse(rawBody.data)}:rawBody;
    const data=body?.data||body;
    if(!data||typeof data!=='object') throw new BadRequestException('Payload PayDunya invalide');
    const token=String(data?.token||data?.disburse_token||'').trim();
    const status=String(data?.status||'pending').toLowerCase();
    if(!token) throw new BadRequestException('Token de déboursement manquant');
    const {data:wr,error}=await this.db.db.from('withdrawal_requests').select('*').eq('provider_token',token).maybeSingle();
    if(error||!wr) throw new BadRequestException('Retrait PayDunya introuvable');
    if(status==='success'){
      await this.db.rpc('nova_finalize_withdrawal_success',{p_withdrawal_id:wr.id,p_provider_token:token,p_provider_payload:data});
    }else if(status==='failed'){
      await this.db.rpc('nova_finalize_withdrawal_failure',{p_withdrawal_id:wr.id,p_provider_token:token,p_provider_payload:data,p_failure_reason:String(data.response_text||'PayDunya a échoué le déboursement.')});
    }else{
      await this.db.rpc('nova_set_withdrawal_processing',{p_withdrawal_id:wr.id,p_provider_token:token,p_provider_payload:data});
    }
    return {ok:true,status};
  }
}
