/** Internal business event contract. Payment provider details live in metadata. */
export const PLATFORM_EVENTS = {
  USER_REGISTERED: 'user.registered',
  DEPOSIT_CREATED: 'deposit.created',
  DEPOSIT_CONFIRMED: 'deposit.confirmed',
  INVESTMENT_CREATED: 'investment.created',
  DAILY_RETURN_CREDITED: 'investment.daily_return_credited',
  INVESTMENT_MATURED: 'investment.matured',
  WITHDRAWAL_CREATED: 'withdrawal.created',
  WITHDRAWAL_COMPLETED: 'withdrawal.completed',
  WITHDRAWAL_REJECTED: 'withdrawal.rejected',
  REFERRAL_REWARDED: 'referral.rewarded',
} as const;
export type PlatformEventName = typeof PLATFORM_EVENTS[keyof typeof PLATFORM_EVENTS];
export type PlatformEventPayload = { event: PlatformEventName; userId?: string; entityId?: string; amount?: number; metadata?: Record<string, unknown>; occurredAt?: string };
export const API_INTEGRATIONS = { payment: 'PAYDUNYA_API_BASE_URL', webhook: 'PAYDUNYA_CALLBACK_URL' } as const;
