import React, { useEffect, useState } from 'react';
import { Trophy, Award, UserCheck, Calendar, Flame, Crown } from 'lucide-react';
import { ScoreEntry, Player } from '../types';
import { getScoresLeaderboard, getStoredPlayer } from '../lib/storage';

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export const PageScores: React.FC = () => {
  const [leaderboards, setLeaderboards] = useState<ScoreEntry[]>([]);
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const p = getStoredPlayer();
    setPlayer(p);
  }, []);

  useEffect(() => {
    // Fast initial load from local cache if alltime
    if (period === 'alltime') {
      const scores = getScoresLeaderboard();
      if (scores.length > 0) {
        setLeaderboards(scores.slice(0, 10));
      }
    }

    setLoading(true);
    // Fetch live leaderboard from server for selected timeframe
    fetch(`/api/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.leaderboard)) {
          setLeaderboards(data.leaderboard.slice(0, 10));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const periodTabs: { id: LeaderboardPeriod; label: string; subLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'daily', label: 'DAILY', subLabel: 'የዛሬ', icon: Flame },
    { id: 'weekly', label: 'WEEKLY', subLabel: 'የሳምንቱ', icon: Calendar },
    { id: 'monthly', label: 'MONTHLY', subLabel: 'የወሩ', icon: Trophy },
    { id: 'alltime', label: 'TOP 10', subLabel: 'የምንግዜውም', icon: Crown },
  ];

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">TOP 10 LEADERBOARD</h2>
          <p className="text-xs text-slate-400">Daily, Weekly & Monthly Player Rankings</p>
        </div>
      </div>

      {/* Period Selection Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#121624] p-1.5 rounded-2xl border border-slate-800">
        {periodTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = period === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer text-center ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 font-semibold'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
              </div>
              <span className={`text-[9px] ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                {tab.subLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current Player Status Card */}
      {player && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-amber-400 uppercase tracking-wide">YOUR ACCOUNT</div>
              <div className="text-sm font-bold text-white">
                {player.first_name || player.username || 'Player'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400">Balance</div>
            <div className="text-sm font-black text-amber-400">{player.balance} ETB</div>
          </div>
        </div>
      )}

      {/* Leaderboard List Header */}
      <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-1">
        <span>TOP 10 WINNERS ({period.toUpperCase()})</span>
        <span>PRIZE WON</span>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
            Loading Top 10 rankings...
          </div>
        ) : leaderboards.length > 0 ? (
          leaderboards.map((item, idx) => (
            <div
              key={`${item.id || 'score'}-${idx}`}
              className={`border rounded-2xl p-3 flex items-center justify-between transition ${
                item.rank === 1
                  ? 'bg-gradient-to-r from-amber-500/15 via-[#181d30] to-[#181d30] border-amber-500/50 shadow-lg'
                  : item.rank === 2
                  ? 'bg-gradient-to-r from-slate-400/10 via-[#181d30] to-[#181d30] border-slate-400/40'
                  : item.rank === 3
                  ? 'bg-gradient-to-r from-amber-700/15 via-[#181d30] to-[#181d30] border-amber-700/40'
                  : 'bg-[#181d30] border-slate-800/90'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                    item.rank === 1
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : item.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {item.rank === 1 ? <Trophy className="w-4 h-4 text-slate-950" /> : `#${item.rank}`}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {item.username}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.wins} Wins {item.gamesPlayed ? `• ${item.gamesPlayed} Played` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-black text-amber-400">{item.totalEarnings} ETB</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Total Earnings</div>
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

