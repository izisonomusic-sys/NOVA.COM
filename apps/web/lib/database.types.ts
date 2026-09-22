export type Json = string | number | boolean | null | { [key:string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      profiles: { Row: { id:string; email:string|null; full_name:string|null; phone:string|null; role:'USER'|'SUPER_ADMIN'; referral_code:string|null; referred_by:string|null; is_active:boolean; created_at:string; updated_at:string } };
      projects: { Row: { id:string; title:string; slug:string; description:string|null; category:string; cover_url:string|null; gallery_urls:string[]; target_amount:number; raised_amount:number; min_investment:number; expected_return_pct:number; duration_days:number; status:'DRAFT'|'PUBLISHED'|'FUNDING'|'FUNDED'|'ACTIVE'|'PAUSED'|'COMPLETED'; published_at:string|null; starts_at:string|null; ends_at:string|null; created_at:string; updated_at:string } };
      wallets: { Row: { user_id:string; balance:number; locked_balance:number; updated_at:string } };
      transactions: { Row: { id:string; user_id:string; type:string; amount:number; balance_after:number|null; reference:string|null; metadata:Json; created_at:string } };
      deposits: { Row: { id:string; user_id:string; amount:number; provider:string; provider_reference:string|null; status:'PENDING'|'CONFIRMED'|'FAILED'|'CANCELLED'; metadata:Json; created_at:string; confirmed_at:string|null } };
      investments: { Row: { id:string; user_id:string; project_id:string; amount:number; expected_profit:number; total_return:number; status:'ACTIVE'|'MATURED'|'CANCELLED'|'REFUNDED'; invested_at:string; maturity_at:string; settled_at:string|null; settlement_reference:string|null } };
      withdrawals: { Row: { id:string; user_id:string; amount:number; fee:number; net_amount:number|null; provider:string; provider_reference:string|null; status:'PENDING'|'PROCESSING'|'COMPLETED'|'REJECTED'|'CANCELLED'; destination:Json; metadata:Json; created_at:string; processed_at:string|null } };
      referrals: { Row: { id:string; referrer_id:string; referred_user_id:string; reward_amount:number; reward_paid:boolean; created_at:string; rewarded_at:string|null } };
      notifications: { Row: { id:string; user_id:string; title:string; message:string; read_at:string|null; created_at:string } };
      project_updates: { Row: { id:string; project_id:string; title:string; content:string; created_at:string } };
      audit_logs: { Row: { id:string; actor_id:string|null; action:string; entity_type:string|null; entity_id:string|null; metadata:Json; created_at:string } };
      platform_settings: { Row: { key:string; value:Json; updated_at:string } };
    };
  };
};
