import React, { useEffect, useState } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Bot, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  Code2, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        expand: () => void;
        close: () => void;
        ready: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
      };
    };
  }
}

export default function App() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [isInsideTelegram, setIsInsideTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'status'>('guide');

  const appUrl = window.location.origin;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
      setIsInsideTelegram(true);
      setTgUser(tg.initDataUnsafe.user);
      tg.ready();
      tg.expand();
    }
  }, []);

  const copyToClipboard = (text: string, type: 'url' | 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  const triggerHaptic = () => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans antialiased">
      <div className="max-w-2xl w-full space-y-6">

        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 transform hover:scale-105 transition-transform">
            <Bot className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400">
            Telegram Mini App Setup Guide
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            አፕሊኬሽኑን ከቴሌግራም ቦት (@BotFather) ጋር ለማገናኘት የሚከተሉትን ቀላል ደረጃዎች ይከተሉ።
          </p>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              የማገናኛ መመሪያ (Setup Guide)
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'status'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              የቴሌግራም ሁኔታ (Live Status)
            </button>
          </div>
        </header>

        {activeTab === 'guide' ? (
          <main className="space-y-4">
            {/* Quick WebApp URL Card */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" />
                  የአፕሊኬሽኑ Web App URL
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                  ለBotFather የሚሰጥ
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-300 break-all">
                <span className="flex-1 select-all">{appUrl}</span>
                <button
                  onClick={() => copyToClipboard(appUrl, 'url')}
                  className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'ኮፒ ተደርጓል!' : 'ኮፒ አድርግ'}
                </button>
              </div>
            </div>

            {/* Step 1 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  1
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">ደረጃ 1: @BotFather ን ይክፈቱ</h2>
                  <p className="text-xs text-slate-400">ቴሌግራም ላይ BotFather ን በመክፈት አዲስ ቦት ይፍጠሩ።</p>
                </div>
              </div>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <Send className="w-4 h-4" />
                @BotFather በቴሌግራም ክፈት
              </a>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">ደረጃ 2: አዲስ ቦት መፍጠር (/newbot)</h2>
                  <p className="text-xs text-slate-400">ለBotFather መልእክት ይላኩ:</p>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300">
                /newbot
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                የቦቱን ስም (Name) እና Username (ለምሳሌ: <span className="text-amber-300 font-mono">MyLuckyBingo_bot</span>) ያስገቡ።
                ከዚያ BotFather የሚሰጥዎትን <b>Bot Token</b> ኮፒ ያድርጉ።
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  3
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">ደረጃ 3: Web App Button ማስተካከል</h2>
                  <p className="text-xs text-slate-400">ቦቱ ውስጥ የዌብ አፕ ቁልፍ ለማስገባት ለBotFather ይህን ይላኩ:</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono">
                <p className="text-amber-300">/mybots</p>
                <p className="text-slate-400">→ ቦትዎን ይምረጡ</p>
                <p className="text-slate-400">→ Bot Settings</p>
                <p className="text-slate-400">→ Menu Button</p>
                <p className="text-slate-400">→ Configure menu button</p>
                <p className="text-emerald-400">→ ከላይ ያለውን Web App URL ያስገቡ</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  4
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">ደረጃ 4: ቦትዎን በቴሌግራም ይክፈቱ!</h2>
                  <p className="text-xs text-slate-400">አሁን የተፈጠረውን ቦት ከፍተው "Start" ወይም የታችኛውን ማእዘን ቁልፍ በመጫን ሚኒ አፑን ይክፈቱ።</p>
                </div>
              </div>
            </div>
          </main>
        ) : (
          /* Live Status Tab */
          <main className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  Telegram WebApp SDK Status
                </h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                  isInsideTelegram
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isInsideTelegram ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isInsideTelegram ? 'ቴሌግራም ውስጥ ነው' : 'ብራውዘር ውስጥ (Browser Mode)'}
                </span>
              </div>

              {isInsideTelegram && tgUser ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-amber-400">የተጠቃሚ መረጃ (Telegram User):</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div><b>ስም:</b> {tgUser.first_name} {tgUser.last_name || ''}</div>
                    <div><b>Username:</b> @{tgUser.username || 'የለውም'}</div>
                    <div><b>Telegram ID:</b> {tgUser.id}</div>
                    <div><b>ቋንቋ:</b> {tgUser.language_code || 'en'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-3 leading-relaxed">
                  ይህ ገፅ በቴሌግራም አፕሊኬሽን (Telegram App) ውስጥ ሲከፈት የተጠቃሚውን ስም፣ Telegram ID እና የቴሌግራም ልዩ ባህሪያትን በራስ-ሰር ያገኛል።
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={triggerHaptic}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  📳 Haptic Touch Test
                </button>
                <button
                  onClick={() => window.Telegram?.WebApp?.expand()}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  📐 Full Screen Expand
                </button>
              </div>
            </div>
          </main>
        )}

        <footer className="text-center text-xs text-slate-500 pt-4">
          Lucky Bingo Mini App • Express & Vite Integration
        </footer>
      </div>
    </div>
  );
}
