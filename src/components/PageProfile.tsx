import React from 'react';
import { Player } from '../types';
import { User, ShieldCheck, Share2, PhoneCall, Wallet, Hash, Phone } from 'lucide-react';

interface PageProfileProps {
  player: Player;
}

export const PageProfile: React.FC<PageProfileProps> = ({ player }) => {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <User className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">TELEGRAM PROFILE</h2>
          <p className="text-xs text-slate-400">Your Connected Account Information</p>
        </div>
      </div>

      <div className="bg-[#181d30] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-4">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.first_name || 'Profile'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
              {player.first_name?.[0] || 'P'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">
              {player.first_name || player.username || 'Player'}
            </h3>
            {player.username && (
              <p className="text-xs text-amber-400 font-medium truncate">
                @{player.username.replace('@', '')}
              </p>
            )}
            <span className="inline-flex items-center gap-1 mt-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Telegram Verified
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" /> Telegram ID:
            </span>
            <span className="font-mono text-white font-bold">{player.telegram_id || player.id}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-400" /> Wallet Balance:
            </span>
            <span className="font-bold text-amber-400 font-mono">{player.balance} ETB</span>
          </div>

          {player.phone_number && (
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" /> Phone Number:
              </span>
              <span className="font-mono text-slate-200">{player.phone_number}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1.5 text-slate-300">
            <span className="text-slate-400">Account Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              Active & Synced
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition">
          <Share2 className="w-4 h-4 text-amber-400" />
          <span>Invite Friends to Lucky Bingo</span>
        </button>

        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition">
          <PhoneCall className="w-4 h-4 text-amber-400" />
          <span>Contact Customer Support</span>
        </button>
      </div>
    </div>
  );
};

