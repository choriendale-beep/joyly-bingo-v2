import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { setupBingoSocket } from './src/bingoSocket.js';
import {
  connectMongoDB,
  getUsersList,
  findOrCreateUser,
  updateUserBalance,
  getDbStatus,
  getUserProfile,
  saveTransaction,
  getPlayerTransactions,
  savePlayerHistory,
  getPlayerHistory,
  getMongoDBLeaderboard
} from './src/db/mongodb.js';

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

const host = '0.0.0.0';
const port = 3000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', port, db: getDbStatus() });
});

app.get('/api/db-status', (_req, res) => {
  res.json({ success: true, ...getDbStatus() });
});

app.get('/api/db-debug-info', async (_req, res) => {
  let mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:hVI9tTaroIlS7fJ1@cluster0.viwaesg.mongodb.net/luckybingo?retryWrites=true&w=majority&appName=Cluster0';
  let redactedUri = mongoUri;
  try {
    const urlObj = new URL(mongoUri.startsWith('mongodb') ? mongoUri : 'mongodb://' + mongoUri);
    if (urlObj.password) {
      urlObj.password = '****';
    }
    redactedUri = urlObj.toString();
  } catch(e) {}

  let testError = null;
  let testSuccess = false;
  try {
    const conn = await mongoose.createConnection(mongoUri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    testSuccess = true;
    await conn.close();
  } catch (err) {
    testError = err instanceof Error ? err.message : String(err);
  }

  res.json({
    envUriSet: !!process.env.MONGODB_URI,
    redactedUri,
    readyState: mongoose.connection.readyState,
    testSuccess,
    testError,
  });
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

// GET user profile stats and balance
app.get('/api/users/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await getUserProfile(telegramId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// GET leaderboard (Scores)
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const leaderboard = await getMongoDBLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET transaction history for a player
app.get('/api/transactions/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const transactions = await getPlayerTransactions(playerId);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// POST save a transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || !tx.id || !tx.playerId) {
      return res.status(400).json({ success: false, error: 'Invalid transaction data' });
    }
    const saved = await saveTransaction(tx);
    res.json({ success: true, transaction: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save transaction' });
  }
});

// GET match history for a player
app.get('/api/history/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const history = await getPlayerHistory(playerId);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch game history' });
  }
});

// POST save a match history entry
app.post('/api/history', async (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.id || !entry.playerId) {
      return res.status(400).json({ success: false, error: 'Invalid history data' });
    }
    const saved = await savePlayerHistory(entry);
    res.json({ success: true, history: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save history entry' });
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
  const frontendDir = path.join(process.cwd(), 'dist');
  app.use(express.static(frontendDir));

  app.get('/', (req, res) => {
    const indexPath = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Frontend build not found. Please run "npm run build" before starting the server.');
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    const indexPath = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Frontend build not found. Please run "npm run build" before starting the server.');
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
    const botModule = await import('./src/bot.js');
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
