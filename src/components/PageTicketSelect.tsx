import React, { useState, useEffect } from 'react';
import { Player, TicketItem, Cartel } from '../types';
import { ArrowLeft, RefreshCw, Lock, Clock } from 'lucide-react';
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
  const [realDerash, setRealDerash] = useState<number>(0);
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

  // Local fallback timer countdown (counts down smoothly to 0 without resetting to 35 on its own)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 0; // Hold smoothly at 0 until game transitions or server resets timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // Listen to Socket.IO real-time room updates
  useEffect(() => {
    const handleRoomState = (state: RoomState) => {
      if (typeof state.timerSeconds === 'number') setTimerSeconds(state.timerSeconds);
      if (typeof state.playersCount === 'number') setRealPlayersCount(state.playersCount);
      if (typeof state.derash === 'number') setRealDerash(state.derash);
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
          <div className="text-[9px] text-slate-400 font-semibold uppercase">PLAYERS</div>
          <div className="text-xs font-bold text-sky-400">{realPlayersCount}</div>
        </div>

        <div className="bg-slate-900/65 p-1.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">STAKE</div>
          <div className="text-[11px] font-bold text-amber-300 truncate">
            {selectedTickets.length * stake} ETB
          </div>
        </div>

        <div className="bg-slate-900/65 p-1.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">BALANCE</div>
          <div className="text-[11px] font-bold text-emerald-400 truncate">{player.balance} ETB</div>
        </div>

        <div className={`p-1.5 rounded-xl border flex flex-col justify-center transition-all ${
          timerSeconds <= 5 && timerSeconds > 0
            ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
            : timerSeconds === 0
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="text-[9px] font-bold uppercase">
            {timerSeconds === 0 ? 'STATUS' : 'TIMER'}
          </div>
          <div className="text-xs font-black">
            {timerSeconds === 0 ? 'STARTING...' : `${timerSeconds}s`}
          </div>
        </div>
      </div>


      {/* 1..400 Ticket Grid */}
      <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 max-h-[240px] overflow-y-auto mb-2.5">
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
                title={isTakenByOther ? `በሌላ ሰው የተያዘ: ${reservedOwner}` : `Ticket #${ticket.number}`}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center font-extrabold text-xs transition-all cursor-pointer select-none relative
                  ${
                    isTakenByOther
                      ? 'bg-orange-600 text-white border border-orange-400 shadow-sm opacity-90 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-400 text-slate-950 font-black border-2 border-white shadow-lg scale-105 ring-2 ring-amber-400/50'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }
                `}
              >
                <span>{ticket.number}</span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold border border-white">
                    ✓
                  </span>
                )}
                {isTakenByOther && (
                  <span className="text-[7px] text-orange-200 truncate max-w-full px-0.5 leading-none mt-0.5">
                    {reservedOwner.slice(0, 5)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Tickets Summary Bar */}
      <div className="bg-[#181d30] border border-slate-800 rounded-xl p-2 mb-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-amber-400 uppercase tracking-wider">
            የመረጧቸው ካርቴላዎች ({selectedTickets.length}/6):
          </span>
          <span className="text-slate-400 text-[10px]">
            {selectedTickets.length === 0 ? 'ካርቴላ አልመረጡም' : selectedTickets.map(t => `#${t.number}`).join(', ')}
          </span>
        </div>
        {selectedTickets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {selectedTickets.map((t) => (
              <div
                key={t.number}
                className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <span>#{t.number}</span>
                <button
                  onClick={() => onToggleTicket(t.number)}
                  className="hover:text-white text-amber-400 font-black text-sm leading-none cursor-pointer"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Cartel Preview Area (White Cartel Card + Colorful B-I-N-G-O Header with Vertical Scrolling) */}
      <div className="w-full bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-col items-center justify-center min-h-[220px]">
        {selectedTickets.length > 0 ? (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 px-1">
              <span>የተመረጡ ካርቴላዎች ({selectedTickets.length}):</span>
              {selectedTickets.length > 1 && (
                <span className="text-slate-400 text-[9px] animate-pulse">ወደላይ/ወደታች ↕</span>
              )}
            </div>

            {/* Vertical Scrolling Container for Cartels */}
            <div className="flex flex-col items-center gap-3 py-1 px-1 overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-amber-500/50 w-full">
              {selectedTickets.map((ticketItem) => {
                const cartel = ticketItem.cartel || activePreviewCartel;
                if (!cartel) return null;

                return (
                  <div
                    key={ticketItem.number}
                    className="flex flex-col items-center gap-1 bg-white/5 border border-slate-700/60 p-2 rounded-xl w-full max-w-[170px]"
                  >
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      TICKET #{ticketItem.number}
                    </span>

                    {/* White Cartel Card */}
                    <div className="w-[145px] sm:w-[155px] bg-white p-1.5 rounded-xl shadow-md border border-slate-200">
                      <div className="grid grid-cols-5 gap-0.5">
                        {[
                          { letter: 'B', color: 'bg-blue-600 text-white' },
                          { letter: 'I', color: 'bg-indigo-600 text-white' },
                          { letter: 'N', color: 'bg-fuchsia-600 text-white' },
                          { letter: 'G', color: 'bg-teal-600 text-white' },
                          { letter: 'O', color: 'bg-orange-600 text-white' },
                        ].map((item) => (
                          <div
                            key={item.letter}
                            className={`${item.color} font-black text-center py-0.5 text-[8px] rounded uppercase shadow-sm`}
                          >
                            {item.letter}
                          </div>
                        ))}
                        {cartel.grid.map((row, rIdx) =>
                          row.map((cell, cIdx) => (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`aspect-square font-bold text-[9px] flex items-center justify-center rounded border ${
                                cell.number === 'FREE'
                                  ? 'bg-teal-500 text-white font-black border-teal-600'
                                  : 'bg-slate-100 text-slate-900 border-slate-200'
                              }`}
                            >
                              {cell.number === 'FREE' ? (
                                <span className="text-white text-[7px]">★</span>
                              ) : (
                                cell.number
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            ከላይ ካርቴላዎችን (1–400) በመንካት ይምረጡና ይመልከቱ
          </div>
        )}
      </div>
    </div>
  );
};

