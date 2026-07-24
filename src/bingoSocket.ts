import { Server as SocketIOServer, Socket } from 'socket.io';
import { recordGameWin, findOrCreateUser } from './db/mongodb';

export interface Ball {
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  formatted?: string;
}

export interface PlayerSocketInfo {
  socketId: string;
  username: string;
  selectedTickets: number[];
  stake: number;
}

export interface WinnerInfo {
  winnerName: string;
  cartel: any;
  prize: number;
  pattern: string;
}

function generateStandardBalls(): Ball[] {
  const balls: Ball[] = [];
  const letterRanges: Array<{ letter: 'B' | 'I' | 'N' | 'G' | 'O'; min: number; max: number }> = [
    { letter: 'B', min: 1, max: 15 },
    { letter: 'I', min: 16, max: 30 },
    { letter: 'N', min: 31, max: 45 },
    { letter: 'G', min: 46, max: 60 },
    { letter: 'O', min: 61, max: 75 },
  ];

  letterRanges.forEach(({ letter, min, max }) => {
    for (let i = min; i <= max; i++) {
      balls.push({ letter, number: i, formatted: `${letter}-${i}` });
    }
  });

  // Fisher-Yates shuffle
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }

  return balls;
}

class BingoGameManager {
  private io: SocketIOServer;
  public phase: 'TICKET_SELECT' | 'PLAYING' | 'WINNER_SHOW' = 'TICKET_SELECT';
  public timerSeconds: number = 35;
  public remainingBalls: Ball[] = [];
  public calledBalls: Ball[] = [];
  public currentBall: Ball | null = null;
  public gameId: string = 'DB' + Math.random().toString(36).substring(2, 8).toUpperCase();
  public players: Map<string, PlayerSocketInfo> = new Map();
  public winnerInfo: WinnerInfo | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.startSelectionPhase();
  }

  public getRealPlayersCount(): number {
    return Math.max(this.players.size, 1);
  }

  public getTotalStakedTickets(): number {
    let total = 0;
    this.players.forEach((p) => {
      total += (p.selectedTickets ? p.selectedTickets.length : 0);
    });
    return total;
  }

  public getCalculateDerash(): number {
    let totalPool = 0;
    this.players.forEach((p) => {
      const stake = p.stake || 10;
      const count = p.selectedTickets ? p.selectedTickets.length : 0;
      totalPool += count * stake;
    });

    if (totalPool === 0) return 0;

    // Exact 85% payout pool from total tickets staked
    return Math.round(totalPool * 0.85);
  }

  public startSelectionPhase() {
    this.phase = 'TICKET_SELECT';
    this.timerSeconds = 35;
    this.calledBalls = [];
    this.remainingBalls = [];
    this.currentBall = null;
    this.winnerInfo = null;
    this.gameId = 'DB' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Reset selected tickets for all players when new game starts
    this.players.forEach((player) => {
      player.selectedTickets = [];
    });

    if (this.intervalTimer) clearInterval(this.intervalTimer);

    this.intervalTimer = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.broadcastRoomState();
      } else {
        if (this.intervalTimer) clearInterval(this.intervalTimer);
        this.startPlayingPhase();
      }
    }, 1000);
  }

  public startPlayingPhase() {
    this.phase = 'PLAYING';
    this.remainingBalls = generateStandardBalls();
    this.calledBalls = [];
    this.currentBall = null;

    this.broadcastRoomState();
    this.io.emit('game_start', {
      gameId: this.gameId,
      derash: this.getCalculateDerash(),
      playersCount: this.getRealPlayersCount(),
    });

    if (this.intervalTimer) clearInterval(this.intervalTimer);

    // Call ball every 2.8 seconds synchronously for ALL connected sockets
    this.intervalTimer = setInterval(() => {
      if (this.phase !== 'PLAYING') return;

      if (this.remainingBalls.length > 0 && !this.winnerInfo) {
        const ball = this.remainingBalls.shift()!;
        this.currentBall = ball;
        this.calledBalls.push(ball);

        this.io.emit('ball_called', {
          currentBall: ball,
          calledBalls: this.calledBalls,
          remainingCount: this.remainingBalls.length,
          gameId: this.gameId,
        });
      } else {
        if (this.intervalTimer) clearInterval(this.intervalTimer);
        // Game ended without winner or ran out of balls
        setTimeout(() => this.startSelectionPhase(), 3000);
      }
    }, 2800);
  }

  public handleBingoClaim(socketId: string, claimData: { username: string; cartel: any; pattern: string }) {
    if (this.phase !== 'PLAYING' || this.winnerInfo) return;

    this.winnerInfo = {
      winnerName: claimData.username || 'You',
      cartel: claimData.cartel,
      prize: this.getCalculateDerash(),
      pattern: claimData.pattern || 'BINGO',
    };

    // Save record to MongoDB
    recordGameWin(this.gameId, this.winnerInfo.winnerName, this.winnerInfo.prize, this.getTotalStakedTickets()).catch((e) =>
      console.error('Error saving game win:', e)
    );

    this.phase = 'WINNER_SHOW';
    if (this.intervalTimer) clearInterval(this.intervalTimer);

    this.io.emit('game_over', {
      winnerInfo: this.winnerInfo,
      gameId: this.gameId,
    });

    // 5 seconds winner display before returning to ticket selection for everyone
    setTimeout(() => {
      this.startSelectionPhase();
    }, 5000);
  }

  public broadcastRoomState() {
    this.io.emit('room_state', {
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      playersCount: this.getRealPlayersCount(),
      stakedTickets: this.getTotalStakedTickets(),
      derash: this.getCalculateDerash(),
      gameId: this.gameId,
      calledBalls: this.calledBalls,
      currentBall: this.currentBall,
      winnerInfo: this.winnerInfo,
    });
  }

  public handleConnection(socket: Socket) {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Send initial room state to newly connected client
    socket.emit('room_state', {
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      playersCount: this.getRealPlayersCount(),
      stakedTickets: this.getTotalStakedTickets(),
      derash: this.getCalculateDerash(),
      gameId: this.gameId,
      calledBalls: this.calledBalls,
      currentBall: this.currentBall,
      winnerInfo: this.winnerInfo,
    });

    socket.on('select_tickets', (data: { username: string; selectedTickets: number[]; stake: number }) => {
      this.players.set(socket.id, {
        socketId: socket.id,
        username: data.username,
        selectedTickets: data.selectedTickets || [],
        stake: data.stake || 10,
      });

      if (data.username) {
        findOrCreateUser(socket.id, data.username, data.username).catch((e) =>
          console.error('Error finding/creating user in MongoDB:', e)
        );
      }

      this.broadcastRoomState();
    });

    socket.on('claim_bingo', (data: { username: string; cartel: any; pattern: string }) => {
      this.handleBingoClaim(socket.id, data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      this.players.delete(socket.id);
      this.broadcastRoomState();
    });
  }
}

export function setupBingoSocket(io: SocketIOServer) {
  const gameManager = new BingoGameManager(io);

  io.on('connection', (socket: Socket) => {
    gameManager.handleConnection(socket);
  });

  return gameManager;
}
