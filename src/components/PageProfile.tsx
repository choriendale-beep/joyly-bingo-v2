import React from 'react';
import { Player } from '../types';
import { User, ShieldCheck, Share2, PhoneCall } from 'lucide-react';

interface PageProfileProps {
  player: Player;
}

export const PageProfile: React.FC<PageProfileProps> = ({ player }) => {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <User className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">MY PROFILE</h2>
          <p className="text-xs text-slate-400">Account Details & Telegram Link</p>
        </div>
      </div>

      <div className="bg-[#181d30] border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
            {player.first_name?.[0] || 'L'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{player.first_name || 'Lucky Player'}</h3>
            <p className="text-xs text-amber-400">@{player.username || 'lucky_player'}</p>
            <span className="inline-block mt-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
              Verified Telegram Account
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
            <span className="text-slate-400">Player ID:</span>
            <span className="font-mono">{player.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
            <span className="text-slate-400">Account Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Active
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer">
          <Share2 className="w-4 h-4 text-amber-400" />
          <span>Invite Friends & Get 5 ETB Bonus</span>
        </button>

        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer">
          <PhoneCall className="w-4 h-4 text-amber-400" />
          <span>Contact Support (@edilbingo_support)</span>
        </button>
      </div>
    </div>
  );
};
