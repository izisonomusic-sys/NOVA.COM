import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';
import { PlatformEventsService } from './events/events.service';
import { PLATFORM_EVENTS } from './events/platform-events';

@Injectable()
export class InvestmentsService {
  constructor(private p: PrismaService, private events: PlatformEventsService) {}
  list(uid: string) {
    return this.p.investment.findMany({ where: { userId: uid }, include: { project: true }, orderBy: { investedAt: 'desc' } });
  }
  async invest(uid: string, pid: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Montant invalide');
    return this.p.$transaction(async tx => {
      const project = await tx.project.findUnique({ where: { id: pid } });
      const wallet = await tx.wallet.findUnique({ where: { userId: uid } });
      if (!project || !['PUBLISHED', 'FUNDING'].includes(project.status)) throw new BadRequestException('Projet indisponible');
      if (!wallet || Number(wallet.balance) < amount) throw new BadRequestException('Solde insuffisant');
      if (amount < Number(project.minInvestment)) throw new BadRequestException(`Minimum d'investissement : ${Number(project.minInvestment).toLocaleString('fr-FR')} XOF`);
      if (Number(project.raisedAmount) + amount > Number(project.targetAmount)) throw new BadRequestException('Objectif dépassé');
      // nova.com business rule: every new investment uses a fixed 17% DAILY return.
      // The project duration is the source of truth for the number of paid days.
      const durationDays = Number(project.durationDays);
      const dailyProfit = Number((amount * 17 / 100).toFixed(2));
      const profit = Number((dailyProfit * durationDays).toFixed(2));
      const maturity = new Date(Date.now() + durationDays * 86400000);
      const investment = await tx.investment.create({ data: { userId: uid, projectId: pid, amount, expectedProfit: profit, dailyProfit, durationDays, paidDays: 0, maturityAt: maturity } });
      const newBalance = Number(wallet.balance) - amount;
      await tx.wallet.update({ where: { userId: uid }, data: { balance: { decrement: amount } } });
      const raised = Number(project.raisedAmount) + amount;
      await tx.project.update({ where: { id: pid }, data: { raisedAmount: { increment: amount }, status: raised >= Number(project.targetAmount) ? 'FUNDED' : 'FUNDING' } });
      await tx.transaction.create({ data: { userId: uid, type: 'INVESTMENT', amount, balanceAfter: newBalance, reference: 'INV-' + randomUUID(), metadata: { investmentId: investment.id, projectId: pid } } });
      await tx.notification.create({ data: { userId: uid, title: 'Investissement confirmé', message: `Votre investissement de ${amount} XOF dans ${project.title} est confirmé.` } });
      const referral = await tx.referral.findUnique({ where: { referredUserId: uid } });
      if (referral && !referral.rewardPaid) {
        const setting = await tx.setting.findUnique({ where: { key: 'referral_investment_pct' } });
        const legacySetting = setting ? null : await tx.setting.findUnique({ where: { key: 'referral_reward_pct' } });
        const pct = Number(setting?.value ?? legacySetting?.value ?? 0);
        const reward = amount * pct / 100;
        const refWallet = await tx.wallet.findUnique({ where: { userId: referral.referrerId } });
        if (refWallet) {
          const referralBalance = Number(refWallet.balance) + reward;
          await tx.referral.update({ where: { id: referral.id }, data: { rewardAmount: reward, rewardPaid: true, rewardedAt: new Date() } });
          await tx.wallet.update({ where: { userId: referral.referrerId }, data: { balance: { increment: reward } } });
          await tx.transaction.create({ data: { userId: referral.referrerId, type: 'REFERRAL_REWARD', amount: reward, balanceAfter: referralBalance, reference: 'REF-' + randomUUID(), metadata: { sourceUserId: uid, investmentId: investment.id } } });
          await tx.notification.create({ data: { userId: referral.referrerId, title: 'Prime de parrainage', message: `Vous avez reçu ${reward.toFixed(0)} XOF de prime de parrainage.` } });
        }
      }
      this.events.emit(PLATFORM_EVENTS.INVESTMENT_CREATED, { userId: uid, entityId: investment.id, amount, metadata: { projectId: pid, durationDays, dailyProfit } });
      return investment;
    });
  }
}
