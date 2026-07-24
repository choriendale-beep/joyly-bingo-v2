import React from 'react';
import { Player } from '../types';
import { Wallet, PlusCircle, ArrowUpRight, History, Gift } from 'lucide-react';

interface PageWalletProps {
  player: Player;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenTransactions: () => void;
  onClaimBonus?: () => void;
}

export const PageWallet: React.FC<PageWalletProps> = ({
  player,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransactions,
  onClaimBonus,
}) => {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-20 text-white space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Wallet className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">WALLET & FUNDS</h2>
          <p className="text-xs text-slate-400">Manage Your Play & Main Wallets</p>
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">MAIN WALLET</span>
          <div className="text-2xl font-black text-white my-1">{player.mainWallet} <span className="text-xs text-slate-400 font-normal">ETB</span></div>
          <span className="text-[10px] text-slate-500">Withdrawable</span>
        </div>

        <div className="bg-[#181d30] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-400 uppercase">PLAY WALLET</span>
          <div className="text-2xl font-black text-amber-400 my-1">{player.playWallet} <span className="text-xs text-amber-200 font-normal">ETB</span></div>
          <span className="text-[10px] text-slate-500">Bonus Funds</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        {onClaimBonus && (
          <button
            onClick={onClaimBonus}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold py-3.5 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>CLAIM DAILY GAME BONUS (+50 ETB)</span>
          </button>
        )}

        <button
          onClick={onOpenDeposit}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-3.5 rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>DEPOSIT VIA TELEBIRR / CBE</span>
        </button>

        <button
          onClick={onOpenWithdraw}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-2xl text-sm border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
        >
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
          <span>WITHDRAW FUNDS</span>
        </button>

        <button
          onClick={onOpenTransactions}
          className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-3 rounded-2xl text-xs border border-slate-800 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <History className="w-4 h-4" />
          <span>View All Transactions</span>
        </button>
      </div>
    </div>
  );
};
