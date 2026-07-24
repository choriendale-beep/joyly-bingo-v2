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

export function validateBingoTicket(
  grid: any[][],
  calledNumbers: Set<number>
): { isWin: boolean; pattern?: string } {
  if (!Array.isArray(grid) || grid.length !== 5) return { isWin: false };

  const isCellMarked = (r: number, c: number): boolean => {
    const row = grid[r];
    if (!Array.isArray(row) || row.length !== 5) return false;
    const cell = row[c];
    if (cell === undefined || cell === null) return false;

    // Center cell (row 2, col 2) is FREE
    if (r === 2 && c === 2) return true;

    const val = typeof cell === 'object' ? cell.number : cell;
    if (val === 'FREE' || val === 'free' || val === 0) return true;

    if (typeof val === 'number') {
      // Must strictly be present in server calledNumbers set
      return calledNumbers.has(val);
    }
    return false;
  };

  // 1. Horizontal Rows (5 rows)
  for (let r = 0; r < 5; r++) {
    let rowWin = true;
    for (let c = 0; c < 5; c++) {
      if (!isCellMarked(r, c)) {
        rowWin = false;
        break;
      }
    }
    if (rowWin) return { isWin: true, pattern: `Horizontal Row ${r + 1}` };
  }

  // 2. Vertical Columns (5 columns)
  for (let c = 0; c < 5; c++) {
    let colWin = true;
    for (let r = 0; r < 5; r++) {
      if (!isCellMarked(r, c)) {
        colWin = false;
        break;
      }
    }
    if (colWin) return { isWin: true, pattern: `Vertical Column ${c + 1}` };
  }

  // 3. Main Diagonal (Top-Left to Bottom-Right)
  let diag1 = true;
  for (let i = 0; i < 5; i++) {
    if (!isCellMarked(i, i)) {
      diag1 = false;
      break;
    }
  }
  if (diag1) return { isWin: true, pattern: 'Main Diagonal' };

  // 4. Reverse Diagonal (Top-Right to Bottom-Left)
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!isCellMarked(i, 4 - i)) {
      diag2 = false;
      break;
    }
  }
  if (diag2) return { isWin: true, pattern: 'Reverse Diagonal' };

  return { isWin: false };
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
    return Array.from(this.players.values()).filter(
      (p) => p.selectedTickets && p.selectedTickets.length > 0
    ).length;
  }

  public getTotalStakedTickets(): number {
    let total = 0;
    this.players.forEach((p) => {
      total += (p.selectedTickets ? p.selectedTickets.length : 0);
    });
    return total;
  }

  public getCalculateDerash(): number {
    let derashTotal = 0;
    this.players.forEach((p) => {
      const ticketCount = p.selectedTickets ? p.selectedTickets.length : 0;
      const ticketStake = p.stake || 10;
      derashTotal += ticketCount * (ticketStake * 0.8);
    });
    return Math.round(derashTotal * 100) / 100;
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
        // Check for active ticket holders before transitioning to PLAYING
        const activeTicketHolders = Array.from(this.players.values()).filter(
          (p) => p.selectedTickets && p.selectedTickets.length > 0
        );

        if (activeTicketHolders.length > 0) {
          if (this.intervalTimer) clearInterval(this.intervalTimer);
          this.startPlayingPhase();
        } else {
          // No active players with tickets: DO NOT start game. Reset timer to 35 seconds.
          this.timerSeconds = 35;
          this.io.emit('waiting_for_players', {
            message: 'Waiting for players to buy tickets...',
            timerSeconds: 35,
          });
          this.broadcastRoomState();
        }
      }
    }, 1000);
  }

  public startPlayingPhase() {
    // Safety check: ensure at least 1 player has bought a ticket
    const activeTicketHolders = Array.from(this.players.values()).filter(
      (p) => p.selectedTickets && p.selectedTickets.length > 0
    );

    if (activeTicketHolders.length === 0) {
      this.timerSeconds = 35;
      this.phase = 'TICKET_SELECT';
      this.broadcastRoomState();
      return;
    }

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
      this.io.to(socketId).emit('claim_rejected', { reason: 'No tickets purchased' });
      return;
    }

    const cartel = claimData.cartel;
    if (!cartel || !Array.isArray(cartel.grid)) {
      console.log(`[Socket.IO] Blocked BINGO claim from socket ${socketId}: Invalid cartel format.`);
      this.io.to(socketId).emit('claim_rejected', { reason: 'Invalid cartel matrix' });
      return;
    }

    // STRICT MATHEMATICAL VALIDATION against server calledBalls
    const calledNumbersSet = new Set(this.calledBalls.map((b) => b.number));
    const validationResult = validateBingoTicket(cartel.grid, calledNumbersSet);

    if (!validationResult.isWin) {
      console.log(`[Socket.IO] REJECTED FALSE BINGO CLAIM from ${player.username} (socket: ${socketId}) on Ticket #${cartel.ticketNumber || cartel.id}`);
      this.io.to(socketId).emit('claim_rejected', { reason: 'Incomplete bingo pattern' });
      return; // REJECT CLAIM AND DO NOT STOP THE GAME LOOP!
    }

    const winnerName = claimData.username || player.username || 'Player';
    const ticketNum = cartel.ticketNumber || cartel.id || 1;
    const dynamicPrize = this.getCalculateDerash();

    this.winnerInfo = {
      winnerName: winnerName,
      username: player.username || winnerName,
      cartel: cartel,
      ticketNumber: ticketNum,
      prize: dynamicPrize,
      pattern: validationResult.pattern || claimData.pattern || 'BINGO',
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
    const realPlayers = this.getRealPlayersCount();
    const totalStaked = this.getTotalStakedTickets();
    const derashVal = this.getCalculateDerash();

    const payload = {
      phase: this.phase,
      timerSeconds: this.timerSeconds,
      playersCount: realPlayers,
      totalPlayers: realPlayers,
      stakedTickets: totalStaked,
      totalTickets: totalStaked,
      derash: derashVal,
      derashAmount: derashVal,
      gameId: this.gameId,
      calledBalls: this.calledBalls,
      currentBall: this.currentBall,
      reservedTickets: this.getReservedTicketsMap(),
      winnerInfo: this.winnerInfo,
    };

    this.io.to('GLOBAL_ROOM').emit('room_state', payload);
    this.io.to('GLOBAL_ROOM').emit('game_state_update', payload);
    this.io.emit('room_state', payload);
    this.io.emit('game_state_update', payload);
  }

  public handleConnection(socket: Socket) {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join single global game room
    socket.join('GLOBAL_ROOM');
    socket.join(this.gameId);

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
      socket.join('GLOBAL_ROOM');
      socket.join(this.gameId);

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

      // Immediately reply with active room state
      socket.emit('room_state', {
        ...initialPayload,
        phase: this.phase,
        timerSeconds: this.timerSeconds,
        gameId: this.gameId,
        calledBalls: this.calledBalls,
        currentBall: this.currentBall,
        winnerInfo: this.winnerInfo,
      });

      this.broadcastRoomState();
    };

    socket.on('join_game', handleJoin);
    socket.on('join_room', handleJoin);

    socket.on('spectate_game', (data: { username?: string }) => {
      socket.join('GLOBAL_ROOM');
      socket.join(this.gameId);

      this.players.set(socket.id, {
        socketId: socket.id,
        username: data?.username || 'Spectator',
        selectedTickets: [],
        stake: 10,
      });

      // Immediately reply with active room state for spectator
      socket.emit('room_state', {
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
