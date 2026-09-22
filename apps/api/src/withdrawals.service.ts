import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PayDunyaPaymentProvider } from './payments/paydunya.provider';
import { randomUUID } from 'crypto';
import { PlatformEventsService } from './events/events.service';
import { PLATFORM_EVENTS } from './events/platform-events';

@Injectable()
export class WithdrawalsService {
  constructor(private p: PrismaService, private s: PayDunyaPaymentProvider, private events: PlatformEventsService) {}
  list(uid: string) { return this.p.withdrawal.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' } }); }
  async request(uid: string, amount: number, destination: string) {
    if (!Number.isFinite(amount) || amount <= 0 || !destination) throw new BadRequestException('Retrait invalide');
    const hasInvestment = await this.p.investment.findFirst({ where: { userId: uid } });
    if (!hasInvestment) throw new BadRequestException('Vous devez investir dans au moins un projet avant de demander un retrait.');
    const setting = await this.p.setting.findUnique({ where: { key: 'minimum_withdrawal' } });
    const minimum = Number(setting?.value ?? 1000);
    if (amount < minimum) throw new BadRequestException(`Retrait minimum : ${minimum.toLocaleString('fr-FR')} XOF`);
    const reference = 'WD-' + randomUUID();
    const wd = await this.p.$transaction(async tx => {
      const changed = await tx.wallet.updateMany({ where: { userId: uid, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
      if (changed.count !== 1) throw new BadRequestException('Solde insuffisant');
      const row = await tx.withdrawal.create({ data: { userId: uid, amount, destination: typeof destination === 'string' ? { value: destination } : destination, provider: 'paydunya' } });
      const w = await tx.wallet.findUnique({ where: { userId: uid } });
      await tx.transaction.create({ data: { userId: uid, type: 'WITHDRAWAL', amount, balanceAfter: w?.balance, reference: 'WD-TX-' + randomUUID(), metadata: { withdrawalId: row.id, status: 'PENDING', provider: 'paydunya' } } });
      return row;
    });
    try {
      const r = await this.s.requestWithdrawal({ amount, destination: typeof destination === 'string' ? destination : String((destination as any)?.phone || ''), reference, userId: uid });
      const normalizedStatus = String(r.status || 'pending').toLowerCase();
      if (normalizedStatus === 'failed') {
        await this.p.$transaction(async tx => {
          await tx.withdrawal.update({ where: { id: wd.id }, data: { providerReference: r.providerRef, status: 'REJECTED', processedAt: new Date(), metadata: { provider: 'paydunya', disburseToken: r.disburseToken, providerResponse: r.providerResponse } } });
          const w = await tx.wallet.update({ where: { userId: uid }, data: { balance: { increment: amount } } });
          await tx.transaction.create({ data: { userId: uid, type: 'REFUND', amount, balanceAfter: w.balance, reference: 'WD-REFUND-' + wd.id, metadata: { withdrawalId: wd.id, provider: 'paydunya', reason: 'failed' } } });
          await tx.notification.create({ data: { userId: uid, title: 'Retrait échoué', message: 'Votre demande de retrait PayDunya a échoué et le montant a été recrédité.' } });
        });
        return this.p.withdrawal.findUnique({ where: { id: wd.id } });
      }
      const out = await this.p.withdrawal.update({ where: { id: wd.id }, data: { providerReference: r.providerRef, status: normalizedStatus === 'success' ? 'COMPLETED' : 'PROCESSING', metadata: { provider: 'paydunya', disburseToken: r.disburseToken, providerResponse: r.providerResponse } } });
      this.events.emit(PLATFORM_EVENTS.WITHDRAWAL_CREATED, { userId: uid, entityId: wd.id, amount, metadata: { provider: 'paydunya', providerReference: r.providerRef, status: r.status } });
      return out;
    } catch (e) {
      await this.p.$transaction(async tx => {
        await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'REJECTED', processedAt: new Date() } });
        await tx.wallet.update({ where: { userId: uid }, data: { balance: { increment: amount } } });
        await tx.notification.create({ data: { userId: uid, title: 'Retrait échoué', message: 'Votre demande de retrait a échoué et le montant a été recrédité.' } });
      });
      throw e;
    }
  }
}
