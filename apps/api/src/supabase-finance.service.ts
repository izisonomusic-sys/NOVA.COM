import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { externalApis } from './config-external-apis';

@Injectable()
export class SupabaseFinanceService {
  readonly db: SupabaseClient;
  constructor() {
    if (!externalApis.supabase.url || !externalApis.supabase.secretKey) {
      throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis pour les opérations financières.');
    }
    this.db = createClient(externalApis.supabase.url, externalApis.supabase.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  async rpc<T = any>(fn: string, args: Record<string, unknown>) {
    const { data, error } = await this.db.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
}