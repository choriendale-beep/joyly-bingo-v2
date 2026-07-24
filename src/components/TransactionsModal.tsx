import React, { useEffect, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Award, ShoppingBag, Gift } from 'lucide-react';
import { Transaction } from '../types';
import { getTransactions } from '../lib/storage';

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({
  isOpen,
  onClose,
  playerId,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Fast fallback to local cache
      const localTxs = getTransactions();
      setTransactions(localTxs);

      // Fetch live from MongoDB Atlas
      fetch(`/api/transactions/${playerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.transactions) {
            const formatted = data.transactions.map((tx: any) => ({
              id: tx.id,
              playerId: tx.playerId,
              type: tx.type,
              amount: tx.amount,
              status: tx.status,
              createdAt: tx.createdAt,
              description: tx.description,
            }));
            setTransactions(formatted);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, playerId]);

  if (!isOpen) return null;

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      case 'win':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'stake':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'signup_bonus':
        return <Gift className="w-4 h-4 text-purple-400" />;
      default:
        return <ArrowDownLeft className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white">Transaction History</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No transactions found yet.</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    {getIcon(tx.type)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white capitalize">{tx.type.replace('_', ' ')}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Birr
                  </div>
                  <span className="text-[10px] text-emerald-400/90 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
