import { Telegraf, Markup } from 'telegraf';
import { CONFIG } from './config';
import { getStoredPlayer } from './lib/storage';

let botInstance: Telegraf | null = null;

if (CONFIG.TELEGRAM_BOT_TOKEN) {
  try {
    botInstance = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);
    setupBotHandlers(botInstance);
  } catch (err) {
    console.warn('[Telegram Bot] Error instantiating Telegraf bot:', err);
  }
} else {
  console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN not configured. Bot will run in inactive mode.');
}

function setupBotHandlers(bot: Telegraf) {
  bot.command('start', async (ctx) => {
    const username = ctx.from?.username || ctx.from?.first_name || 'Player';
    const player = getStoredPlayer();

    const message = `🎲 *Welcome to LUCKY BINGO!* 🎲\n\n` +
      `Hello ${username}! You're ready to play real-time Bingo.\n` +
      `💰 Your Main Wallet: *${player.mainWallet} ETB*\n` +
      `🎁 Signup Bonus: *${CONFIG.SIGNUP_BONUS_AMOUNT} ETB*\n\n` +
      `Tap the button below to launch LUCKY BINGO Mini App or choose your ticket!`;

    const webAppUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://ais-dev-nbckxdtg7wgpid6olrsnxi-274471626952.europe-west1.run.app';

    await ctx.replyWithMarkdown(
      message,
      Markup.keyboard([
        [Markup.button.webApp('🎮 Play LUCKY Bingo', webAppUrl)],
        [' Balance 💰', ' Deposit 💰'],
        [' Withdraw 💸', ' Invite 🔗'],
        [' Contact Support / Rules ❓']
      ]).resize()
    );
  });

  bot.hears(' Balance 💰', async (ctx) => {
    const player = getStoredPlayer();
    await ctx.reply(`💰 Your Wallet Balance: Main: ${player.mainWallet} ETB | Play: ${player.playWallet} ETB`);
  });

  bot.hears(' Deposit 💰', async (ctx) => {
    await ctx.reply(
      `💸 *Deposit Request*\n\nTo deposit funds into your LUCKY Bingo wallet, please transfer via Telebirr or CBE Birr and contact admin support with your payment receipt.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears(' Withdraw 💸', async (ctx) => {
    const player = getStoredPlayer();
    await ctx.reply(
      `💸 *Withdrawal Request*\n\nYour available main wallet: ${player.mainWallet} ETB.\nMinimum withdrawal: 50 ETB.\nPlease submit withdrawal request in the Mini App.`
    );
  });

  bot.hears(' Invite 🔗', async (ctx) => {
    const botName = ctx.botInfo?.username || 'luckybingo_bot';
    const referralLink = `https://t.me/${botName}?start=ref_${ctx.from?.id}`;
    await ctx.reply(
      `🔗 *Invite Friends & Earn Bonus!*\n\nShare your referral link with friends:\n${referralLink}\n\nGet 5 ETB bonus for every friend who joins!`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears(' Contact Support / Rules ❓', async (ctx) => {
    await ctx.reply(
      `❓ *How to Play LUCKY Bingo*\n\n` +
      `1. Open 🎮 Play LUCKY Bingo Mini App.\n` +
      `2. Stake is 10 ETB.\n` +
      `3. Pick your tickets from the 1..88 grid.\n` +
      `4. 35s timer counts down to game launch.\n` +
      `5. Numbers are called every 3 seconds.\n` +
      `6. Auto-daub marks your cartels.\n` +
      `7. Win the Derash pot pool! 🏆`
    );
  });
}

export const bot = botInstance;

export const startBot = async () => {
  if (!botInstance) {
    console.log('[Telegram Bot] Bot start skipped (no token provided).');
    return;
  }
  try {
    if (!process.env.TELEGRAM_WEBHOOK_URL) {
      await botInstance.launch();
      console.log('[Telegram Bot] Launched successfully in polling mode.');
    }
  } catch (err) {
    console.error('[Telegram Bot] Failed to launch bot:', err);
  }
};
