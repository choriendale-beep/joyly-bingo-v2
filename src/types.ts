export type NavTab = 'GAME' | 'SCORES' | 'HISTORY' | 'WALLET' | 'PROFILE';

export type GameStage = 'HOME' | 'TICKET_SELECT' | 'PLAYING' | 'RESULT';

export interface Player {
  id: string;
  telegram_id?: number;
  username?: string;
  first_name?: string;
  mainWallet: number;
  playWallet: number;
  created_at: string;
}

export interface CartelCell {
  number: number | 'FREE';
  daubed: boolean;
}

export type CartelGrid = CartelCell[][]; // 5x5 grid

export interface Cartel {
  id: string;
  ticketNumber: number;
  grid: CartelGrid;
}

export interface TicketItem {
  number: number;
  selected: boolean;
  cartel: Cartel;
}

export interface CalledBall {
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  formatted: string; // e.g. "N-44"
}

export interface ScoreEntry {
  id: string;
  username: string;
  wins: number;
  totalEarnings: number;
  rank: number;
}

export interface GameHistoryEntry {
  id: string;
  gameId: string;
  date: string;
  stake: number;
  ticketsCount: number;
  potWon: number;
  status: 'WON' | 'LOST';
  pattern?: string;
}

export interface Transaction {
  id: string;
  playerId: string;
  type: 'deposit' | 'withdrawal' | 'signup_bonus' | 'stake' | 'win' | 'refund';
  amount: number;
  status: 'completed' | 'pending';
  createdAt: string;
  description?: string;
}
