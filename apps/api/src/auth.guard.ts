import {CanActivate,ExecutionContext,Injectable,UnauthorizedException} from '@nestjs/common';
import {createClient} from '@supabase/supabase-js';
import {PrismaService} from './prisma.service';
@Injectable()
export class JwtAuthGuard implements CanActivate{
  private supabase:any;
  constructor(private p:PrismaService){const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_PUBLISHABLE_KEY;if(u&&k)this.supabase=createClient(u,k)}
  async canActivate(ctx:ExecutionContext){
    if(!this.supabase)throw new UnauthorizedException('Supabase Auth non configuré');
    const req=ctx.switchToHttp().getRequest();const h=req.headers.authorization||'';const token=h.startsWith('Bearer ')?h.slice(7):'';
    if(!token)throw new UnauthorizedException('Token manquant');
    const {data,error}=await this.supabase.auth.getUser(token);if(error||!data.user)throw new UnauthorizedException('Session invalide');
    const profile=await this.p.user.findUnique({where:{id:data.user.id}});if(!profile||!profile.isActive)throw new UnauthorizedException('Compte inactif');
    req.user={sub:profile.id,email:profile.email,role:profile.role,profile};return true;
  }
}
