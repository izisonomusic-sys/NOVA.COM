import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseFinanceService } from './supabase-finance.service';

@Injectable()
export class WalletService{
  constructor(private db:SupabaseFinanceService){}
  async get(id:string){
    const {data,error}=await this.db.db.from('wallet_balances').select('user_id,balance,bonus_balance,bonus_locked,updated_at').eq('user_id',id).maybeSingle();
    if(error) throw new BadRequestException(error.message);
    return data||{user_id:id,balance:0,bonus_balance:0,bonus_locked:0};
  }
  async tx(id:string){
    const {data,error}=await this.db.db.from('wallet_ledger').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(100);
    if(error) throw new BadRequestException(error.message);
    return data||[];
  }
}
