import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { createClient } from '@supabase/supabase-js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  private supabase: any;
  constructor(private p: PrismaService) {
    const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (u && k) this.supabase = createClient(u, k);
  }

  @Get()
  async get(@Req() q: any) {
    const [user, invested, deposits, withdrawals, profits] = await Promise.all([
      this.p.user.findUnique({
        where: { id: q.user.sub },
        select: { id: true, email: true, fullName: true, phone: true, referralCode: true, role: true, isActive: true, createdAt: true, wallet: { select: { balance: true, lockedBalance: true } } },
      }),
      this.p.investment.aggregate({ _sum: { amount: true }, where: { userId: q.user.sub } }),
      this.p.deposit.aggregate({ _sum: { amount: true }, where: { userId: q.user.sub, status: 'CONFIRMED' } }),
      this.p.withdrawal.aggregate({ _sum: { amount: true }, where: { userId: q.user.sub, status: 'COMPLETED' } }),
      this.p.transaction.aggregate({ _sum: { amount: true }, where: { userId: q.user.sub, type: { in: ['PROFIT', 'REFERRAL_REWARD'] } } }),
    ]);
    return {
      ...user,
      stats: {
        invested: invested._sum.amount || 0,
        deposited: deposits._sum.amount || 0,
        withdrawn: withdrawals._sum.amount || 0,
        earningsReceived: profits._sum.amount || 0,
      },
    };
  }

  @Patch()
  async update(@Req() q: any, @Body() b: any) {
    const data: any = {};
    if (typeof b.fullName === 'string') data.fullName = b.fullName.trim();
    if (typeof b.phone === 'string') data.phone = b.phone.trim();
    const out = await this.p.user.update({ where: { id: q.user.sub }, data, select: { id: true, email: true, fullName: true, phone: true, referralCode: true, role: true } });
    if (b.password) {
      if (String(b.password).length < 8) throw new BadRequestException('Mot de passe trop court');
      const h = q.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : '';
      if (!this.supabase || !token) throw new BadRequestException('Session Supabase invalide');
      const u = process.env.SUPABASE_URL;
      const k = process.env.SUPABASE_PUBLISHABLE_KEY;

      if (!u || !k) {
        throw new BadRequestException('Configuration Supabase manquante');
      }

      const c = createClient(u, k, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      const { error } = await c.auth.updateUser({ password: String(b.password) });
      if (error) throw new BadRequestException(error.message);
    }
    return out;
  }
}
