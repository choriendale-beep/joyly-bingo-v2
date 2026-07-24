import React, { useState } from 'react';
import { CalledBall } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface NumberBoard75Props {
  calledBalls: CalledBall[];
}

const COLUMNS = [
  { letter: 'B', range: [1, 15], color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { letter: 'I', range: [16, 30], color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { letter: 'N', range: [31, 45], color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { letter: 'G', range: [46, 60], color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { letter: 'O', range: [61, 75], color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
];

export const NumberBoard75: React.FC<NumberBoard75Props> = ({ calledBalls }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const calledSet = new Set(calledBalls.map((b) => b.number));
  const latestNumber = calledBalls.length > 0 ? calledBalls[calledBalls.length - 1].number : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span>75-Ball Board</span>
          <span className="bg-slate-800 border border-slate-700 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {calledBalls.length} / 75 Called
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[11px]">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 grid grid-cols-5 gap-2 border-t border-slate-800/80 pt-3 text-xs">
          {COLUMNS.map((col) => {
            const numbers = [];
            for (let i = col.range[0]; i <= col.range[1]; i++) {
              numbers.push(i);
            }

            return (
              <div key={col.letter} className="flex flex-col gap-1">
                <div
                  className={`text-center font-black py-1 rounded-lg border text-xs ${col.color}`}
                >
                  {col.letter}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {numbers.map((num) => {
                    const isCalled = calledSet.has(num);
                    const isLatest = num === latestNumber;

                    return (
                      <div
                        key={num}
                        className={`
                          text-center py-0.5 rounded text-[11px] font-medium transition-all
                          ${
                            isLatest
                              ? 'bg-amber-400 text-slate-950 font-black scale-105 shadow-sm animate-pulse'
                              : isCalled
                              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                              : 'bg-slate-800/40 text-slate-500'
                          }
                        `}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
