import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(private p: PrismaService) {}
  private ok(u:any) { if (u?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Fondateur uniquement'); }
  events(u:any) { this.ok(u); return this.p.auditLog.findMany({ where:{ action:{ in:['user.registered','deposit.created','deposit.confirmed','investment.created','investment.daily_return_credited','investment.matured','withdrawal.created','withdrawal.completed','withdrawal.rejected','referral.rewarded'] } }, orderBy:{createdAt:'desc'}, take:200 }); }
  async stats() {
    const [users, projects, activeInvestments, deposits, withdrawals, wallets] = await Promise.all([
      this.p.user.count(), this.p.project.count(), this.p.investment.count({ where: { status: 'ACTIVE' } }),
      this.p.deposit.aggregate({ _sum: { amount: true }, where: { status: 'CONFIRMED' } }),
      this.p.withdrawal.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      this.p.wallet.aggregate({ _sum: { balance: true } })
    ]);
    return { users, projects, activeInvestments, deposited: deposits._sum.amount || 0, withdrawn: withdrawals._sum.amount || 0, totalWalletBalance: wallets._sum.balance || 0 };
  }
  users(u:any) { this.ok(u); return this.p.user.findMany({ select: { id:true,email:true,fullName:true,phone:true,role:true,isActive:true,createdAt:true,referralCode:true }, orderBy: { createdAt:'desc' } }); }
  async setUserActive(u:any,id:string,isActive:boolean) { this.ok(u); return this.p.user.update({ where:{id}, data:{isActive} }); }
  withdrawals(u:any) { this.ok(u); return this.p.withdrawal.findMany({ include:{user:{select:{email:true,fullName:true,phone:true}}}, orderBy:{createdAt:'desc'} }); }
  deposits(u:any) { this.ok(u); return this.p.deposit.findMany({ include:{user:{select:{email:true,fullName:true}}}, orderBy:{createdAt:'desc'} }); }
  projects(u:any) { this.ok(u); return this.p.project.findMany({ include:{_count:{select:{investments:true}}}, orderBy:{createdAt:'desc'} }); }
  async processWithdrawal(u:any,id:string,success:boolean) {
    this.ok(u);
    const wd = await this.p.withdrawal.findUnique({ where:{id} });
    if (!wd || wd.status !== 'PENDING') throw new NotFoundException('Retrait introuvable ou déjà traité');
    return this.p.$transaction(async tx => {
      if (success) {
        await tx.withdrawal.update({ where:{id}, data:{status:'COMPLETED',processedAt:new Date()} });
        await tx.notification.create({ data:{userId:wd.userId,title:'Retrait traité',message:`Votre retrait de ${wd.amount} XOF a été traité.`} });
      } else {
        await tx.withdrawal.update({ where:{id}, data:{status:'REJECTED',processedAt:new Date()} });
        const w = await tx.wallet.findUnique({ where:{userId:wd.userId} });
        const next = Number(w?.balance || 0) + Number(wd.amount);
        await tx.wallet.update({ where:{userId:wd.userId}, data:{balance:{increment:wd.amount}} });
        await tx.transaction.create({ data:{userId:wd.userId,type:'ADMIN_ADJUSTMENT',amount:wd.amount,balanceAfter:next,reference:'REFUND-'+randomUUID(),metadata:{withdrawalId:wd.id,direction:'credit'}} });
        await tx.notification.create({ data:{userId:wd.userId,title:'Retrait refusé',message:`Votre demande de retrait de ${wd.amount} XOF a été refusée et le montant a été recrédité.`} });
      }
      return {ok:true};
    });
  }
  async adjustWallet(u:any,id:string,amount:number,description:string) {
    this.ok(u); if (!Number.isFinite(amount) || amount===0) throw new Error('Montant invalide');
    const w = await this.p.wallet.findUnique({ where:{userId:id} }); if (!w) throw new NotFoundException('Portefeuille introuvable');
    const next = Number(w.balance)+amount; if (next<0) throw new Error('Solde négatif interdit');
    return this.p.$transaction(async tx => {
      await tx.wallet.update({ where:{userId:id}, data:{balance:{increment:amount}} });
      return tx.transaction.create({ data:{userId:id,type:'ADMIN_ADJUSTMENT',amount:Math.abs(amount),balanceAfter:next,reference:'ADJ-'+randomUUID(),metadata:{direction:amount>0?'credit':'debit',description}} });
    });
  }
}
