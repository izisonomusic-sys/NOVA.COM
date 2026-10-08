import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { externalApis } from '../config-external-apis';

const DEPOSIT_CHANNELS: Record<string,string> = {
  card: 'card',
  t_money_togo: 't-money-togo',
  moov_togo: 'moov-togo',
  mtn_benin: 'mtn-benin',
  moov_benin: 'moov-benin',
  celtiis_cash: 'celtiis-cash',
  mtn_ci: 'mtn-ci',
  orange_money_ci: 'orange-money-ci',
  moov_ci: 'moov-ci',
  wave_ci: 'wave-ci',
  djamo_ci: 'djamo-ci',
  orange_money_burkina: 'orange-money-burkina',
  moov_burkina: 'moov-burkina-faso',
  orange_money_mali: 'orange-money-mali',
  moov_mali: 'moov-mali',
  orange_money_senegal: 'orange-money-senegal',
  free_money_senegal: 'free-money-senegal',
  expresso_senegal: 'expresso-senegal',
  wave_senegal: 'wave-senegal',
  djamo_senegal: 'djamo-sn',
  mtn_cameroun: 'mtn-cameroun',
};

const WITHDRAW_MODES = new Set([
  'paydunya','orange-money-senegal','free-money-senegal','expresso-senegal','wave-senegal',
  'mtn-benin','moov-benin','celtiis-cash','mtn-ci','orange-money-ci','moov-ci','wave-ci',
  't-money-togo','moov-togo','orange-money-mali','orange-money-burkina','moov-burkina-faso',
  'mtn-cameroun','djamo-ci','djamo-sn',
]);

@Injectable()
export class PayDunyaPaymentProvider {
  private get mode() { return externalApis.paydunya.mode; }
  private get baseUrl() {
    if (externalApis.paydunya.baseUrl) return externalApis.paydunya.baseUrl.replace(/\/$/, '');
    return this.mode === 'sandbox' ? 'https://app.paydunya.com/sandbox-api' : 'https://app.paydunya.com/api';
  }
  private headers() {
    const h: Record<string,string> = { 'Content-Type':'application/json' };
    if (externalApis.paydunya.masterKey) h['PAYDUNYA-MASTER-KEY']=externalApis.paydunya.masterKey;
    if (externalApis.paydunya.privateKey) h['PAYDUNYA-PRIVATE-KEY']=externalApis.paydunya.privateKey;
    if (externalApis.paydunya.token) h['PAYDUNYA-TOKEN']=externalApis.paydunya.token;
    return h;
  }
  private async request(path:string, init:RequestInit={}) {
    const response=await fetch(`${this.baseUrl}${path}`,{...init,headers:{...this.headers(),...(init.headers||{})}});
    const text=await response.text(); let data:any;
    try{data=JSON.parse(text)}catch{data={raw:text}};
    if(!response.ok) throw new Error(`PayDunya ${response.status}: ${text}`);
    if(data?.response_code && String(data.response_code)!=='00') throw new Error(`PayDunya ${data.response_code}: ${data.response_text||'Erreur API'}`);
    return data;
  }

  async createDeposit(input:{userId:string;amount:number;reference:string;operator:string;customer?:{name?:string;phone?:string;email?:string}}) {
    if(this.mode==='mock') return {providerRef:`MOCK-PAYDUNYA-${randomUUID()}`,checkoutUrl:`${externalApis.app.frontendUrl}/payment/mock?ref=${encodeURIComponent(input.reference)}`,status:'pending'};
    const channel=DEPOSIT_CHANNELS[input.operator] || input.operator;
    if(!channel || !Object.values(DEPOSIT_CHANNELS).includes(channel)) throw new Error('Moyen de dépôt PayDunya non pris en charge.');
    const payload={
      invoice:{
        total_amount:Math.round(input.amount),
        description:`Dépôt nova.com ${input.reference}`,
        customer:input.customer||{},
        channels:[channel],
      },
      store:{name:externalApis.paydunya.storeName,tagline:externalApis.paydunya.storeTagline,website_url:externalApis.paydunya.storeWebsiteUrl||externalApis.app.frontendUrl},
      custom_data:{user_id:input.userId,client_reference:input.reference,operator:input.operator},
      actions:{callback_url:externalApis.paydunya.callbackUrl,return_url:externalApis.paydunya.returnUrl,cancel_url:externalApis.paydunya.cancelUrl},
    };
    const data=await this.request('/v1/checkout-invoice/create',{method:'POST',body:JSON.stringify(payload)});
    if(!data.token||!data.response_text) throw new Error('Réponse PayDunya incomplète: token/checkout URL manquant');
    return {providerRef:data.token,checkoutUrl:data.response_text,status:'pending',providerResponse:data,channel};
  }

  async requestWithdrawal(input:{amount:number;destination:string;reference:string;operator:string}) {
    if(this.mode==='mock') return {providerRef:`MOCK-PAYDUNYA-WD-${randomUUID()}`,status:'pending'};
    const withdrawMode=input.operator;
    if(!WITHDRAW_MODES.has(withdrawMode)) throw new Error('Opérateur de retrait PayDunya non pris en charge.');
    const alias=String(input.destination).replace(/\D/g,'');
    if(!alias) throw new Error('Numéro bénéficiaire PayDunya invalide.');
    const createPayload:Record<string,unknown>={account_alias:alias,amount:Math.round(input.amount),withdraw_mode:withdrawMode,callback_url:externalApis.paydunya.callbackUrl};
    if(externalApis.paydunya.debitAccountNumber && withdrawMode==='paydunya') createPayload.debit_account_number=externalApis.paydunya.debitAccountNumber;
    const created=await this.request('/v2/disburse/get-invoice',{method:'POST',body:JSON.stringify(createPayload)});
    const token=created.disburse_token;
    if(!token) throw new Error('Réponse PayDunya incomplète: disburse_token manquant');
    const submitted=await this.request('/v2/disburse/submit-invoice',{method:'POST',body:JSON.stringify({disburse_invoice:token,disburse_id:input.reference})});
    const status=String(submitted.status||'pending').toLowerCase();
    return {providerRef:token,status,disburseToken:token,providerResponse:submitted,withdrawMode};
  }

  async checkWithdrawal(disburseToken:string) {
    return this.request('/v2/disburse/check-status',{method:'POST',body:JSON.stringify({disburse_invoice:disburseToken})});
  }
}
