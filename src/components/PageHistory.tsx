import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, History } from 'lucide-react';
import { GameHistoryEntry } from '../types';
import { getGameHistory, getStoredPlayer } from '../lib/storage';

export const PageHistory: React.FC = () => {
  const [historyData, setHistoryData] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const p = getStoredPlayer();
    // Fast local fallback
    const localHistory = getGameHistory();
    setHistoryData(localHistory);

    // Fetch live from MongoDB Atlas
    fetch(`/api/history/${p.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.history) {
          // Map to match front-end types
          const formatted = data.history.map((h: any) => ({
            id: h.id,
            gameId: h.gameId,
            date: h.date,
            stake: h.stake,
            ticketsCount: h.ticketsCount,
            potWon: h.potWon,
            status: h.status,
            pattern: h.pattern,
          }));
          setHistoryData(formatted);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Clock className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">MATCH HISTORY</h2>
          <p className="text-xs text-slate-400">Your Actual Played Game Sessions</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {historyData.length > 0 ? (
          historyData.map((item, index) => (
            <div
              key={`${item.id || 'hist'}-${index}`}
              className="bg-[#181d30] border border-slate-800 rounded-2xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    item.status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.status === 'WON' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Game #{item.gameId}</div>
                  <div className="text-[10px] text-slate-400">
                    {item.ticketsCount} Ticket(s) • Stake {item.stake} ETB
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-black ${
                    item.status === 'WON' ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {item.status === 'WON' ? `+${item.potWon} ETB` : '0 ETB'}
                </div>
                <div className="text-[10px] text-slate-500">{item.date}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">No Match History Yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              You haven't played any games yet. Choose your cartels and enter a live match to see your history here!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
