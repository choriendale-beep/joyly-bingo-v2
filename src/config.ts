export const CONFIG = {
  CALL_INTERVAL_MS: Number(process.env.CALL_INTERVAL_MS) || 4000,
  LOBBY_SECONDS: Number(process.env.LOBBY_SECONDS) || 35,
  SIGNUP_BONUS_AMOUNT: Number(process.env.SIGNUP_BONUS_AMOUNT) || 10,
  STAKE_PER_CARTEL: Number(process.env.STAKE_PER_CARTEL) || 10,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};
