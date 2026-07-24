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
  username?: string;
  cartel: any;
  ticketNumber?: number;
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
    const activePlayersWithTickets = Array.from(this.players.values()).filter(
      (p) => p.selectedTickets && p.selectedTickets.length > 0
    ).length;
    const connectedClients = this.io ? this.io.engine.clientsCount : 0;
    return Math.max(activePlayersWithTickets, connectedClients, 1);
  }

  public getTotalStakedTickets(): number {
    let total = 0;
    this.players.forEach((p) => {
      total += (p.selectedTickets ? p.selectedTickets.length : 0);
    });
    return total;
  }

  public getCalculateDerash(): number {
    let activeStake = 10;
    this.players.forEach((p) => {
      if (p.stake) {
        activeStake = p.stake;
      }
    });
    return activeStake * 8;
  }

  public getReservedTicketsMap(): Record<number, string> {
    const reserved: Record<number, string> = {};
    this.players.forEach((p) => {
      if (p.selectedTickets && Array.isArray(p.selectedTickets)) {
        p.selectedTickets.forEach((tNum) => {
          reserved[tNum] = p.username || 'Player';
        });
      }
    });
    return reserved;
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

    // Broadcast initial 35s state immediately
    this.broadcastRoomState();

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

    // Verify player actually bought/selected tickets before claiming BINGO
    const player = this.players.get(socketId);
    if (!player || !player.selectedTickets || player.selectedTickets.length === 0) {
      console.log(`[Socket.IO] Blocked BINGO claim from socket ${socketId}: No tickets held.`);
      return;
    }

    const winnerName = claimData.username || player.username || 'Player';
    const ticketNum = claimData.cartel?.ticketNumber || claimData.cartel?.id || 1;

    this.winnerInfo = {
      winnerName: winnerName,
      username: player.username || winnerName,
      cartel: claimData.cartel,
      ticketNumber: ticketNum,
      prize: this.getCalculateDerash(),
      pattern: claimData.pattern || 'BINGO',
    };

    // Save record to MongoDB
    recordGameWin(this.gameId, this.winnerInfo.winnerName, this.winnerInfo.prize, this.getTotalStakedTickets()).catch((e) =>
      console.error('Error saving game win:', e)
    );

    this.phase = 'WINNER_SHOW';
    if (this.intervalTimer) clearInterval(this.intervalTimer);

    // Broadcast winner events to all connected clients
    this.io.emit('game_over', {
      winnerInfo: this.winnerInfo,
      gameId: this.gameId,
    });
    this.io.emit('winner_announced', {
      winnerInfo: this.winnerInfo,
      gameId: this.gameId,
    });

    this.broadcastRoomState();

    // 5 seconds winner display before returning to ticket selection for everyone
    setTimeout(() => {
      this.startSelectionPhase();
      this.io.emit('reset_to_lobby', {
        gameId: this.gameId,
      });
    }, 5000);
  }

  public broadcastRoomState() {
    const payload = {
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      playersCount: this.getRealPlayersCount(),
      stakedTickets: this.getTotalStakedTickets(),
      derash: this.getCalculateDerash(),
      gameId: this.gameId,
      calledBalls: this.calledBalls,
      currentBall: this.currentBall,
      reservedTickets: this.getReservedTicketsMap(),
      winnerInfo: this.winnerInfo,
    };

    this.io.emit('room_state', payload);
    this.io.emit('game_state_update', payload);
  }

  public handleConnection(socket: Socket) {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Initial state sent to newly connected client
    const initialPayload = {
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      playersCount: this.getRealPlayersCount(),
      stakedTickets: this.getTotalStakedTickets(),
      derash: this.getCalculateDerash(),
      gameId: this.gameId,
      calledBalls: this.calledBalls,
      currentBall: this.currentBall,
      reservedTickets: this.getReservedTicketsMap(),
      winnerInfo: this.winnerInfo,
    };

    socket.emit('room_state', initialPayload);
    socket.emit('game_state_update', initialPayload);

    const handleJoin = (data: { username?: string; selectedTickets?: number[]; stake?: number }) => {
      const ticketsList = Array.isArray(data?.selectedTickets) ? data.selectedTickets : [];

      this.players.set(socket.id, {
        socketId: socket.id,
        username: data?.username || 'Player',
        selectedTickets: ticketsList,
        stake: data?.stake || 10,
      });

      if (data?.username) {
        findOrCreateUser(socket.id, data.username, data.username).catch((e) =>
          console.error('Error finding/creating user in MongoDB:', e)
        );
      }

      this.broadcastRoomState();
    };

    socket.on('join_game', handleJoin);
    socket.on('join_room', handleJoin);

    socket.on('spectate_game', (data: { username?: string }) => {
      this.players.set(socket.id, {
        socketId: socket.id,
        username: data?.username || 'Spectator',
        selectedTickets: [],
        stake: 10,
      });
      this.broadcastRoomState();
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
