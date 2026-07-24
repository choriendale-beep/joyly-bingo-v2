import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  balance: number;
  gamesPlayed: number;
  gamesWon: number;
  totalEarnings: number;
  createdAt: Date;
}

export interface IGameHistory extends Document {
  gameId: string;
  winnerName: string;
  derashWon: number;
  stakedTickets: number;
  timestamp: Date;
}

export interface ITransaction extends Document {
  id: string;
  playerId: string;
  type: string;
  amount: number;
  status: string;
  createdAt: Date;
  description?: string;
}

export interface IPlayerHistory extends Document {
  id: string;
  playerId: string;
  gameId: string;
  date: string;
  stake: number;
  ticketsCount: number;
  potWon: number;
  status: string;
  pattern?: string;
  timestamp: Date;
}

const UserSchema: Schema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String },
  phoneNumber: { type: String },
  balance: { type: Number, default: 100 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'players' });

const GameHistorySchema: Schema = new Schema({
  gameId: { type: String, required: true },
  winnerName: { type: String, required: true },
  derashWon: { type: Number, required: true },
  stakedTickets: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { collection: 'game_histories' });

const TransactionSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  playerId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  description: { type: String },
}, { collection: 'transactions' });

const PlayerHistorySchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  playerId: { type: String, required: true },
  gameId: { type: String, required: true },
  date: { type: String, required: true },
  stake: { type: Number, required: true },
  ticketsCount: { type: Number, required: true },
  potWon: { type: Number, required: true },
  status: { type: String, required: true },
  pattern: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { collection: 'player_histories' });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const GameHistoryModel = mongoose.models.GameHistory || mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const PlayerHistoryModel = mongoose.models.PlayerHistory || mongoose.model<IPlayerHistory>('PlayerHistory', PlayerHistorySchema);

let isConnected = false;

// Memory fallback store if MongoDB URI is not set or unavailable
const inMemoryUsers = new Map<string, any>();
const inMemoryTransactions = new Map<string, any[]>();
const inMemoryHistory = new Map<string, any[]>();

export async function deleteFakeAccounts() {
  if (isConnected) {
    try {
      const result = await UserModel.deleteMany({
        $or: [
          { phoneNumber: { $exists: false } },
          { phoneNumber: null },
          { phoneNumber: '' }
        ]
      });
      console.log(`[MongoDB] Cleaned up ${result.deletedCount} fake/unregistered accounts without phone numbers.`);
    } catch (e) {
      console.error('[MongoDB] Error in deleteFakeAccounts:', e);
    }
  }
}

export async function seedInitialUsers() {
  // Disable seeding of default fake players entirely. We only want real registered accounts.
  if (isConnected) {
    try {
      await deleteFakeAccounts();
      console.log('[MongoDB] Running with real, verified registered accounts only.');
    } catch (e) {
      console.error('[MongoDB] Error during initial cleanup:', e);
    }
  }
}

export function getDbStatus() {
  return {
    isConnected,
    mode: isConnected ? 'MongoDB Atlas (Live)' : 'In-Memory Fallback',
  };
}

export async function connectMongoDB(): Promise<boolean> {
  let mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:hVI9tTaroIlS7fJ1@cluster0.viwaesg.mongodb.net/bingo_db?retryWrites=true&w=majority&appName=Cluster0';

  // Replace placeholder if user passed <db_username>
  if (mongoUri.includes('<db_username>')) {
    mongoUri = mongoUri.replace('<db_username>', 'admin');
  }

  // Rewrite /luckybingo to /bingo_db to match user's actual database name on MongoDB Atlas
  if (mongoUri.includes('/luckybingo')) {
    mongoUri = mongoUri.replace('/luckybingo', '/bingo_db');
  }

  if (isConnected) return true;

  try {
    await mongoose.connect(mongoUri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully to MongoDB Atlas!');
    await seedInitialUsers();
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('whitelisted') || errMsg.includes('Could not connect to any servers')) {
      console.warn('[MongoDB Notice] Atlas IP Whitelist required: To connect live MongoDB Atlas, go to MongoDB Atlas -> Network Access -> Add IP Address -> 0.0.0.0/0 (Allow access from anywhere).');
    } else {
      console.error('[MongoDB Error]', errMsg);
    }
    console.log('[MongoDB] Running seamlessly with In-Memory store fallback.');
    await seedInitialUsers();
    return false;
  }
}

export async function getUserByTelegramId(telegramId: string) {
  if (isConnected) {
    try {
      const user = await UserModel.findOne({ telegramId });
      return user ? user.toObject() : null;
    } catch (e) {
      console.error('[MongoDB] Error in getUserByTelegramId:', e);
    }
  }
  return inMemoryUsers.get(telegramId) || null;
}

export async function findOrCreateUser(telegramId: string, name: string, username?: string, phoneNumber?: string) {
  if (isConnected) {
    try {
      let user = await UserModel.findOne({ telegramId });
      if (!user) {
        user = await UserModel.create({
          telegramId,
          name,
          username,
          phoneNumber,
          balance: 100,
        });
      } else {
        // Always synchronize the player's name and username so they are updated in MongoDB Atlas
        let changed = false;
        if (name && user.name !== name) {
          user.name = name;
          changed = true;
        }
        if (username && user.username !== username) {
          user.username = username;
          changed = true;
        }
        if (phoneNumber && user.phoneNumber !== phoneNumber) {
          user.phoneNumber = phoneNumber;
          changed = true;
        }
        if (changed) {
          await user.save();
        }
      }
      return user.toObject();
    } catch (e) {
      console.error('[MongoDB] Error in findOrCreateUser:', e);
    }
  }

  // Fallback in-memory behavior
  if (!inMemoryUsers.has(telegramId)) {
    inMemoryUsers.set(telegramId, {
      telegramId,
      name,
      username,
      phoneNumber,
      balance: 100,
      gamesPlayed: 0,
      gamesWon: 0,
      totalEarnings: 0,
      createdAt: new Date(),
    });
  } else {
    const existing = inMemoryUsers.get(telegramId);
    let changed = false;
    if (name && existing.name !== name) {
      existing.name = name;
      changed = true;
    }
    if (username && existing.username !== username) {
      existing.username = username;
      changed = true;
    }
    if (phoneNumber && existing.phoneNumber !== phoneNumber) {
      existing.phoneNumber = phoneNumber;
      changed = true;
    }
    if (changed) {
      inMemoryUsers.set(telegramId, existing);
    }
  }
  return inMemoryUsers.get(telegramId);
}

export async function recordGameWin(gameId: string, winnerName: string, derashWon: number, stakedTickets: number) {
  if (isConnected) {
    try {
      await GameHistoryModel.create({
        gameId,
        winnerName,
        derashWon,
        stakedTickets,
      });

      await UserModel.updateOne(
        { name: winnerName },
        {
          $inc: {
            balance: derashWon,
            gamesWon: 1,
            totalEarnings: derashWon,
          },
        }
      );
    } catch (e) {
      console.error('[MongoDB] Error recording game win:', e);
    }
  }
}

export async function updateUserBalance(telegramId: string, amountChange: number) {
  if (isConnected) {
    try {
      const user = await UserModel.findOneAndUpdate(
        { telegramId },
        { $inc: { balance: amountChange } },
        { new: true }
      );
      return user ? user.toObject() : null;
    } catch (e) {
      console.error('[MongoDB] Error updating balance:', e);
    }
  }

  if (inMemoryUsers.has(telegramId)) {
    const user = inMemoryUsers.get(telegramId);
    user.balance = Math.max(0, user.balance + amountChange);
    inMemoryUsers.set(telegramId, user);
    return user;
  }
  return null;
}

export async function getUsersList() {
  if (isConnected) {
    try {
      return await UserModel.find({
        phoneNumber: { $exists: true, $nin: [null, ''] }
      }).sort({ balance: -1 }).limit(20).lean();
    } catch (e) {
      console.error('[MongoDB] Error getting users list:', e);
    }
  }
  return Array.from(inMemoryUsers.values()).filter(
    (u) => u.phoneNumber && u.phoneNumber !== ''
  );
}

export async function getUserProfile(telegramId: string) {
  if (isConnected) {
    try {
      const user = await UserModel.findOne({ telegramId });
      return user ? user.toObject() : null;
    } catch (e) {
      console.error('[MongoDB] Error getting user profile:', e);
    }
  }
  return inMemoryUsers.get(telegramId) || null;
}

export async function saveTransaction(tx: any) {
  if (isConnected) {
    try {
      await TransactionModel.findOneAndUpdate(
        { id: tx.id },
        tx,
        { upsert: true, new: true }
      );
      return tx;
    } catch (e) {
      console.error('[MongoDB] Error saving transaction:', e);
    }
  }

  // Fallback
  const list = inMemoryTransactions.get(tx.playerId) || [];
  if (!list.some((item) => item.id === tx.id)) {
    list.unshift({ ...tx, createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date() });
    inMemoryTransactions.set(tx.playerId, list);
  }
  return tx;
}

export async function getPlayerTransactions(playerId: string) {
  if (isConnected) {
    try {
      return await TransactionModel.find({ playerId }).sort({ createdAt: -1 }).lean();
    } catch (e) {
      console.error('[MongoDB] Error getting player transactions:', e);
    }
  }
  return inMemoryTransactions.get(playerId) || [];
}

export async function savePlayerHistory(entry: any) {
  if (isConnected) {
    try {
      await PlayerHistoryModel.findOneAndUpdate(
        { id: entry.id },
        entry,
        { upsert: true, new: true }
      );
      // Increment games played/won in user model
      const isWin = entry.status === 'WON';
      await UserModel.updateOne(
        { telegramId: entry.playerId },
        {
          $inc: {
            gamesPlayed: 1,
            gamesWon: isWin ? 1 : 0,
            totalEarnings: isWin ? entry.potWon : 0,
          },
        }
      );
      return entry;
    } catch (e) {
      console.error('[MongoDB] Error saving player history:', e);
    }
  }

  // Fallback
  const list = inMemoryHistory.get(entry.playerId) || [];
  if (!list.some((item) => item.id === entry.id)) {
    list.unshift({ ...entry, timestamp: new Date() });
    inMemoryHistory.set(entry.playerId, list);
  }

  // Update inMemoryUser stats
  if (inMemoryUsers.has(entry.playerId)) {
    const user = inMemoryUsers.get(entry.playerId);
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    if (entry.status === 'WON') {
      user.gamesWon = (user.gamesWon || 0) + 1;
      user.totalEarnings = (user.totalEarnings || 0) + entry.potWon;
    }
    inMemoryUsers.set(entry.playerId, user);
  }

  return entry;
}

export async function getPlayerHistory(playerId: string) {
  if (isConnected) {
    try {
      return await PlayerHistoryModel.find({ playerId }).sort({ timestamp: -1 }).lean();
    } catch (e) {
      console.error('[MongoDB] Error getting player history:', e);
    }
  }
  return inMemoryHistory.get(playerId) || [];
}

export async function getMongoDBLeaderboard() {
  if (isConnected) {
    try {
      const users = await UserModel.find({
        phoneNumber: { $exists: true, $nin: [null, ''] }
      }).sort({ totalEarnings: -1 }).limit(20).lean();
      return users.map((u, index) => ({
        id: u.telegramId,
        username: u.username || u.name || 'Player',
        wins: u.gamesWon || 0,
        totalEarnings: u.totalEarnings || 0,
        rank: index + 1,
      }));
    } catch (e) {
      console.error('[MongoDB] Error getting MongoDB leaderboard:', e);
    }
  }

  // Fallback based on inMemoryUsers
  const list = (Array.from(inMemoryUsers.values()) as any[]).filter(
    (u) => u.phoneNumber && u.phoneNumber !== ''
  );
  list.sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0));
  return list.map((u, index) => ({
    id: u.telegramId,
    username: u.username || u.name || 'Player',
    wins: u.gamesWon || 0,
    totalEarnings: u.totalEarnings || 0,
    rank: index + 1,
  }));
}
