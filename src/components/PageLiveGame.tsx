import React, { useState, useEffect, useRef } from 'react';
import { TicketItem, CalledBall, Cartel, Player } from '../types';
import { checkBingoWin } from '../lib/bingo';
import { Volume2, VolumeX, RefreshCw, LogOut, CheckCircle2, Crown, Eye } from 'lucide-react';
import { socket, emitClaimBingo, emitJoinGame, emitSpectateGame, RoomState } from '../lib/socket';

interface PageLiveGameProps {
  player: Player;
  gameId: string;
  stake: number;
  selectedTickets: TicketItem[];
  onLeaveGame: () => void;
  onWin: (prize: number, pattern: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
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
    cartel: Cartel;
    ticketNumber?: number;
    prize: number;
    pattern: string;
  } | null>(null);
  const [winnerTimer, setWinnerTimer] = useState<number>(5);

  // Real synchronized players count & Derash from Socket.IO server
  const [playersCount, setPlayersCount] = useState<number>(18);
  const [derash, setDerash] = useState<number>(stake * 8 || 80);

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

  // Socket.IO Listener for real-time Synchronized Ball Calling
  useEffect(() => {
    const handleBallCalled = (data: { currentBall: CalledBall; calledBalls: CalledBall[] }) => {
      if (data.currentBall) {
        setCurrentBall(data.currentBall);
        playBeep(450 + (data.currentBall.number % 15) * 15);
      }
      if (data.calledBalls) {
        setCalledBalls(data.calledBalls);

        // Auto-daub active cartels for ticket holders
        if (isAutomatic && data.currentBall && activeCartels.length > 0) {
          const ballNum = data.currentBall.number;
          setActiveCartels((prevCartels) =>
            prevCartels.map((cartel) => {
              const newGrid = cartel.grid.map((row) =>
                row.map((cell) => {
                  if (typeof cell.number === 'number' && cell.number === ballNum) {
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
    };

    const handleGameOver = (data: { winnerInfo: any }) => {
      if (data.winnerInfo) {
        setWinningInfo({
          winnerName: data.winnerInfo.winnerName,
          username: data.winnerInfo.username,
          cartel: data.winnerInfo.cartel || activeCartels[0] || { grid: [], ticketNumber: 1 },
          ticketNumber: data.winnerInfo.ticketNumber || data.winnerInfo.cartel?.ticketNumber,
          prize: data.winnerInfo.prize || derash,
          pattern: data.winnerInfo.pattern || 'BINGO',
        });
      }
    };

    const handleResetToLobby = () => {
      if (!leaveGameHandledRef.current) {
        leaveGameHandledRef.current = true;
        onLeaveGame();
      }
    };

    const handleRoomState = (state: RoomState) => {
      if (state.playersCount) setPlayersCount(state.playersCount);
      if (state.derash) {
        setDerash(Math.max(state.derash, stake * 8));
      } else {
        setDerash(stake * 8);
      }
      if (state.calledBalls && state.calledBalls.length > 0) {
        setCalledBalls(state.calledBalls);
        if (isAutomatic && activeCartels.length > 0) {
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
  }, [isAutomatic, activeCartels, derash, selectedTickets, player, stake, onLeaveGame]);

  // Check win condition locally and broadcast to socket
  useEffect(() => {
    if (isSpectator || winningInfo || winHandledRef.current) return;

    const calledNums = new Set(calledBalls.map((b) => b.number));
    for (const cartel of activeCartels) {
      const winRes = checkBingoWin(cartel.grid, calledNums);
      if (winRes.isWin) {
        winHandledRef.current = true;
        const winnerName = player.first_name || player.username || 'You';
        setWinningInfo({
          winnerName,
          username: player.username,
          cartel,
          ticketNumber: cartel.ticketNumber,
          prize: derash,
          pattern: winRes.pattern || 'BINGO',
        });
        onWin(derash, winRes.pattern || 'BINGO');
        emitClaimBingo(winnerName, cartel, winRes.pattern || 'BINGO');
        break;
      }
    }
  }, [calledBalls, activeCartels, winningInfo, derash, onWin, player, isSpectator]);

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

  const calledSet = new Set(calledBalls.map((b) => b.number));

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
      {/* Spectator Mode Banner */}
      {isSpectator && (
        <div className="flex items-center justify-between bg-sky-950/70 border border-sky-800/80 px-3 py-2 rounded-2xl text-sky-300 text-xs font-bold mb-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Spectating Live Match / ተመልካች</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-sky-400/90 font-mono bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-700/50">
            Observer
          </span>
        </div>
      )}

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

        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-amber-400 uppercase font-semibold">Derash</div>
          <div className="text-xs font-black text-amber-400">{derash}</div>
        </div>

        <div className="bg-slate-900/80 p-1 rounded-xl">
          <div className="text-[8px] text-emerald-400 uppercase font-semibold">Called</div>
          <div className="text-xs font-bold text-emerald-400">{calledBalls.length}</div>
        </div>
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-12 gap-2 flex-1">
        {/* Left: 75-Ball Board */}
        <div className="col-span-6 bg-[#181d30] border border-slate-800 rounded-2xl p-2 flex flex-col justify-between">
          <div className="grid grid-cols-5 gap-0.5 text-center font-black text-xs mb-1">
            <span className="text-blue-400">B</span>
            <span className="text-indigo-400">I</span>
            <span className="text-fuchsia-400">N</span>
            <span className="text-teal-400">G</span>
            <span className="text-orange-400">O</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-center flex-1">
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
                        py-1 rounded flex items-center justify-center font-semibold transition-all
                        ${
                          isLatest
                            ? 'bg-amber-400 text-slate-950 font-black animate-pulse shadow-md'
                            : isCalled
                            ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                            : 'bg-slate-800/60 text-slate-400'
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

        {/* Right: Ball Caller + Selected Cartels */}
        <div className="col-span-6 flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-0.5">
          {/* Live Ball Caller */}
          <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2 flex flex-col items-center justify-between shrink-0">
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                {currentBall ? currentBall.formatted : 'CALLING...'}
              </span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Ball Circle */}
            <div className="w-14 h-14 my-1 rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center">
                <span className="text-sm font-black text-amber-400 leading-none">
                  {currentBall ? currentBall.formatted : '--'}
                </span>
              </div>
            </div>

            {/* Auto Switch */}
            <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800/80 px-1">
              <span className="text-[9px] font-bold text-slate-400">AUTOMATIC</span>
              <input
                type="checkbox"
                checked={isAutomatic}
                onChange={(e) => setIsAutomatic(e.target.checked)}
                className="accent-emerald-500 cursor-pointer w-4 h-4"
              />
            </div>
          </div>

          {/* Spectator Card when no tickets are selected */}
          {activeCartels.length === 0 && (
            <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-4 text-center space-y-1.5 shadow-md shrink-0">
              <div className="text-xs font-bold text-sky-400 flex items-center justify-center gap-1.5">
                <span>👀</span>
                <span>ተመልካች (Spectator Mode)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                ካርቴላ አልመረጡም። የወጡትን ቁጥሮችና የጨዋታውን ሂደት በቀጥታ መከታተል ይችላሉ!
              </p>
            </div>
          )}

          {/* ALL Selected Cartels Display (White Cartel Card with colorful B-I-N-G-O header) */}
          {activeCartels.map((cartel, cartelIdx) => (
            <div
              key={cartel.id || cartelIdx}
              className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-col gap-1 shrink-0 shadow-lg text-slate-900"
            >
              <div className="text-center text-[10px] font-black text-amber-600 uppercase tracking-widest">
                TICKET NO #{cartel.ticketNumber}
              </div>

              {/* 5x5 Grid */}
              <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                  <div
                    key={letter}
                    className={`${headerColors[i]} font-black text-center py-0.5 text-[10px] rounded uppercase shadow-sm`}
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
                        onClick={() => handleCellClick(cartelIdx, rIdx, cIdx)}
                        className={`
                          aspect-square rounded flex items-center justify-center font-black text-[11px] transition-all cursor-pointer select-none shadow-sm border
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
          ))}
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
                🎉 BINGO WINNER! 🎉
              </h2>
              <p className="text-lg font-black text-white mt-0.5">
                {winningInfo.winnerName}
              </p>
              {winningInfo.username && (
                <p className="text-xs font-semibold text-slate-400">
                  @{winningInfo.username}
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
    </div>
  );
};
