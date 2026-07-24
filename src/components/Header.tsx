import React from 'react';
import { Wallet, PlusCircle, ArrowUpRight, Volume2, VolumeX, HelpCircle, History } from 'lucide-react';
import { Player } from '../types';

interface HeaderProps {
  player: Player;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenTransactions: () => void;
  onOpenHelp: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  player,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransactions,
  onOpenHelp,
  soundEnabled,
  setSoundEnabled,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center font-black text-xl text-slate-950 shadow-lg shadow-amber-500/20">
            B
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              LUCKY BINGO
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Real-time Multiplayer Bingo</p>
          </div>
        </div>

        {/* Balance Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
            <div className="bg-amber-500/20 text-amber-400 p-1 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold leading-tight">Balance</div>
              <div className="text-sm font-bold text-amber-400 leading-tight">
                {player.mainWallet + player.playWallet} <span className="text-xs font-normal text-amber-200">ETB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenDeposit}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow-sm active:scale-95 cursor-pointer"
              title="Deposit Funds"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Deposit</span>
            </button>

            <button
              onClick={onOpenWithdraw}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="Withdraw Funds"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Withdraw</span>
            </button>

            <button
              onClick={onOpenTransactions}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
              title="Transaction History"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
              title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={onOpenHelp}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
