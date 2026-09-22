import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { externalApis } from '../config-external-apis';

@Injectable()
export class PayDunyaPaymentProvider {
  private get mode() { return externalApis.paydunya.mode; }

  private get baseUrl() {
    if (externalApis.paydunya.baseUrl) return externalApis.paydunya.baseUrl.replace(/\/$/, '');
    return this.mode === 'sandbox'
      ? 'https://app.paydunya.com/sandbox-api'
      : 'https://app.paydunya.com/api';
  }

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (externalApis.paydunya.masterKey) h['PAYDUNYA-MASTER-KEY'] = externalApis.paydunya.masterKey;
    if (externalApis.paydunya.privateKey) h['PAYDUNYA-PRIVATE-KEY'] = externalApis.paydunya.privateKey;
    if (externalApis.paydunya.token) h['PAYDUNYA-TOKEN'] = externalApis.paydunya.token;
    return h;
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init.headers || {}) },
    });
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(`PayDunya ${response.status}: ${text}`);
    if (data?.response_code && String(data.response_code) !== '00') {
      throw new Error(`PayDunya ${data.response_code}: ${data.response_text || 'Erreur API'}`);
    }
    return data;
  }

  async createDeposit(input: { userId: string; amount: number; reference: string; method?: string; customer?: { name?: string; phone?: string; email?: string } }) {
    if (this.mode === 'mock') {
      return {
        providerRef: `MOCK-PAYDUNYA-${randomUUID()}`,
        checkoutUrl: `${externalApis.app.frontendUrl}/payment/mock?ref=${encodeURIComponent(input.reference)}`,
        status: 'pending',
      };
    }

    const payload = {
      invoice: {
        total_amount: Math.round(input.amount),
        description: `Dépôt nova.com ${input.reference}`,
        customer: input.customer || {},
        ...(input.method === 'tmoney' ? { channels: ['t-money-togo'] } : {}),
      },
      store: {
        name: externalApis.paydunya.storeName,
        tagline: externalApis.paydunya.storeTagline,
        website_url: externalApis.paydunya.storeWebsiteUrl || externalApis.app.frontendUrl,
      },
      custom_data: {
        user_id: input.userId,
        client_reference: input.reference,
      },
      actions: {
        callback_url: externalApis.paydunya.callbackUrl,
        return_url: externalApis.paydunya.returnUrl,
        cancel_url: externalApis.paydunya.cancelUrl,
      },
    };

    const data = await this.request('/v1/checkout-invoice/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const checkoutUrl = data.response_text;
    const providerRef = data.token;
    if (!providerRef || !checkoutUrl) throw new Error('Réponse PayDunya incomplète: token/checkout URL manquant');
    return { providerRef, checkoutUrl, status: 'pending', providerResponse: data };
  }

  async requestWithdrawal(input: { amount: number; destination: string; reference: string; userId: string }) {
    if (this.mode === 'mock') return { providerRef: `MOCK-PAYDUNYA-WD-${randomUUID()}`, status: 'pending' };

    const alias = String(input.destination).replace(/[^0-9A-Za-z]/g, '');
    if (!alias) throw new Error('Destination PayDunya invalide');

    const createPayload: Record<string, unknown> = {
      account_alias: alias,
      amount: Math.round(input.amount),
      withdraw_mode: externalApis.paydunya.withdrawMode,
      callback_url: externalApis.paydunya.callbackUrl,
    };
    if (externalApis.paydunya.debitAccountNumber) createPayload.debit_account_number = externalApis.paydunya.debitAccountNumber;

    const created = await this.request('/v2/disburse/get-invoice', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });
    const token = created.disburse_token;
    if (!token) throw new Error('Réponse PayDunya incomplète: disburse_token manquant');

    const submitted = await this.request('/v2/disburse/submit-invoice', {
      method: 'POST',
      body: JSON.stringify({ disburse_invoice: token, disburse_id: input.reference }),
    });

    const status = String(submitted.status || (String(submitted.response_code) === '00' ? 'success' : 'pending')).toLowerCase();
    const providerRef = token;
    return { providerRef, status, disburseToken: token, providerResponse: submitted };
  }
}
