import React, { useState, useEffect, useRef } from 'react';
import { TicketItem, CalledBall, Cartel, Player } from '../types';
import { checkBingoWin } from '../lib/bingo';
import { Volume2, VolumeX, RefreshCw, LogOut, CheckCircle2, Crown, Eye, SlidersHorizontal } from 'lucide-react';
import { socket, emitClaimBingo, emitJoinGame, emitSpectateGame, RoomState } from '../lib/socket';
import { playNumberSound } from '../lib/audioHelper';
import { SoundSettingsModal } from './SoundSettingsModal';

interface CartelCardProps {
  cartel: Cartel;
  cartelIndex: number;
  calledSet: Set<number>;
  headerColors: string[];
  onCellClick: (cartelIndex: number, rIdx: number, cIdx: number) => void;
  isSpectator: boolean;
}

const CartelCard: React.FC<CartelCardProps> = React.memo(({
  cartel,
  cartelIndex,
  calledSet,
  headerColors,
  onCellClick,
  isSpectator,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-col gap-0.5 shrink-0 shadow-md text-slate-900 max-w-[145px] mx-auto w-full">
      <div className="text-center text-[8px] font-black text-amber-600 uppercase tracking-widest">
        TICKET NO #{cartel.ticketNumber}
      </div>

      <div className="grid grid-cols-5 gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
          <div
            key={letter}
            className={`${headerColors[i]} font-black text-center py-0.5 text-[8px] rounded uppercase shadow-sm`}
          >
            {letter}
          </div>
        ))}
        {cartel.grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isFree = cell.number === 'FREE';
            const numVal = isFree ? 0 : (cell.number as number);
            const isCalled = !isFree && calledSet.has(numVal);
            const isDaubed = cell.daubed;

            return (
              <button
                key={`${rIdx}-${cIdx}`}
                onClick={() => !isSpectator && onCellClick(cartelIndex, rIdx, cIdx)}
                className={`
                  aspect-square rounded flex items-center justify-center font-black text-[9px] transition-all cursor-pointer select-none shadow-sm border
                  ${
                    isFree
                      ? 'bg-teal-500 text-white font-black border-teal-600'
                      : isDaubed
                      ? 'bg-orange-500 text-white font-black scale-95 border-orange-600'
                      : isCalled
                      ? 'bg-amber-300 text-slate-950 font-black border-2 border-orange-500 animate-pulse'
                      : 'bg-white text-slate-900 font-bold hover:bg-slate-50 border-slate-200'
                  }
                `}
              >
                {isFree ? '★' : cell.number}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});
CartelCard.displayName = 'CartelCard';

interface PageLiveGameProps {
  player: Player;
  gameId: string;
  stake: number;
  selectedTickets: TicketItem[];
  onLeaveGame: () => void;
  onWin: (prize: number, pattern: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenProfile?: () => void;
}

export const PageLiveGame: React.FC<PageLiveGameProps> = ({
  player,
  gameId,
  stake,
  selectedTickets,
  onLeaveGame,
  onWin,
  soundEnabled,
  setSoundEnabled,
  onOpenProfile,
}) => {
  const isSpectator = selectedTickets.length === 0;
  const [isAutomatic, setIsAutomatic] = useState<boolean>(true);
  const [calledBalls, setCalledBalls] = useState<CalledBall[]>([]);
  const [currentBall, setCurrentBall] = useState<CalledBall | null>(null);
  const [activeCartels, setActiveCartels] = useState<Cartel[]>(
    selectedTickets.map((t) => JSON.parse(JSON.stringify(t.cartel)))
  );
  const [winningInfo, setWinningInfo] = useState<{
    winnerName: string;
    username?: string;
    winnerSocketId?: string;
    cartel: Cartel;
    ticketNumber?: number;
    prize: number;
    pattern: string;
  } | null>(null);
  const [winnerTimer, setWinnerTimer] = useState<number>(5);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState<boolean>(false);

  // Real synchronized players count & Derash from Socket.IO server
  const [playersCount, setPlayersCount] = useState<number>(1);
  const [derash, setDerash] = useState<number>(
    selectedTickets.length > 0 ? selectedTickets.length * stake * 0.8 : 8
  );

  const winHandledRef = useRef<boolean>(false);
  const leaveGameHandledRef = useRef<boolean>(false);

  // Sound Synth
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = (freq: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio fallback
    }
  };

  const activeCartelsRef = useRef<Cartel[]>(activeCartels);
  activeCartelsRef.current = activeCartels;

  const isAutomaticRef = useRef<boolean>(isAutomatic);
  isAutomaticRef.current = isAutomatic;

  const derashRef = useRef<number>(derash);
  derashRef.current = derash;

  // Socket.IO Listener for real-time Synchronized Ball Calling
  useEffect(() => {
    const handleBallCalled = (data: { currentBall: CalledBall; calledBalls: CalledBall[] }) => {
      if (data.currentBall) {
        setCurrentBall(data.currentBall);
        playNumberSound(data.currentBall, soundEnabled);
      }
      if (data.calledBalls) {
        setCalledBalls(data.calledBalls);

        // Auto-daub active cartels for ticket holders
        if (isAutomaticRef.current && data.currentBall && activeCartelsRef.current.length > 0) {
          const ballNum = data.currentBall.number;
          const calledNums = new Set([...data.calledBalls.map((b) => b.number), ballNum]);

          setActiveCartels((prevCartels) => {
            const updatedCartels = prevCartels.map((cartel) => {
              const newGrid = cartel.grid.map((row) =>
                row.map((cell) => {
                  if (typeof cell.number === 'number' && cell.number === ballNum) {
                    return { ...cell, daubed: true };
                  }
                  return cell;
                })
              );
              return { ...cartel, grid: newGrid };
            });

            // Instant auto win check
            if (!winHandledRef.current) {
              for (const cartel of updatedCartels) {
                const winRes = checkBingoWin(cartel.grid, calledNums);
                if (winRes.isWin) {
                  const winnerName = player.first_name || player.username || 'You';
                  emitClaimBingo(winnerName, cartel, winRes.pattern || 'BINGO');
                  break;
                }
              }
            }

            return updatedCartels;
          });
        }
      }
    };

    const handleGameOver = (data: { winnerInfo: any }) => {
      if (data.winnerInfo) {
        const info = {
          winnerName: data.winnerInfo.winnerName,
          username: data.winnerInfo.username,
          winnerSocketId: data.winnerInfo.winnerSocketId,
          cartel: data.winnerInfo.cartel || activeCartelsRef.current[0] || { grid: [], ticketNumber: 1 },
          ticketNumber: data.winnerInfo.ticketNumber || data.winnerInfo.cartel?.ticketNumber,
          prize: data.winnerInfo.prize || derashRef.current,
          pattern: data.winnerInfo.pattern || 'BINGO',
        };
        setWinningInfo(info);

        const currentName = player.first_name || player.username;
        const isMe = data.winnerInfo.winnerSocketId
          ? data.winnerInfo.winnerSocketId === socket.id
          : Boolean(currentName && (data.winnerInfo.winnerName === currentName || data.winnerInfo.username === currentName) && currentName !== 'Player' && currentName !== 'You');

        if (isMe && !winHandledRef.current) {
          winHandledRef.current = true;
          onWin(data.winnerInfo.prize || derashRef.current, data.winnerInfo.pattern || 'BINGO');
        }
      }
    };

    const handleResetToLobby = () => {
      if (!leaveGameHandledRef.current) {
        leaveGameHandledRef.current = true;
        onLeaveGame();
      }
    };

    const handleRoomState = (state: RoomState) => {
      if (typeof state.playersCount === 'number') setPlayersCount(state.playersCount);
      if (typeof state.derash === 'number' && state.derash > 0) setDerash(state.derash);
      if (state.calledBalls && state.calledBalls.length > 0) {
        setCalledBalls(state.calledBalls);
        if (isAutomaticRef.current && activeCartelsRef.current.length > 0) {
          const calledNums = new Set(state.calledBalls.map((b) => b.number));
          setActiveCartels((prevCartels) =>
            prevCartels.map((cartel) => {
              const newGrid = cartel.grid.map((row) =>
                row.map((cell) => {
                  if (typeof cell.number === 'number' && calledNums.has(cell.number)) {
                    return { ...cell, daubed: true };
                  }
                  return cell;
                })
              );
              return { ...cartel, grid: newGrid };
            })
          );
        }
      }
      if (state.currentBall) {
        setCurrentBall(state.currentBall);
      }
      if (state.winnerInfo) {
        setWinningInfo(state.winnerInfo);
      } else if (state.phase === 'TICKET_SELECT') {
        if (!leaveGameHandledRef.current) {
          leaveGameHandledRef.current = true;
          onLeaveGame();
        }
      }
    };

    socket.on('ball_called', handleBallCalled);
    socket.on('game_over', handleGameOver);
    socket.on('winner_announced', handleGameOver);
    socket.on('game_state_update', handleRoomState);
    socket.on('room_state', handleRoomState);
    socket.on('reset_to_lobby', handleResetToLobby);

    // Emit join_game or spectate_game
    const usernameStr = player.first_name || player.username || 'Player';
    if (selectedTickets.length > 0) {
      const ticketNumbers = selectedTickets.map((t) => t.number);
      emitJoinGame(usernameStr, ticketNumbers, stake);
    } else {
      emitSpectateGame(usernameStr);
    }

    return () => {
      socket.off('ball_called', handleBallCalled);
      socket.off('game_over', handleGameOver);
      socket.off('winner_announced', handleGameOver);
      socket.off('game_state_update', handleRoomState);
      socket.off('room_state', handleRoomState);
      socket.off('reset_to_lobby', handleResetToLobby);
    };
  }, [soundEnabled, selectedTickets, player, stake, onLeaveGame, onWin]);

  // Check win condition locally and broadcast claim to socket
  useEffect(() => {
    if (isSpectator || winningInfo || winHandledRef.current) return;

    const calledNums = new Set(calledBalls.map((b) => b.number));
    for (const cartel of activeCartels) {
      const winRes = checkBingoWin(cartel.grid, calledNums);
      if (winRes.isWin) {
        // Send claim request to backend for strict validation.
        // Winner state and prize will be handled upon server 'winner_announced' event.
        const winnerName = player.first_name || player.username || 'You';
        emitClaimBingo(winnerName, cartel, winRes.pattern || 'BINGO');
        break;
      }
    }
  }, [calledBalls, activeCartels, winningInfo, player, isSpectator]);

  // Winner 5-Second Countdown Timer
  useEffect(() => {
    if (!winningInfo) return;
    setWinnerTimer(5);
    leaveGameHandledRef.current = false;

    const interval = setInterval(() => {
      setWinnerTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [winningInfo]);

  // Safely leave game when winner timer reaches 0
  useEffect(() => {
    if (winningInfo && winnerTimer === 0 && !leaveGameHandledRef.current) {
      leaveGameHandledRef.current = true;
      onLeaveGame();
    }
  }, [winningInfo, winnerTimer, onLeaveGame]);

  // Manual daub click handler
  const handleCellClick = (cartelIndex: number, rIdx: number, cIdx: number) => {
    if (isSpectator) return;
    playBeep(650);
    setActiveCartels((prev) =>
      prev.map((c, i) => {
        if (i !== cartelIndex) return c;
        const newGrid = c.grid.map((row, r) =>
          row.map((cell, col) => {
            if (r === rIdx && col === cIdx && cell.number !== 'FREE') {
              return { ...cell, daubed: !cell.daubed };
            }
            return cell;
          })
        );
        return { ...c, grid: newGrid };
      })
    );
  };

  const calledSet = React.useMemo(
    () => new Set(calledBalls.map((b) => b.number)),
    [calledBalls]
  );

  // Colorful B-I-N-G-O letter headers
  const headerColors = [
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-fuchsia-600 text-white',
    'bg-teal-600 text-white',
    'bg-orange-600 text-white',
  ];

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-2 pt-2 pb-20 text-white">


      {/* Top Stats Bar */}
      <div className="grid grid-cols-5 gap-1 bg-[#181d30] border border-slate-800 p-2 rounded-2xl mb-2 text-center">
        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-slate-400 uppercase font-semibold">Game ID</div>
          <div className="text-[10px] font-bold text-slate-200 truncate">{gameId}</div>
        </div>

        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-slate-400 uppercase font-semibold">Players</div>
          <div className="text-xs font-bold text-slate-200">{playersCount}</div>
        </div>

        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-slate-400 uppercase font-semibold">Bet</div>
          <div className="text-xs font-bold text-slate-200">{stake} ETB</div>
        </div>

        <div className="bg-slate-900/80 p-1 rounded-xl flex flex-col items-center justify-center">
          <div className="text-[8px] text-amber-400 font-bold uppercase tracking-wide">ደራሽ</div>
          <div className="text-xs font-black text-amber-300 whitespace-nowrap">{derash} ETB</div>
        </div>

        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-emerald-400 uppercase font-semibold">Called</div>
          <div className="text-xs font-bold text-emerald-400">{calledBalls.length}</div>
        </div>
      </div>

      {/* Main Board Layout (Side-by-side 2 columns: Left 75-Ball Board, Right Live Ball Caller & Vertical Cartels) */}
      <div className="grid grid-cols-12 gap-2 flex-1">
        {/* Left Column: 75-Ball Board (Full 1-75 display - bold & prominent numbers) */}
        <div className="col-span-6 bg-[#181d30] border border-slate-800 rounded-2xl p-2 flex flex-col justify-between shadow-lg">
          <div className="grid grid-cols-5 gap-0.5 text-center font-black text-[11px] mb-1.5 pb-1 border-b border-slate-800">
            <span className="text-blue-400">B</span>
            <span className="text-indigo-400">I</span>
            <span className="text-fuchsia-400">N</span>
            <span className="text-teal-400">G</span>
            <span className="text-orange-400">O</span>
          </div>

          <div className="grid grid-cols-5 gap-0.5 text-center flex-1">
            {Array.from({ length: 15 }).map((_, r) => (
              <React.Fragment key={r}>
                {[0, 1, 2, 3, 4].map((c) => {
                  const num = c * 15 + r + 1;
                  const isCalled = calledSet.has(num);
                  const isLatest = currentBall?.number === num;

                  return (
                    <div
                      key={num}
                      className={`
                        py-1 rounded flex items-center justify-center font-black text-[10px] transition-all border
                        ${
                          isLatest
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300 animate-pulse shadow-md scale-105 z-10'
                            : isCalled
                            ? 'bg-emerald-500/40 text-emerald-200 font-black border-emerald-400/60 shadow-sm'
                            : 'bg-slate-900/90 text-slate-100 font-extrabold border-slate-700/80'
                        }
                      `}
                    >
                      {num}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Column: Live Ball Caller (TOP) + Vertical Scroll Cartels (BOTTOM) */}
        <div className="col-span-6 flex flex-col gap-2 max-h-[520px] overflow-hidden">
          {/* Live Ball Caller ("kuter miwetabete") - TOP */}
          <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-between shadow-md shrink-0">
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                {currentBall ? currentBall.formatted : 'CALLING...'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsSoundModalOpen(true)}
                  title="የድምፅ ማስተካከያ (Sound Files)"
                  className="text-slate-400 hover:text-amber-400 p-0.5 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'ድምፅ አጥፋ' : 'ድምፅ ክፈት'}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Main Ball Circle */}
            <div className="w-13 h-13 my-1 rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center">
                <span className="text-sm font-black text-amber-400 leading-none">
                  {currentBall ? currentBall.formatted : '--'}
                </span>
              </div>
            </div>

            {/* Last Called Balls Row */}
            <div className="w-full flex items-center justify-center gap-0.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
              {calledBalls.slice(-4).reverse().map((b, idx) => (
                <span
                  key={idx}
                  className={`text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {b.formatted}
                </span>
              ))}
            </div>

            {/* Auto Switch */}
            <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800/80 px-1 mt-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">AUTO DAUB</span>
              <input
                type="checkbox"
                checked={isAutomatic}
                onChange={(e) => setIsAutomatic(e.target.checked)}
                className="accent-emerald-500 cursor-pointer w-3.5 h-3.5"
              />
            </div>
          </div>

          {/* Vertical Scrolling Cartels Section (BOTTOM) */}
          {activeCartels.length === 0 ? (
            <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 text-center space-y-1 shadow-md">
              <div className="text-[10px] font-bold text-sky-400 flex items-center justify-center gap-1">
                <span>👀</span>
                <span>ተመልካች Mode</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                የወጡትን ቁጥሮችና የጨዋታውን ሂደት በቀጥታ መከታተል ይችላሉ!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full bg-[#181d30] border border-slate-800 rounded-2xl p-2 shadow-md flex-1 overflow-hidden">
              <div className="flex items-center justify-between text-[9px] font-bold text-amber-400 px-1">
                <span>ካርቴላዎች ({activeCartels.length}):</span>
                {activeCartels.length > 1 && (
                  <span className="text-slate-400 text-[8px] animate-pulse">ወደላይ/ወደታች ↕</span>
                )}
              </div>

              {/* Vertical Scroll Container for Cartels */}
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] py-0.5 px-0.5 scrollbar-thin scrollbar-thumb-amber-500/50 w-full">
                {activeCartels.map((cartel, cartelIdx) => (
                  <div key={cartel.id || cartelIdx} className="w-full flex justify-center">
                    <CartelCard
                      cartel={cartel}
                      cartelIndex={cartelIdx}
                      calledSet={calledSet}
                      headerColors={headerColors}
                      onCellClick={handleCellClick}
                      isSpectator={isSpectator}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <button
          onClick={onLeaveGame}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LEAVE</span>
        </button>

        <button
          onClick={() => playBeep(500)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH</span>
        </button>

        <button
          onClick={() => setIsAutomatic(!isAutomatic)}
          className={`font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
            isAutomatic ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isAutomatic ? 'AUTOMATIC ON' : 'MANUAL'}</span>
        </button>
      </div>

      {/* Mandatory Winner Announcement Modal (5-second auto redirect to lobby, NO close/back buttons) */}
      {winningInfo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121624] border border-amber-500/40 rounded-3xl w-full max-w-sm p-5 shadow-2xl flex flex-col items-center gap-3 relative text-center">
            {/* Crown Icon */}
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Crown className="w-10 h-10 text-amber-400 fill-amber-400 animate-bounce" />
            </div>

            {/* Winner Details */}
            <div>
              <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide">
                {winningInfo.winnerSocketId === socket.id ? '🏆 YOU WON! 🏆' : '🎉 BINGO WINNER! 🎉'}
              </h2>
              <p className="text-lg font-black text-white mt-0.5">
                {winningInfo.winnerName}
              </p>
              {winningInfo.username && winningInfo.username !== winningInfo.winnerName && winningInfo.username !== 'Player' && (
                <p className="text-xs font-semibold text-slate-400">
                  {winningInfo.username}
                </p>
              )}
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/40">
                <span className="text-xs font-bold text-amber-300">
                  Prize Won: <span className="text-sm font-black text-amber-400">{winningInfo.prize} ETB</span>
                </span>
              </div>
              <p className="text-xs font-bold text-slate-300 tracking-widest mt-2 uppercase">
                CARTEL #{winningInfo.cartel?.ticketNumber || winningInfo.ticketNumber || 1}
              </p>
            </div>

            {/* Winning Cartel Board Card */}
            {winningInfo.cartel?.grid && (
              <div className="w-full max-w-[220px] bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xl">
                <div className="grid grid-cols-5 gap-1 mb-1">
                  {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                    <div
                      key={letter}
                      className={`${headerColors[idx]} font-black text-center py-0.5 text-[10px] rounded uppercase shadow-sm`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {winningInfo.cartel.grid.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const isFree = cell.number === 'FREE';
                      const numVal = isFree ? 0 : (cell.number as number);
                      const isCalled = !isFree && calledSet.has(numVal);
                      const isDaubed = cell.daubed || isCalled;

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`
                            aspect-square rounded flex items-center justify-center font-black text-[10px] transition-all shadow-sm border
                            ${
                              isFree
                                ? 'bg-teal-500 text-white border-teal-600'
                                : isDaubed
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-slate-100 text-slate-900 border-slate-200'
                            }
                          `}
                        >
                          {isFree ? '★' : cell.number}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 5-Second Countdown (NO Back/Continue/Close buttons permitted) */}
            <div className="w-full space-y-1.5 pt-2">
              <div className="text-[11px] font-bold text-amber-300 tracking-wider uppercase">
                REDIRECTING TO LOBBY IN {winnerTimer}S
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(winnerTimer / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sound Files & Audio Settings Modal */}
      <SoundSettingsModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
      />
    </div>
  );
};
