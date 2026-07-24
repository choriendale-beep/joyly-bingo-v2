import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { setupBingoSocket } from './src/bingoSocket';
import { connectMongoDB, getUsersList, findOrCreateUser, updateUserBalance, getDbStatus } from './src/db/mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Connect MongoDB on start
connectMongoDB().catch((err) => console.error('MongoDB init error:', err));

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
  },
});

setupBingoSocket(io);

const host = process.env.HOST || '0.0.0.0';
const envPort = Number.parseInt(process.env.PORT ?? '', 10);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', port, db: getDbStatus() });
});

app.get('/api/db-status', (_req, res) => {
  res.json({ success: true, ...getDbStatus() });
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', port });
});

app.get('/api/users', async (_req, res) => {
  try {
    const users = await getUsersList();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { telegramId, name, username } = req.body;
    if (!telegramId || !name) {
      return res.status(400).json({ success: false, error: 'telegramId and name are required' });
    }
    const user = await findOrCreateUser(telegramId, name, username);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save user' });
  }
});

app.post('/api/users/balance', async (req, res) => {
  try {
    const { telegramId, amountChange } = req.body;
    if (!telegramId || amountChange === undefined) {
      return res.status(400).json({ success: false, error: 'telegramId and amountChange required' });
    }
    const user = await updateUserBalance(telegramId, Number(amountChange));
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update user balance' });
  }
});

// Configure Vite middleware in development mode
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const frontendDir = path.resolve(__dirname, 'dist');
  app.use(express.static(frontendDir, { index: false }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    const indexPath = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Frontend build not found.');
  });
}

const startServer = () => {
  return new Promise((resolve, reject) => {
    const server = httpServer.listen(port, host, () => {
      console.log(`HTTP server listening on http://${host}:${port}`);
      resolve(server);
    });

    server.on('error', (error) => {
      reject(error);
    });
  });
};

const startBot = async () => {
  try {
    const botModule = await import('./src/bot');
    const startTelegramBot = botModule.startBot;
    const bot = botModule.bot;

    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const webhookPath = process.env.TELEGRAM_WEBHOOK_PATH;

    if (webhookUrl && webhookPath && bot) {
      const fullWebhook = `${webhookUrl.replace(/\/+$/, '')}${webhookPath}`;
      try {
        await bot.telegram.setWebhook(fullWebhook, { drop_pending_updates: true });
        app.use(webhookPath, express.json(), bot.webhookCallback(webhookPath));
        console.log('Telegram webhook configured at', webhookPath);
      } catch (err) {
        console.error('Failed to set Telegram webhook:', err);
      }
    } else if (bot) {
      await startTelegramBot();
      console.log('Telegram bot started in polling mode');
    }
  } catch (error) {
    console.error('Failed to start Telegram bot:', error);
  }
};

const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

const main = async () => {
  await startServer();
  await startBot();
};

main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
