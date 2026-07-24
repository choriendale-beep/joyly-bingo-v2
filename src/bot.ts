import { Telegraf, Markup } from 'telegraf';
import { CONFIG } from './config';
import { findOrCreateUser, getUserProfile } from './db/mongodb';

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

async function getUserOrPromptRegistration(ctx: any) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return null;
  const user = await getUserProfile(telegramId);
  if (!user || !user.phoneNumber) {
    const requestContactMsg = `🎲 <b>Welcome to LUCKY BINGO!</b> 🎲\n\n` +
      `እንኳን ወደ <b>LUCKY BINGO</b> በደህና መጡ! ለመቀጠል እና ለመመዝገብ እባክዎ ከታች ያለውን <b>'📱 Share Contact / ስልክ ያጋሩ'</b> የሚለውን ቁልፍ ይጫኑ።\n\n` +
      `To start playing and claim your registration bonus, please share your contact number using the button below.`;

    await ctx.replyWithHTML(
      requestContactMsg,
      Markup.keyboard([
        [Markup.button.contactRequest('📱 Share Contact / ስልክ ያጋሩ')]
      ]).resize()
    );
    return null;
  }
  return user;
}

function setupBotHandlers(bot: Telegraf) {
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const firstName = ctx.from?.first_name || '';
    const lastName = ctx.from?.last_name || '';
    const name = (firstName + ' ' + lastName).trim() || 'Telegram Player';
    const username = ctx.from?.username || '';

    // Automatically register or update the player's name & username on MongoDB Atlas
    const user = await findOrCreateUser(telegramId, name, username);

    const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://joyly-bingo-v2.onrender.com';

    if (user && user.phoneNumber) {
      // User has registered with their contact! Show full layout with 8 buttons adjusted for LUCKY BINGO
      const welcomeMsg = `👋 <b>LUCKY BINGO — Welcome back!</b> 👋\n\n` +
        `እንኳን ወደ <b>LUCKY BINGO</b> በደህና መጡ! ጨዋታውን ለመጀመር ዝግጁ ነዎት።\n\n` +
        `💰 Your Balance: <b>${user.balance} ETB</b>\n` +
        `🏆 Games Won: <b>${user.gamesWon}</b>\n\n` +
        `Choose one of the options below to get started:`;

      await ctx.replyWithHTML(
        welcomeMsg,
        Markup.keyboard([
          [Markup.button.webApp('Play 🎮', webAppUrl)],
          ['Balance 💵', 'Deposit 💰'],
          ['Contact Support...', 'Instruction 📖'],
          ['Transfer 🎁', 'Withdraw 🤑'],
          ['Invite 🔗']
        ]).resize()
      );
    } else {
      // Prompt user to share their contact first to register
      const requestContactMsg = `🎲 <b>Welcome to LUCKY BINGO!</b> 🎲\n\n` +
        `እንኳን ወደ <b>LUCKY BINGO</b> በደህና መጡ! ለመቀጠል እና ለመመዝገብ እባክዎ ከታች ያለውን <b>'📱 Share Contact / ስልክ ያጋሩ'</b> የሚለውን ቁልፍ ይጫኑ።\n\n` +
        `To start playing and claim your registration bonus, please share your contact number using the button below.`;

      await ctx.replyWithHTML(
        requestContactMsg,
        Markup.keyboard([
          [Markup.button.contactRequest('📱 Share Contact / ስልክ ያጋሩ')]
        ]).resize()
      );
    }
  });

  bot.on('contact', async (ctx) => {
    const contact = ctx.message?.contact;
    if (!contact) return;

    // Verify contact actually belongs to the user clicking the button (prevents fake account registrations)
    if (!contact.user_id || contact.user_id !== ctx.from.id) {
      await ctx.replyWithHTML("❌ <b>እባክዎ የራስዎን ስልክ ቁጥር ያጋሩ!</b> / Please share your own phone number using the button below!");
      return;
    }

    const telegramId = contact.user_id.toString();
    const name = contact.first_name + (contact.last_name ? ' ' + contact.last_name : '');
    const username = ctx.from?.username;
    const phoneNumber = contact.phone_number;

    // Save/Register user in MongoDB ONLY when we have verified phone number
    const user = await findOrCreateUser(telegramId, name, username, phoneNumber);

    const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://joyly-bingo-v2.onrender.com';

    const registeredMsg = `🎉 <b>LUCKY BINGO — Welcome / እንኳን ደህና መጡ!</b> 🎉\n\n` +
      `ስልክ ቁጥርዎ በስኬት ተረጋግጧል! ለመለያዎ <b>${CONFIG.SIGNUP_BONUS_AMOUNT} ETB</b> የሙከራ ቦነስ ተሰጥቶታል።\n\n` +
      `Your phone number has been verified! A signup bonus of <b>${CONFIG.SIGNUP_BONUS_AMOUNT} ETB</b> has been added to your balance.\n\n` +
      `💰 Current Balance: <b>${user.balance} ETB</b>\n` +
      `📱 Registered Phone: <b>${phoneNumber}</b>\n\n` +
      `Choose an option below or tap <b>Play 🎮</b> to launch the Lucky Bingo Web App:`;

    await ctx.replyWithHTML(
      registeredMsg,
      Markup.keyboard([
        [Markup.button.webApp('Play 🎮', webAppUrl)],
        ['Balance 💵', 'Deposit 💰'],
        ['Contact Support...', 'Instruction 📖'],
        ['Transfer 🎁', 'Withdraw 🤑'],
        ['Invite 🔗']
      ]).resize()
    );
  });

  bot.hears('Balance 💵', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `💵 <b>LUCKY BINGO — Your Wallet Balance / የኪስዎ ሂሳብ</b> 💵\n\n` +
      `💰 <b>Total Balance:</b> <code style="font-size: 16px;">${user.balance} ETB</code>\n` +
      `🎰 <b>Games Played:</b> <code>${user.gamesPlayed}</code>\n` +
      `🏆 <b>Games Won:</b> <code>${user.gamesWon}</code>\n\n` +
      `📱 <b>Registered Phone:</b> <code>${user.phoneNumber || 'Not linked'}</code>\n` +
      `🆔 <b>Your Telegram ID:</b> <code>${user.telegramId}</code>\n\n` +
      `💡 <b>የሚዛን ማስተካከያ መመሪያ (Tip):</b>\n` +
      `በMongoDB Atlas ላይ የሂሳብ ሚዛን ለመጨመር <b>players</b> ኮሌክሽን ውስጥ <b>telegramId: "${user.telegramId}"</b> የሚለውን ዶክመንት በመፈለግ <b>balance</b> ላይ የሚፈልጉትን ብር ይጨምሩ።`
    );
  });

  bot.hears('Deposit 💰', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `💳 <b>Deposit Funds — ዴፖዚት ለማድረግ</b>\n\n` +
      `ገንዘብ ዴፖዚት ለማድረግ እባክዎ ከታች ያሉትን የክፍያ አማራጮች በመጠቀም ይላኩና ክፍያ የፈጸሙበትን ደረሰኝ (Screenshot) ለሳፖርት @luckybingo_support ይላኩ።\n\n` +
      `To deposit funds into your LUCKY BINGO wallet, please transfer using the options below and send your receipt/screenshot to our support admin:\n\n` +
      `🔸 <b>Telebirr</b>: <code>0900112233</code>\n` +
      `🔸 <b>CBE Birr</b>: <code>0900112233</code>\n` +
      `🔸 <b>Commercial Bank of Ethiopia (CBE)</b>: <code>1000123456789</code> (Lucky Bingo)\n\n` +
      `Support Admin: @luckybingo_support`
    );
  });

  bot.hears('Contact Support...', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `📞 <b>Customer Support — የደንበኞች አገልግሎት</b>\n\n` +
      `ማንኛውም ጥያቄ ወይም እገዛ ሲፈልጉ የእኛን የደንበኞች አገልግሎት ማነጋገር ይችላሉ።\n\n` +
      `If you have any questions, transaction issues or need help, feel free to reach out to our admin support channel:\n\n` +
      `👥 Telegram Support: @luckybingo_support\n` +
      `📢 Official Channel: @luckybingochannel`
    );
  });

  bot.hears('Instruction 📖', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `📖 <b>How to Play LUCKY BINGO — ጨዋታውን ለመጫወት</b>\n\n` +
      `1. <b>Play 🎮</b> የሚለውን ቁልፍ በመንካት የLucky Bingo ዌብ መተግበሪያን ይክፈቱ።\n` +
      `2. የሚጫወቱበትን ካርቴላ (Tickets) ይምረጡ (የአንድ ካርቴላ ዋጋ ${CONFIG.STAKE_PER_CARTEL} ETB ነው)።\n` +
      `3. ጨዋታው ለመጀመር የ35 ሰከንድ ቆጠራ ይደረጋል።\n` +
      `4. ጨዋታው ሲጀመር ቁጥሮች በየ3 ሰከንዱ ይወጣሉ። መተግበሪያው በእርስዎ ካርቴላ ላይ ያሉትን ቁጥሮች በራሱ ያነብባል።\n` +
      `5. ሙሉ የቢንጎ መስመር ቀድሞ የሞላ ተጫዋች አሸናፊ (Derash) በመሆን የገንዘብ ሽልማቱን ያሸንፋል! 🏆`
    );
  });

  bot.hears('Transfer 🎁', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `🎁 <b>Balance Transfer — ሚዛን ማስተላለፍ</b>\n\n` +
      `የሂሳብ ሚዛንዎን ለሌላ ተጫዋች ማስተላለፍ ከፈለጉ እባክዎ በዌብ መተግበሪያው ውስጥ ያለውን 'Transfer' ገጽ ይጠቀሙ ወይም የደንበኞች አገልግሎትን ያነጋግሩ።\n\n` +
      `To transfer balance to another player, please use the transfer feature inside the Mini App or contact @luckybingo_support for assistance.`
    );
  });

  bot.hears('Withdraw 🤑', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    await ctx.replyWithHTML(
      `💸 <b>Withdrawal — ገንዘብ ለማውጣት</b>\n\n` +
      `💰 ማውጣት የሚስለውን ሂሳብ (Available Balance): <b>${user.balance} ETB</b>\n` +
      `⚠️ አነስተኛ ማውጫ መጠን (Minimum Withdrawal): <b>50 ETB</b>\n\n` +
      `ገንዘብ ለማውጣት እባክዎ በዌብ መተግበሪያው ውስጥ ያለውን 'Withdraw' ገጽ በመጠቀም ጥያቄዎን ያቅርቡ። በጥቂት ደቂቃዎች ውስጥ በTelebirr ይላክለታል።`
    );
  });

  bot.hears('Invite 🔗', async (ctx) => {
    const user = await getUserOrPromptRegistration(ctx);
    if (!user) return;

    const botName = ctx.botInfo?.username || 'luckybingo_bot';
    const referralLink = `https://t.me/${botName}?start=ref_${ctx.from?.id}`;
    await ctx.replyWithHTML(
      `🔗 <b>Invite Friends & Earn — ሰዎችን ጋብዘው ያትርፉ</b>\n\n` +
      `የእርስዎን ልዩ የግብዣ ሊንክ ለጓደኞችዎ ያጋሩ፡\n` +
      `👉 ${referralLink}\n\n` +
      `ጓደኛዎ በእርስዎ ግብዣ ሲመዘገብ ለሁለታችሁም የ<b>5 ETB</b> ተጨማሪ ቦነስ ይሸለማሉ! 🎁`
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
      await botInstance.launch().catch((err) => {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('Conflict') || err?.code === 409 || errMsg.includes('409')) {
          console.warn('[Telegram Bot] Warning: Conflict detected (another bot instance is already active). Skipping polling start to prevent conflict.');
        } else {
          console.error('[Telegram Bot] Failed to launch bot polling:', err);
        }
      });
      console.log('[Telegram Bot] Launched successfully (if no conflict occurred).');
    }
  } catch (err) {
    console.error('[Telegram Bot] Failed inside startBot wrapper:', err);
  }
};
