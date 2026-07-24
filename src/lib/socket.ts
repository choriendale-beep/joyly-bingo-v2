import { io, Socket } from 'socket.io-client';
import { CalledBall } from '../types';

export interface RoomState {
  phase: 'TICKET_SELECT' | 'PLAYING' | 'WINNER_SHOW';
  timerSeconds: number;
  playersCount: number;
  stakedTickets: number;
  derash: number;
  gameId: string;
  calledBalls: CalledBall[];
  currentBall: CalledBall | null;
  reservedTickets?: Record<number, string>;
  winnerInfo: {
    winnerName: string;
    cartel: any;
    prize: number;
    pattern: string;
  } | null;
}

// Automatically connects to current host
export const socket: Socket = io({
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export function emitSelectTickets(username: string, selectedTickets: number[], stake: number) {
  if (socket.connected) {
    socket.emit('select_tickets', { username, selectedTickets, stake });
  }
}

export function emitJoinGame(username: string, selectedTickets: number[], stake: number) {
  if (socket.connected) {
    socket.emit('join_game', { username, selectedTickets: selectedTickets || [], stake });
    socket.emit('join_room', { username, selectedTickets: selectedTickets || [], stake });
  }
}

export function emitJoinRoom(username: string, selectedTickets: number[], stake: number) {
  if (socket.connected) {
    socket.emit('join_room', { username, selectedTickets: selectedTickets || [], stake });
  }
}

export function emitSpectateGame(username: string) {
  if (socket.connected) {
    socket.emit('spectate_game', { username });
  }
}

export function emitClaimBingo(username: string, cartel: any, pattern: string) {
  if (socket.connected) {
    socket.emit('claim_bingo', { username, cartel, pattern });
  }
}
