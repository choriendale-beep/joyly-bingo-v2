import React from 'react';
import { Cartel } from '../types';
import { Check } from 'lucide-react';

interface BingoCartelProps {
  cartel: Cartel;
  onToggleCell: (cartelId: string, rowIndex: number, colIndex: number) => void;
  calledNumbersSet: Set<number>;
  cardIndex: number;
}

const BINGO_HEADERS = ['B', 'I', 'N', 'G', 'O'];
const HEADER_COLORS = [
  'from-rose-500 to-red-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-sky-500 to-blue-600',
  'from-purple-500 to-indigo-600',
];

export const BingoCartel: React.FC<BingoCartelProps> = ({
  cartel,
  onToggleCell,
  calledNumbersSet,
  cardIndex,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2 relative overflow-hidden">
      {/* Cartel Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Cartel #{cardIndex + 1}
        </span>
        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
          ID: {cartel.id.slice(-6)}
        </span>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Column Headers B-I-N-G-O */}
        {BINGO_HEADERS.map((letter, idx) => (
          <div
            key={letter}
            className={`bg-gradient-to-b ${HEADER_COLORS[idx]} text-white font-black text-center py-1.5 rounded-lg text-sm sm:text-base shadow-sm`}
          >
            {letter}
          </div>
        ))}

        {/* 5x5 Matrix */}
        {cartel.grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isFree = cell.number === 'FREE';
            const numVal = isFree ? 0 : (cell.number as number);
            const isCalled = !isFree && calledNumbersSet.has(numVal);
            const isDaubed = cell.daubed;

            return (
              <button
                key={`${rIdx}-${cIdx}`}
                onClick={() => onToggleCell(cartel.id, rIdx, cIdx)}
                disabled={isFree}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center font-bold text-sm sm:text-base transition-all duration-150 relative cursor-pointer select-none
                  ${
                    isFree
                      ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/50 font-black'
                      : isDaubed
                      ? isCalled
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black shadow-md scale-95 border border-amber-300'
                        : 'bg-slate-800 text-amber-400/80 border-2 border-dashed border-amber-500/40'
                      : isCalled
                      ? 'bg-slate-800/90 text-amber-400 border-2 border-amber-500/80 animate-pulse'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                  }
                `}
              >
                {isFree ? (
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-300">
                    FREE
                  </span>
                ) : (
                  <>
                    <span>{cell.number}</span>
                    {isDaubed && (
                      <div className="absolute inset-0 bg-amber-500/20 rounded-xl flex items-center justify-center pointer-events-none">
                        <Check className="w-5 h-5 text-amber-950 stroke-[3]" />
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
