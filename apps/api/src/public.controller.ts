import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('public')
export class PublicController {
  constructor(private readonly p: PrismaService) {}

  @Get('health')
  async health() {
    let database = false;
    try { await this.p.$queryRawUnsafe('SELECT 1'); database = true; } catch {}
    return {
      ok: database,
      service: 'nova-api',
      time: new Date().toISOString(),
      configuration: {
        supabaseUrl: Boolean(process.env.SUPABASE_URL),
        supabasePublishableKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
        supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
        databaseUrl: Boolean(process.env.DATABASE_URL),
        frontendUrl: Boolean(process.env.FRONTEND_URL),
      },
      database,
    };
  }

  @Get('stats')
  async stats() {
    const [users, projects, investments, raised] = await Promise.all([
      this.p.user.count(),
      this.p.project.count({ where: { status: { in: ['PUBLISHED', 'FUNDING', 'FUNDED', 'ACTIVE'] } } }),
      this.p.investment.count(),
      this.p.project.aggregate({ _sum: { raisedAmount: true } }),
    ]);
    return { users, projects, investments, raisedAmount: raised._sum.raisedAmount || 0 };
  }
}
