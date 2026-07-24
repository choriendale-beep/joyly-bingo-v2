import React, { useEffect, useState } from 'react';
import { Trophy, Award, Medal, UserCheck } from 'lucide-react';
import { ScoreEntry, Player } from '../types';
import { getScoresLeaderboard, getStoredPlayer } from '../lib/storage';

export const PageScores: React.FC = () => {
  const [leaderboards, setLeaderboards] = useState<ScoreEntry[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const p = getStoredPlayer();
    setPlayer(p);
    
    // Fast initial load from local cache
    const scores = getScoresLeaderboard();
    setLeaderboards(scores);

    // Fetch live leaderboard from MongoDB Atlas
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.leaderboard) {
          setLeaderboards(data.leaderboard);
        }
      })
      .catch((err) => console.error('Failed to fetch live leaderboard:', err));
  }, []);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">SCORES & LEADERBOARD</h2>
          <p className="text-xs text-slate-400">Real Registered Player Tournament Rankings</p>
        </div>
      </div>

      {/* Real Player Card */}
      {player && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-wide">YOUR ACCOUNT</div>
              <div className="text-sm font-bold text-white">
                {player.first_name || player.username || 'Player'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-300">Main Balance</div>
            <div className="text-sm font-black text-amber-400">{player.mainWallet} ETB</div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboards.length > 0 ? (
          leaderboards.map((item) => (
            <div
              key={item.id}
              className="bg-[#181d30] border border-slate-800 rounded-2xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                    item.rank === 1
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : item.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.rank === 1 ? <Trophy className="w-4 h-4" /> : `#${item.rank}`}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.username}</div>
                  <div className="text-[10px] text-slate-400">{item.wins} Wins</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-amber-400">{item.totalEarnings} ETB</div>
                <div className="text-[9px] text-slate-400 uppercase font-semibold">Total Prize</div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">No Leaderboard Wins Recorded Yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Play real Bingo games and win the Derash jackpot to claim the #1 spot on the leaderboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
