import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual, randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import { PayDunyaPaymentProvider } from './payments/paydunya.provider';
import { PlatformEventsService } from './events/events.service';
import { PLATFORM_EVENTS } from './events/platform-events';
import { externalApis } from './config-external-apis';

@Injectable()
export class PaymentsService {
  constructor(private p: PrismaService, private s: PayDunyaPaymentProvider, private events: PlatformEventsService) {}

  async deposit(uid: string, amount: number, method = 'paydunya') {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Montant invalide');
    const setting = await this.p.setting.findUnique({ where: { key: 'minimum_deposit' } });
    const minimum = Number(setting?.value ?? 1000);
    if (amount < minimum) throw new BadRequestException(`Dépôt minimum : ${minimum.toLocaleString('fr-FR')} XOF`);
    const ref = 'DEP-' + randomUUID();
    const profile = await this.p.user.findUnique({ where: { id: uid }, select: { fullName: true, phone: true, email: true } });
    const d = await this.p.deposit.create({ data: { userId: uid, amount, provider: 'paydunya', metadata: { clientReference: ref, method } } });
    try {
      const r = await this.s.createDeposit({
        userId: uid,
        amount,
        reference: ref,
        method,
        customer: { name: profile?.fullName || undefined, phone: profile?.phone || undefined, email: profile?.email || undefined },
      });
      const out = await this.p.deposit.update({ where: { id: d.id }, data: { providerReference: r.providerRef, metadata: { clientReference: ref, method, providerResponse: r } } });
      this.events.emit(PLATFORM_EVENTS.DEPOSIT_CREATED, { userId: uid, entityId: d.id, amount, metadata: { provider: 'paydunya', method, providerReference: r.providerRef } });
      return { ...out, checkoutUrl: r.checkoutUrl };
    } catch (e) {
      await this.p.deposit.update({ where: { id: d.id }, data: { status: 'FAILED' } });
      throw e;
    }
  }

  async mockConfirm(uid: string, providerReference: string) {
    if (externalApis.paydunya.mode !== 'mock') throw new BadRequestException('Mode mock uniquement');
    const d = await this.p.deposit.findFirst({ where: { userId: uid, providerReference } });
    if (!d) throw new BadRequestException('Dépôt mock introuvable');
    const result = await this.p.$queryRaw`select public.process_paydunya_webhook(${providerReference},'completed',CAST(${JSON.stringify({ token: providerReference, status: 'completed', mock: true })} AS jsonb)) as result`;
    return (result as any)[0]?.result || { ok: true };
  }

  async webhook(rawBody: any) {
    const body = this.normalizePayDunyaBody(rawBody);
    const data = body?.data || body;
    if (!data || typeof data !== 'object') throw new BadRequestException('Payload PayDunya invalide');

    if (externalApis.paydunya.masterKey && !this.verifyHash(String(data.hash || ''))) {
      throw new UnauthorizedException('Webhook PayDunya non authentifié');
    }

    const ref = data?.invoice?.token || data?.token || data?.provider_reference || data?.reference || data?.transaction_id;
    if (!ref) throw new BadRequestException('Référence PayDunya manquante');
    const status = String(data?.status || data?.payment_status || 'pending').toLowerCase();
    const result = await this.p.$queryRaw`select public.process_paydunya_webhook(${String(ref)},${status},CAST(${JSON.stringify(data)} AS jsonb)) as result`;
    return (result as any)[0]?.result || { ok: true };
  }

  private normalizePayDunyaBody(body: any) {
    if (!body) return body;
    if (typeof body.data === 'string') {
      try { return { ...body, data: JSON.parse(body.data) }; } catch { return body; }
    }
    return body;
  }

  private verifyHash(received: string) {
    const expected = createHash('sha512').update(externalApis.paydunya.masterKey, 'utf8').digest('hex');
    const a = Buffer.from(received, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
