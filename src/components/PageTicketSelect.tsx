import React, { useState, useEffect } from 'react';
import { Player, TicketItem, Cartel } from '../types';
import { ArrowLeft, RefreshCw, Lock } from 'lucide-react';
import { socket, emitSelectTickets, RoomState } from '../lib/socket';

interface PageTicketSelectProps {
  player: Player;
  stake: number;
  tickets: TicketItem[];
  onToggleTicket: (ticketNum: number) => void;
  onRefreshTickets: () => void;
  onBackToHome: () => void;
  onTimerExpired: () => void;
}

export const PageTicketSelect: React.FC<PageTicketSelectProps> = ({
  player,
  stake,
  tickets,
  onToggleTicket,
  onRefreshTickets,
  onBackToHome,
  onTimerExpired,
}) => {
  const [timerSeconds, setTimerSeconds] = useState<number>(35);
  const [realPlayersCount, setRealPlayersCount] = useState<number>(1);
  const [realDerash, setRealDerash] = useState<number>(120);
  const [reservedTicketsMap, setReservedTicketsMap] = useState<Record<number, string>>({});
  const [activePreviewCartel, setActivePreviewCartel] = useState<Cartel | null>(null);

  // Selected tickets count
  const selectedTickets = tickets.filter((t) => t.selected);

  // Emit ticket updates to Socket.IO server whenever user picks/unpicks tickets
  useEffect(() => {
    const selectedNums = selectedTickets.map((t) => t.number);
    const myName = player.first_name || player.username || 'Player';
    emitSelectTickets(myName, selectedNums, stake);
  }, [tickets, player, stake]);

  // Local fallback 35-second timer countdown
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerSeconds((prev) => (prev <= 1 ? 35 : prev - 1));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // Listen to Socket.IO real-time room updates
  useEffect(() => {
    const handleRoomState = (state: RoomState) => {
      if (typeof state.timerSeconds === 'number') setTimerSeconds(state.timerSeconds);
      if (state.playersCount) setRealPlayersCount(state.playersCount);
      if (state.derash) setRealDerash(state.derash);
      if (state.reservedTickets) setReservedTicketsMap(state.reservedTickets);

      if (state.phase === 'PLAYING') {
        onTimerExpired();
      }
    };

    socket.on('room_state', handleRoomState);
    socket.on('game_state_update', handleRoomState);

    return () => {
      socket.off('room_state', handleRoomState);
      socket.off('game_state_update', handleRoomState);
    };
  }, [onTimerExpired]);

  // Update preview cartel to last selected or first selected
  useEffect(() => {
    if (selectedTickets.length > 0) {
      setActivePreviewCartel(selectedTickets[selectedTickets.length - 1].cartel);
    } else {
      setActivePreviewCartel(null);
    }
  }, [tickets]);

  const currentUserName = player.first_name || player.username || 'Player';

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-3 pt-3 pb-6 text-white">
      {/* Navigation Header */}
      <div className="flex items-center justify-between py-2 mb-2">
        <button
          onClick={onBackToHome}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={onRefreshTickets}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Stats Bar */}
      <div className="grid grid-cols-4 gap-2 bg-[#181d30] border border-slate-800 p-2.5 rounded-2xl mb-3 text-center">
        <div className="bg-slate-900/65 p-1.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">WALLET</div>
          <div className="text-[11px] font-bold text-slate-100 truncate">{player.balance} ETB</div>
        </div>

        <div className="bg-slate-900/65 p-1.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">TICKETS</div>
          <div className="text-xs font-bold text-emerald-400">{selectedTickets.length}</div>
        </div>

        <div className="bg-slate-900/65 p-1.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">STAKE</div>
          <div className="text-[11px] font-bold text-amber-400 truncate">
            {selectedTickets.length * stake} ETB
          </div>
        </div>

        <div className="bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/30 flex flex-col justify-center animate-pulse">
          <div className="text-[9px] text-amber-400 font-bold uppercase">TIMER</div>
          <div className="text-xs font-black text-amber-300">
            {timerSeconds}s
          </div>
        </div>
      </div>

      {/* 1..400 Ticket Grid */}
      <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 max-h-[260px] overflow-y-auto mb-3">
        <div className="grid grid-cols-8 gap-1.5">
          {tickets.map((ticket) => {
            const isSelected = ticket.selected;
            const reservedOwner = reservedTicketsMap[ticket.number];
            const isTakenByOther = Boolean(reservedOwner && reservedOwner !== currentUserName && !isSelected);

            return (
              <button
                key={ticket.number}
                disabled={isTakenByOther}
                onClick={() => !isTakenByOther && onToggleTicket(ticket.number)}
                title={isTakenByOther ? `Taken by ${reservedOwner}` : `Ticket #${ticket.number}`}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center font-bold text-xs transition-colors cursor-pointer select-none relative
                  ${
                    isTakenByOther
                      ? 'bg-slate-900/90 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }
                `}
              >
                {isTakenByOther ? (
                  <Lock className="w-3 h-3 text-red-400/70" />
                ) : (
                  ticket.number
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Cartel Preview Area (White Cartel Card + Colorful B-I-N-G-O Header) */}
      <div className="w-full bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-col items-center justify-center min-h-[210px]">
        {activePreviewCartel ? (
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              TICKET #{activePreviewCartel.ticketNumber}
            </span>

            {/* White Cartel Card */}
            <div className="w-full max-w-[200px] bg-white p-2 rounded-xl shadow-lg border border-slate-200">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { letter: 'B', color: 'bg-blue-600 text-white' },
                  { letter: 'I', color: 'bg-indigo-600 text-white' },
                  { letter: 'N', color: 'bg-fuchsia-600 text-white' },
                  { letter: 'G', color: 'bg-teal-600 text-white' },
                  { letter: 'O', color: 'bg-orange-600 text-white' },
                ].map((item) => (
                  <div
                    key={item.letter}
                    className={`${item.color} font-black text-center py-0.5 text-[9px] rounded uppercase shadow-sm`}
                  >
                    {item.letter}
                  </div>
                ))}
                {activePreviewCartel.grid.map((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`aspect-square font-bold text-[10px] flex items-center justify-center rounded border ${
                        cell.number === 'FREE'
                          ? 'bg-teal-500 text-white font-black border-teal-600'
                          : 'bg-slate-100 text-slate-900 border-slate-200'
                      }`}
                    >
                      {cell.number === 'FREE' ? (
                        <span className="text-white text-[8px]">★</span>
                      ) : (
                        cell.number
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            Tap any ticket (1–400) above to select and view board
          </div>
        )}
      </div>
    </div>
  );
};

