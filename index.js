import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { Telegraf, Markup } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const port = 3000;
const host = '0.0.0.0';

app.use(express.json());

// API Health route
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram Bot Setup (if token provided)
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (botToken) {
  try {
    const bot = new Telegraf(botToken);
    const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://ais-dev-nbckxdtg7wgpid6olrsnxi-274471626952.europe-west1.run.app';

    bot.start((ctx) => {
      ctx.reply(
        '👋 እንኳን ወደ Lucky Bingo Bot በደህና መጡ! \n\nታች ያለውን "Play Bingo 🎮" ቁልፍ በመጫን ጨዋታውን ይጀምሩ።',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Play Bingo 🎮', webAppUrl)]
        ])
      );
    });

    bot.launch()
      .then(() => console.log('🤖 Telegram bot started successfully'))
      .catch((err) => console.error('Telegram bot launch error:', err.message));

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    console.error('Failed to initialize Telegram Bot:', err);
  }
} else {
  console.log('💡 TELEGRAM_BOT_TOKEN not provided. Bot polling skipped.');
}

// Vite middleware for dev / static for prod
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupViteOrStatic().then(() => {
  httpServer.listen(port, host, () => {
    console.log(`🚀 Server running on http://${host}:${port}`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
});
