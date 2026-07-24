import { Player, Transaction, GameHistoryEntry, ScoreEntry } from '../types';

const PLAYER_KEY = 'lucky_bingo_player';
const TRANSACTIONS_KEY = 'lucky_bingo_transactions';
const HISTORY_KEY = 'lucky_bingo_history';

// Get Telegram user data if available
export function getTelegramUser() {
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      return tg.initDataUnsafe.user;
    }
  }
  return null;
}

export function getStoredPlayer(): Player {
  const tgUser = getTelegramUser();
  const stored = localStorage.getItem(PLAYER_KEY);

  let playerObj: Player;

  if (stored) {
    try {
      playerObj = JSON.parse(stored);
      // Migration: if the cached ID starts with "tg-", clear it to load/save without the prefix
      if (playerObj.id && playerObj.id.startsWith('tg-')) {
        localStorage.removeItem(PLAYER_KEY);
        throw new Error('Migrating user ID prefix');
      }
      if (tgUser) {
        playerObj.username = tgUser.username || playerObj.username;
        playerObj.first_name = tgUser.first_name || playerObj.first_name;
        playerObj.telegram_id = tgUser.id;
        playerObj.id = tgUser.id.toString();
        if (tgUser.photo_url) {
          playerObj.photo_url = tgUser.photo_url;
        }
      }
    } catch (e) {
      playerObj = {
        id: tgUser ? tgUser.id.toString() : 'player-real-1',
        telegram_id: tgUser?.id,
        username: tgUser?.username || 'real_player',
        first_name: tgUser?.first_name || 'Player',
        balance: 15,
        created_at: new Date().toISOString(),
        photo_url: tgUser?.photo_url || '',
      };
    }
  } else {
    playerObj = {
      id: tgUser ? tgUser.id.toString() : 'player-real-1',
      telegram_id: tgUser?.id,
      username: tgUser?.username || 'real_player',
      first_name: tgUser?.first_name || 'Player',
      balance: 15,
      created_at: new Date().toISOString(),
      photo_url: tgUser?.photo_url || '',
    };
  }

  savePlayer(playerObj);
  
  // Sync player to MongoDB backend
  try {
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: playerObj.id,
        name: playerObj.first_name,
        username: playerObj.username,
        phoneNumber: playerObj.phone_number,
        photoUrl: playerObj.photo_url,
      }),
    }).catch(() => {});
  } catch (e) {}

  return playerObj;
}

export function savePlayer(player: Player): void {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function updateBalance(
  amountChange: number,
  type: Transaction['type'],
  description?: string
): Player {
  const player = getStoredPlayer();
  const isPendingType = type === 'deposit' || type === 'withdrawal';
  // Deposits do not credit the user's balance until an Admin approves them.
  // Withdrawals instantly deduct the balance so players cannot double-spend.
  const realAmountChange = type === 'deposit' ? 0 : amountChange;
  const newBalance = Math.max(0, player.balance + realAmountChange);
  const updatedPlayer: Player = {
    ...player,
    balance: newBalance,
  };

  savePlayer(updatedPlayer);

  // Sync balance update with backend
  if (realAmountChange !== 0) {
    try {
      fetch('/api/users/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: player.id,
          amountChange: realAmountChange,
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  // Add transaction
  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    playerId: player.id,
    type,
    amount: amountChange,
    status: isPendingType ? 'pending' : 'completed',
    createdAt: new Date().toISOString(),
    description,
  };

  const transactions = getTransactions();
  transactions.unshift(newTx);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

  // Sync transaction to MongoDB backend
  try {
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch(() => {});
  } catch (e) {}

  return updatedPlayer;
}

export function getTransactions(): Transaction[] {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function addGameHistory(entry: GameHistoryEntry): void {
  const history = getGameHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  const player = getStoredPlayer();

  // Sync history to MongoDB backend
  try {
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entry.id,
        playerId: player.id,
        gameId: entry.gameId,
        date: entry.date,
        stake: entry.stake,
        ticketsCount: entry.ticketsCount,
        potWon: entry.potWon,
        status: entry.status,
        pattern: entry.pattern,
      }),
    }).catch(() => {});
  } catch (e) {}

  // Update real player score stats if WON
  if (entry.status === 'WON') {
    const scores = getScoresLeaderboard();
    const existingIndex = scores.findIndex((s) => s.id === player.id);
    if (existingIndex >= 0) {
      scores[existingIndex].wins += 1;
      scores[existingIndex].totalEarnings += entry.potWon;
    } else {
      scores.push({
        id: player.id,
        username: player.first_name || player.username || 'Player',
        wins: 1,
        totalEarnings: entry.potWon,
        rank: 1,
      });
    }
    // Sort scores descending by total earnings
    scores.sort((a, b) => b.totalEarnings - a.totalEarnings);
    scores.forEach((s, idx) => {
      s.rank = idx + 1;
    });
    localStorage.setItem('lucky_bingo_scores', JSON.stringify(scores));
  }
}

export function getGameHistory(): GameHistoryEntry[] {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function getScoresLeaderboard(): ScoreEntry[] {
  const stored = localStorage.getItem('lucky_bingo_scores');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  // Calculate from game history if available
  const history = getGameHistory();
  const player = getStoredPlayer();
  const wonGames = history.filter((h) => h.status === 'WON');
  if (wonGames.length > 0) {
    const totalWon = wonGames.reduce((acc, g) => acc + g.potWon, 0);
    return [
      {
        id: player.id,
        username: player.first_name || player.username || 'Player',
        wins: wonGames.length,
        totalEarnings: totalWon,
        rank: 1,
      },
    ];
  }

  return [];
}

export async function syncPlayerProfile(playerId: string): Promise<Player | null> {
  try {
    const res = await fetch(`/api/users/${playerId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.user) {
      const local = getStoredPlayer();
      const synced: Player = {
        ...local,
        balance: data.user.balance !== undefined ? data.user.balance : local.balance,
        phone_number: data.user.phoneNumber !== undefined ? data.user.phoneNumber : local.phone_number,
        photo_url: data.user.photoUrl !== undefined ? data.user.photoUrl : local.photo_url,
      };
      savePlayer(synced);
      return synced;
    }
  } catch (e) {
    console.error('Failed to sync player profile with backend:', e);
  }
  return null;
}
