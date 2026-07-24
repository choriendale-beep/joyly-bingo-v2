import React, { useState } from 'react';
import { X, Send, CreditCard, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Player } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  type: 'deposit' | 'withdraw';
  onClose: () => void;
  player: Player;
  onSubmit: (amount: number, paymentMethod: string, phone: string) => Promise<void>;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  type,
  onClose,
  player,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<number>(type === 'deposit' ? 50 : 20);
  const [method, setMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setLoading(true);
    try {
      await onSubmit(amount, method, phone);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#181d30] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
            {type === 'deposit' ? <CreditCard className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white capitalize">
              {type === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
            </h3>
            <p className="text-xs text-slate-400">
              Current Balance: <span className="text-amber-400 font-bold">{player.balance} ETB</span>
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <p className="text-base font-bold text-white">
              {type === 'deposit' ? 'Deposit Request Submitted!' : 'Withdrawal Request Submitted!'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Your transaction is being processed. Funds will be updated shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Presets */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Amount (ETB)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[20, 50, 100, 200].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      amount === val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {val} ETB
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="Custom Amount"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('telebirr')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer ${
                    method === 'telebirr'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  📱 Telebirr
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('cbe')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer ${
                    method === 'cbe'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  🏦 CBE Birr
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{type === 'deposit' ? `Deposit ${amount} ETB` : `Request ${amount} ETB Withdrawal`}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
