import { PrismaClient, Role, ProjectStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
const p = new PrismaClient();
async function main() {
  const phone = String(process.env.ADMIN_PHONE || '+22871432514').trim().replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('ADMIN_PHONE doit être au format international, par exemple +228XXXXXXXX.');
  const email = process.env.ADMIN_EMAIL || `phone-${createHash('sha256').update(phone).digest('hex').slice(0,32)}@auth.nova.local`;
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis pour créer le fondateur.');
  const admin = createClient(url, key);
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  let authUser = existing.data.users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.user_metadata?.phone === phone);
  if (!authUser) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Founder', phone } });
    if (created.error || !created.data.user) throw created.error || new Error('Impossible de créer le fondateur');
    authUser = created.data.user;
  }
  await p.user.upsert({ where: { id: authUser.id }, update: { email, phone, fullName: 'Founder', role: Role.SUPER_ADMIN, isActive: true }, create: { id: authUser.id, email, phone, fullName: 'Founder', referralCode: 'FOUNDER', role: Role.SUPER_ADMIN } });
  await p.wallet.upsert({ where: { userId: authUser.id }, update: {}, create: { userId: authUser.id } });
  await p.setting.upsert({ where: { key: 'referral_investment_pct' }, update: { value: 1 }, create: { key: 'referral_investment_pct', value: 1 } });
  await p.project.upsert({ where: { slug: 'solar-demo' }, update: {}, create: { title: 'Projet solaire démonstration', slug: 'solar-demo', category: 'RENEWABLE_ENERGY', description: 'Projet de démonstration à remplacer.', targetAmount: 10000000, minInvestment: 10000, expectedReturnPct: 12, durationDays: 180, status: ProjectStatus.PUBLISHED, publishedAt: new Date(), startsAt: new Date() } });
  console.log(`Founder ready: ${email}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
