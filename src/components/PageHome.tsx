import React from 'react';
import { Player } from '../types';
import { Play, Gift } from 'lucide-react';

interface PageHomeProps {
  player: Player;
  selectedStake: number;
  setSelectedStake: (stake: number) => void;
  onOpenRules: () => void;
  onStartTicketSelect: () => void;
  onQuickAddBonus?: () => void;
}

export const PageHome: React.FC<PageHomeProps> = ({
  player,
  selectedStake,
  setSelectedStake,
  onOpenRules,
  onStartTicketSelect,
  onQuickAddBonus,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-lg font-black tracking-wider text-amber-400 uppercase">
          LUCKY BINGO
        </h1>
        <button
          onClick={onOpenRules}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition"
        >
          Rules
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
            Welcome to
          </h2>
          <h2 className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
            LUCKY BINGO
          </h2>
        </div>

        {/* Card Frame */}
        <div className="w-full bg-[#181d30]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            CHOOSE YOUR STAKE
          </span>

          {/* Stake Selector - Single 10 ETB option */}
          <div className="w-full flex justify-center">
            <div className="bg-amber-500 text-slate-950 font-black py-2.5 px-8 rounded-xl text-sm border border-amber-400 shadow-md shadow-amber-500/20 scale-105">
              10 ETB
            </div>
          </div>

          {/* PLAY Button */}
          <button
            onClick={onStartTicketSelect}
            className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black py-4 rounded-2xl text-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY 10 ETB</span>
          </button>

          {/* Quick Bonus / Add Funds Button */}
          {onQuickAddBonus && (
            <button
              onClick={onQuickAddBonus}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span>CLAIM +100 ETB FREE GAME BONUS</span>
            </button>
          )}

          {/* Wallet Balance Display */}
          <div className="text-center space-y-1 border-t border-slate-800/80 pt-4 w-full">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              WALLET BALANCE
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {player.mainWallet + player.playWallet} <span className="text-sm font-bold text-amber-400">ETB</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Main ({player.mainWallet}) + Play ({player.playWallet}) ETB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
