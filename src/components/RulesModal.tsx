import React from 'react';
import { X, BookOpen, CheckCircle2 } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#181d30] border border-slate-700/80 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">LUCKY BINGO Rules</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>1. Choose Stake:</strong> Pick your stake (10, 20, 50 ETB) and tap <strong>PLAY</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>2. Select Tickets (Max 6):</strong> Pick 1 to 6 Cartels from the 1..400 grid before the timer ends.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>3. Reserved Tickets:</strong> Tickets taken by other players turn <strong>ORANGE</strong> and cannot be selected by anyone else.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>4. Live Drawing:</strong> Numbers 1–75 are called automatically. Match numbers on your Cartel!</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>5. Win Derash (Pot):</strong> Complete a line (row, col, diagonal, 4 corners) to trigger automatic or manual BINGO win!</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
        >
          Understand & Play
        </button>
      </div>
    </div>
  );
};
