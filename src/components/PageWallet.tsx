import React from 'react';
import { Player } from '../types';
import { Wallet, History } from 'lucide-react';

interface PageWalletProps {
  player: Player;
  onOpenTransactions: () => void;
}

export const PageWallet: React.FC<PageWalletProps> = ({
  player,
  onOpenTransactions,
}) => {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Wallet className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">MY WALLET</h2>
          <p className="text-xs text-slate-400">Balance & Transaction History</p>
        </div>
      </div>

      {/* Wallet Balance Display */}
      <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Wallet className="w-24 h-24 text-amber-500" />
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 relative z-10">TOTAL BALANCE</span>
        <div className="text-4xl font-black text-white relative z-10">
          {player.balance} <span className="text-sm text-amber-400 font-bold ml-1">ETB</span>
        </div>
      </div>

      {/* View All Transactions Button */}
      <div className="pt-2">
        <button
          onClick={onOpenTransactions}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
        >
          <History className="w-5 h-5 text-slate-950" />
          <span>VIEW ALL TRANSACTIONS (የሂሳብ እንቅስቃሴዎች)</span>
        </button>
      </div>
    </div>
  );
};

