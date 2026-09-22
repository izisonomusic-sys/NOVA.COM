import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { PlatformEventsService } from './events/events.service';
import { PLATFORM_EVENTS } from './events/platform-events';

@Injectable()
export class AuthService {
  private supabase:any;
  private admin:any;
  private readonly logger = new Logger(AuthService.name);
  constructor(private p:PrismaService, private events:PlatformEventsService){
    const url=process.env.SUPABASE_URL;
    const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
    const secretKey=process.env.SUPABASE_SECRET_KEY;
    if(url&&publishableKey)this.supabase=createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false}});
    if(url&&secretKey)this.admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false}});
  }
  private client(){if(!this.supabase)throw new BadRequestException('Configuration serveur incomplète : SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY manque dans apps/api/.env.');return this.supabase}
  private adminClient(){if(!this.admin)throw new BadRequestException('Configuration serveur incomplète : SUPABASE_SECRET_KEY manque dans apps/api/.env.');return this.admin}
  private normalizePhone(phone:string){
    const value=String(phone||'').trim().replace(/[\s()-]/g,'');
    if(!/^\+[1-9]\d{7,14}$/.test(value)) throw new BadRequestException('Numéro de téléphone invalide. Utilisez le format international, par exemple +228XXXXXXXX.');
    return value;
  }
  /** Internal, non-deliverable email alias used only as the Supabase Auth identifier. The user never needs to know it. */
  private authAlias(phone:string){
    const hash=createHash('sha256').update(phone).digest('hex').slice(0,32);
    return `phone-${hash}@auth.nova.local`;
  }
  async register(phone:string,password:string,confirmPassword:string,firstName?:string,lastName?:string,referredBy?:string){
    if(password!==confirmPassword) throw new BadRequestException('Les mots de passe ne correspondent pas');
    if(password.length<8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
    const normalizedPhone=this.normalizePhone(phone);

    let existing:{id:string}|null;
    try {
      existing=await this.p.user.findFirst({where:{phone:normalizedPhone},select:{id:true}});
    } catch (e:any) {
      this.logger.error(`DB error while checking existing phone: ${e?.message||e}`, e?.stack);
      throw new BadRequestException('Impossible de contacter la base de données. Vérifiez DATABASE_URL/DIRECT_URL et que Postgres est joignable.');
    }
    if(existing) throw new BadRequestException('Un compte existe déjà avec ce numéro de téléphone');

    const fullName=[firstName,lastName].filter(Boolean).join(' ').trim();

    let ref:{id:string}|null=null;
    if(referredBy){
      try { ref=await this.p.user.findUnique({where:{referralCode:referredBy}}); }
      catch(e:any){ this.logger.error(`DB error while resolving referral code: ${e?.message||e}`, e?.stack); ref=null; }
    }

    const email=this.authAlias(normalizedPhone);

    let data:any, error:any;
    try {
      ({data,error}=await this.adminClient().auth.admin.createUser({
        email,
        password,
        email_confirm:true,
        user_metadata:{full_name:fullName,phone:normalizedPhone},
      }));
    } catch (e:any) {
      this.logger.error(`Supabase Admin API unreachable during createUser: ${e?.message||e}`, e?.stack);
      throw new BadRequestException("Impossible de joindre Supabase Auth. Vérifiez SUPABASE_URL, SUPABASE_SECRET_KEY et la connexion réseau du serveur.");
    }
    if(error) { this.logger.error(`Supabase createUser failed: ${error.message}`); throw new BadRequestException(`Supabase: ${error.message}`); }
    if(!data.user)throw new UnauthorizedException('Création du compte impossible');

    try {
      await this.p.user.update({where:{id:data.user.id},data:{phone:normalizedPhone,email,fullName:fullName||null,referredById:ref?.id||null}});
      // Filet de sécurité applicatif : garantit un wallet même si le trigger SQL handle_new_user()
      // n'en crée pas (cf. migration 20260914120000_v10_auth_hardening.sql qui avait perdu cet insert).
      await this.p.wallet.upsert({where:{userId:data.user.id},update:{},create:{userId:data.user.id}});
      if(ref)await this.p.referral.create({data:{referrerId:ref.id,referredUserId:data.user.id}});
    } catch (e:any) {
      await this.adminClient().auth.admin.deleteUser(data.user.id).catch(()=>{});
      this.logger.error(`Failed to finalize profile for ${data.user.id}: ${e?.message||e}`, e?.stack);
      throw new BadRequestException(e?.message||'Impossible de finaliser le profil');
    }

    let session;
    try {
      session=await this.signInWithAlias(email,password);
    } catch (e:any) {
      this.logger.error(`Auto sign-in after register failed for ${data.user.id}: ${e?.message||e}`, e?.stack);
      if(e instanceof UnauthorizedException || e instanceof BadRequestException) throw e;
      throw new BadRequestException('Compte créé, mais la connexion automatique a échoué. Réessayez de vous connecter.');
    }
    this.events.emit(PLATFORM_EVENTS.USER_REGISTERED, { userId:data.user.id, entityId:data.user.id, metadata:{ phone:normalizedPhone, referredBy:ref?.id || null } });
    return {accessToken:session.access_token,refreshToken:session.refresh_token,userId:data.user.id,phone:normalizedPhone};
  }

  private async signInWithAlias(email:string,password:string){
    const {data,error}=await this.client().auth.signInWithPassword({email,password});
    if(error||!data.user||!data.session)throw new UnauthorizedException(error?.message||'Identifiants invalides');
    return data.session;
  }

  async refresh(refreshToken:string){
    if(!refreshToken)throw new UnauthorizedException('Refresh token manquant');
    const {data,error}=await this.client().auth.refreshSession({refresh_token:refreshToken});
    if(error||!data.session||!data.user)throw new UnauthorizedException('Session expirée');
    const profile=await this.p.user.findUnique({where:{id:data.user.id}});
    if(!profile?.isActive)throw new UnauthorizedException('Compte désactivé');
    return {accessToken:data.session.access_token,refreshToken:data.session.refresh_token,userId:data.user.id};
  }

  async login(phone:string,password:string){
    const normalizedPhone=this.normalizePhone(phone);
    let profile:{id:string,isActive:boolean}|null;
    try {
      profile=await this.p.user.findFirst({where:{phone:normalizedPhone},select:{id:true,isActive:true}});
    } catch (e:any) {
      this.logger.error(`DB error during login lookup: ${e?.message||e}`, e?.stack);
      throw new BadRequestException('Impossible de contacter la base de données. Réessayez dans un instant.');
    }
    if(!profile?.isActive)throw new UnauthorizedException('Identifiants invalides');
    const email=this.authAlias(normalizedPhone);
    const admin=this.adminClient();
    try {
      // Migrate legacy V8 phone-auth accounts to the internal email identifier on first login.
      const existingAuth=await admin.auth.admin.getUserById(profile.id);
      if(!existingAuth.error && existingAuth.data.user && existingAuth.data.user.email!==email){
        const {error}=await admin.auth.admin.updateUserById(profile.id,{email,email_confirm:true,user_metadata:{...(existingAuth.data.user.user_metadata||{}),phone:normalizedPhone}});
        if(error)throw new UnauthorizedException(error.message);
        await this.p.user.update({where:{id:profile.id},data:{email}}).catch(()=>{});
      }
    } catch (e:any) {
      if(e instanceof UnauthorizedException) throw e;
      this.logger.error(`Supabase Admin API error during login migration step: ${e?.message||e}`, e?.stack);
      throw new BadRequestException('Impossible de joindre Supabase Auth pour la connexion. Réessayez dans un instant.');
    }
    const session=await this.signInWithAlias(email,password);
    return {accessToken:session.access_token,refreshToken:session.refresh_token,userId:profile.id};
  }
}
