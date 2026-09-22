/** Central configuration for external integrations. Never put private keys in Next.js. */
export const externalApis = {
  app: { frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000' },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
  },
  paydunya: {
    mode: process.env.PAYDUNYA_MODE || 'mock',
    baseUrl: process.env.PAYDUNYA_API_BASE_URL || '',
    masterKey: process.env.PAYDUNYA_MASTER_KEY || '',
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY || '',
    token: process.env.PAYDUNYA_TOKEN || '',
    callbackUrl: process.env.PAYDUNYA_CALLBACK_URL || '',
    returnUrl: process.env.PAYDUNYA_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet`,
    cancelUrl: process.env.PAYDUNYA_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet`,
    withdrawMode: process.env.PAYDUNYA_WITHDRAW_MODE || 'paydunya',
    debitAccountNumber: process.env.PAYDUNYA_DEBIT_ACCOUNT_NUMBER || '',
    currency: process.env.PAYDUNYA_CURRENCY || 'XOF',
    storeName: process.env.PAYDUNYA_STORE_NAME || 'nova.com',
    storeTagline: process.env.PAYDUNYA_STORE_TAGLINE || 'Investissement • Impact • Avenir',
    storeWebsiteUrl: process.env.PAYDUNYA_STORE_WEBSITE_URL || '',
  },
} as const;
