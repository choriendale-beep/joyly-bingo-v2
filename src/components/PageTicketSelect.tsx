import React, { useState, useEffect, useRef } from 'react';
import { Player, TicketItem, Cartel } from '../types';
import { ArrowLeft, RefreshCw, Users, ShieldCheck } from 'lucide-react';
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
  const [activePreviewCartel, setActivePreviewCartel] = useState<Cartel | null>(null);
  const timerExpiredRef = useRef<boolean>(false);

  // Selected tickets count
  const selectedTickets = tickets.filter((t) => t.selected);

  // Emit ticket updates to Socket.IO server whenever user picks/unpicks tickets
  useEffect(() => {
    const selectedNums = selectedTickets.map((t) => t.number);
    emitSelectTickets(player.first_name || player.username || 'Player', selectedNums, stake);
  }, [tickets, player, stake]);

  // Listen to Socket.IO real-time room updates
  useEffect(() => {
    const handleRoomState = (state: RoomState) => {
      setTimerSeconds(state.timerSeconds);
      if (state.playersCount) setRealPlayersCount(state.playersCount);
      if (state.derash) setRealDerash(state.derash);

      if ((state.phase === 'PLAYING' || state.timerSeconds === 0) && !timerExpiredRef.current) {
        timerExpiredRef.current = true;
        onTimerExpired();
      }
    };

    socket.on('room_state', handleRoomState);

    return () => {
      socket.off('room_state', handleRoomState);
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

  // Fallback local timer countdown if socket disconnects briefly
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle timer expiration safely in effect
  useEffect(() => {
    if (timerSeconds === 0 && !timerExpiredRef.current) {
      timerExpiredRef.current = true;
      onTimerExpired();
    }
  }, [timerSeconds, onTimerExpired]);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-3 pt-3 pb-20 text-white">
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

      {/* Top 4-Stats Bar */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#181d30] border border-slate-800 p-2 rounded-2xl mb-3 text-center">
        <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">WALLET</div>
          <div className="text-xs font-bold text-slate-100">{player.mainWallet} ETB</div>
        </div>

        <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">TICKETS</div>
          <div className="text-xs font-bold text-emerald-400">{selectedTickets.length}</div>
        </div>

        <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">STAKE</div>
          <div className="text-xs font-bold text-amber-400">
            {selectedTickets.length > 0 ? selectedTickets.length * 10 : 10} ETB
          </div>
        </div>

        <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-amber-400 font-semibold uppercase">TIMER</div>
          <div className="text-xs font-bold text-amber-400">{timerSeconds}s</div>
        </div>
      </div>

      {/* 1..88 Ticket Grid */}
      <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 max-h-[280px] overflow-y-auto mb-3">
        <div className="grid grid-cols-8 gap-1.5">
          {tickets.map((ticket) => {
            const isSelected = ticket.selected;
            return (
              <button
                key={ticket.number}
                onClick={() => onToggleTicket(ticket.number)}
                className={`
                  aspect-square rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer select-none
                  ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black border border-amber-300'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }
                `}
              >
                {ticket.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Cartel Preview Area (White Cartel Card + Colorful B-I-N-G-O Header) */}
      <div className="w-full bg-[#181d30] border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-col items-center justify-center min-h-[220px] mb-3">
        {activePreviewCartel ? (
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              TICKET #{activePreviewCartel.ticketNumber}
            </span>

            {/* White Cartel Card */}
            <div className="w-full max-w-[210px] bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
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
                    className={`${item.color} font-black text-center py-0.5 text-[10px] rounded uppercase shadow-sm`}
                  >
                    {item.letter}
                  </div>
                ))}
                {activePreviewCartel.grid.map((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`aspect-square font-bold text-[11px] flex items-center justify-center rounded border ${
                        cell.number === 'FREE'
                          ? 'bg-teal-500 text-white font-black border-teal-600'
                          : 'bg-slate-100 text-slate-900 border-slate-200'
                      }`}
                    >
                      {cell.number === 'FREE' ? (
                        <span className="text-white text-[9px]">★</span>
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

      {/* Auto Start Timer Footer */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>Game Starts Automatically</span>
        </div>
        <p className="text-[11px] text-slate-400">
          {selectedTickets.length > 0
            ? `Entering match with ${selectedTickets.length} ticket(s) in ${timerSeconds}s...`
            : `Select your ticket numbers above before timer (${timerSeconds}s) expires.`}
        </p>
      </div>
    </div>
  );
};
