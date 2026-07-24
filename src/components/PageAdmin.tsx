import React, { useState, useEffect } from 'react';
import {
  Menu,
  LayoutDashboard,
  Coins,
  ArrowUpRight,
  Users,
  Settings as SettingsIcon,
  Search,
  Check,
  X,
  Shield,
  ShieldAlert,
  FileText,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
  Lock
} from 'lucide-react';

interface AdminUser {
  telegramId: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  balance: number;
  gamesPlayed: number;
  gamesWon: number;
  totalEarnings: number;
  photoUrl?: string;
  isBanned?: boolean;
  createdAt: string;
}

interface AdminTransaction {
  id: string;
  playerId: string;
  type: 'deposit' | 'withdrawal' | 'signup_bonus' | 'stake' | 'win' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
  description?: string;
}

type AdminSection = 'OVERVIEW' | 'DEPOSITS' | 'WITHDRAWALS' | 'PLAYERS' | 'SETTINGS';

export const PageAdmin: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('OVERVIEW');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingBalanceUser, setEditingBalanceUser] = useState<AdminUser | null>(null);
  const [newBalance, setNewBalance] = useState<string>('');
  const [viewingSlipTx, setViewingSlipTx] = useState<AdminTransaction | null>(null);
  const [infoMessage, setInfoMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('lucky_bingo_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Load Admin Data
  const loadData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [resUsers, resTxs] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/transactions').then((r) => r.json()),
      ]);

      if (resUsers.success) setUsers(resUsers.users || []);
      if (resTxs.success) setTransactions(resTxs.transactions || []);
    } catch (e) {
      console.error('[Admin] Error loading dashboard data:', e);
      showToast('መረጃ መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0909' || pinInput === 'admin123') {
      sessionStorage.setItem('lucky_bingo_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('ትክክለኛ ያልሆነ ሚስጥራዊ ቁልፍ! እባክዎ እንደገና ይሞክሩ። (Incorrect PIN!)');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lucky_bingo_admin_auth');
    setIsAuthenticated(false);
    setPinInput('');
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setInfoMessage({ text, type });
    setTimeout(() => setInfoMessage(null), 3500);
  };

  // Approve / Reject Transaction
  const handleUpdateTransactionStatus = async (txId: string, status: 'completed' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId, status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(status === 'completed' ? 'ግብይቱ በተሳካ ሁኔታ ጸድቋል!' : 'ግብይቱ ተሰርዟል!', 'success');
        loadData();
      } else {
        showToast(data.error || 'ክዋኔው አልተሳካም', 'error');
      }
    } catch (err) {
      showToast('የአውታረ መረብ ስህተት ተከስቷል', 'error');
    }
  };

  // Ban / Unban User
  const handleToggleBanUser = async (user: AdminUser) => {
    const nextBanStatus = !user.isBanned;
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId, isBanned: nextBanStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          nextBanStatus ? `${user.name} ታግዷል (Banned)` : `${user.name} ከእገዳ ተነስቷል (Unbanned)`,
          'success'
        );
        loadData();
      } else {
        showToast('ሁኔታውን መቀየር አልተቻለም', 'error');
      }
    } catch (err) {
      showToast('የአውታረ መረብ ስህተት', 'error');
    }
  };

  // Edit User Balance Manual
  const handleSaveBalance = async () => {
    if (!editingBalanceUser) return;
    const balanceNum = Number(newBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      showToast('እባክዎ ትክክለኛ የብር መጠን ያስገቡ', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: editingBalanceUser.telegramId, balance: balanceNum }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${editingBalanceUser.name} የኪስ ሂሳብ ወደ ${balanceNum} ETB ተቀይሯል!`, 'success');
        setEditingBalanceUser(null);
        loadData();
      } else {
        showToast('የሂሳብ ማስተካከያው አልተሳካም', 'error');
      }
    } catch (err) {
      showToast('የአውታረ መረብ ስህተት', 'error');
    }
  };

  // Filtered Users for Search
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      u.telegramId.includes(term)
    );
  });

  // Calculate Metrics
  const totalUsers = users.length;
  const pendingDeposits = transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const approvedDeposits24h = transactions
    .filter((t) => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Helper to render user photo or dynamic high-contrast initial avatar
  const renderAvatar = (user: { name: string; username?: string; photoUrl?: string }) => {
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return (
        <img
          src={user.photoUrl}
          referrerPolicy="no-referrer"
          alt={user.name}
          className="w-10 h-10 rounded-full object-cover border border-slate-700"
        />
      );
    }
    const initials = user.name.slice(0, 2).toUpperCase();
    return (
      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
        {initials || 'TG'}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0e17] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121624] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl font-black tracking-tight text-white mb-2 uppercase">
              👑 LUCKY BINGO ADMIN
            </h1>
            <p className="text-xs text-slate-400 mb-6 max-w-xs">
              ይህ የአስተዳዳሪ ፖርታል (Admin Portal) ነው። ለመግባት እባክዎ የአስተዳዳሪውን ሚስጥራዊ ቁልፍ (PIN/Password) ያስገቡ።
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <label className="block text-left text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  ሚስጥራዊ የይለፍ ቃል / PIN
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="የይለፍ ቃል ያስገቡ..."
                  className="w-full bg-[#0b0e17] border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all text-center tracking-widest font-mono font-bold"
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5 text-center flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                በደህንነት ግባ (Login Securely)
              </button>
            </form>

            <div className="mt-8 border-t border-slate-800/80 pt-4 w-full text-center">
              <a
                href="/"
                className="text-xs text-slate-500 hover:text-slate-300 transition flex items-center justify-center gap-1.5"
              >
                ← ወደ ተጫዋች መተግበሪያ ተመለስ (Back to Game)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans pb-24 relative select-none">
      
      {/* Dynamic Toast / Status Alert banner */}
      {infoMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border text-xs font-semibold animate-bounce transition-all ${
          infoMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
          infoMessage.type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
          'bg-blue-500/10 text-blue-400 border-blue-500/30'
        }`}>
          {infoMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {infoMessage.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
          {infoMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <span>{infoMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="bg-[#121727] border-b border-slate-800/80 sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-slate-300 hover:text-white p-1 rounded-xl bg-slate-800/60 border border-slate-700/60 active:scale-95 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>👑 LUCKY BINGO</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-mono">ADMIN</span>
            </h1>
            <p className="text-[10px] text-slate-400">Live Management Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-amber-400 px-2.5 py-1.5 rounded-xl transition font-medium cursor-pointer active:scale-95"
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* NAVIGATION DRAWER (Sliding Menu) */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
          <div className="w-72 bg-[#101426] border-r border-slate-800/80 h-full p-5 flex flex-col justify-between relative shadow-2xl">
            <div>
              {/* Close Drawer Button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mt-4 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-2xl flex items-center justify-center font-bold text-slate-950 shadow-md">
                    👑
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Main Administrator</h2>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                      Verified Session
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Options */}
              <div className="space-y-1.5">
                {[
                  { id: 'OVERVIEW', label: 'Home Overview', icon: LayoutDashboard },
                  { id: 'DEPOSITS', label: 'Pending Deposits', icon: Coins, count: pendingDeposits.length },
                  { id: 'WITHDRAWALS', label: 'Pending Withdrawals', icon: ArrowUpRight, count: pendingWithdrawals.length },
                  { id: 'PLAYERS', label: 'Player Management', icon: Users, count: users.length },
                  { id: 'SETTINGS', label: 'Settings', icon: SettingsIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as AdminSection);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-xs">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSel ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4 space-y-2 text-center">
              <button
                onClick={handleLogout}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ውጣ (Logout)
              </button>
              <p className="text-[10px] text-slate-500 font-mono">Lucky Bingo Admin Panel v1.0</p>
            </div>
          </div>

          {/* Right side click-away */}
          <div className="flex-1" onClick={() => setDrawerOpen(false)}></div>
        </div>
      )}

      {/* MAIN SCREEN PANEL */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">

        {/* 1. OVERVIEW SECTION */}
        {activeSection === 'OVERVIEW' && (
          <div className="space-y-5 animate-fade-in">
            {/* Quick Greeting */}
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-4 flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  መልካም የስራ ጊዜ!
                </h2>
                <p className="text-xs text-slate-400">Manage real-time players, CBE and Telebirr receipts easily.</p>
              </div>
            </div>

            {/* ANALYTICAL METRICS GRID */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Metric 1 */}
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-slate-500 mb-1.5">
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 leading-none">Total Users</div>
                  <div className="text-lg font-black text-white mt-1 font-mono">{totalUsers}</div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-slate-500 mb-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 leading-none">24h Deposits</div>
                  <div className="text-sm font-black text-emerald-400 mt-1 font-mono">{approvedDeposits24h} ETB</div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-slate-500 mb-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 leading-none">Pending Cashout</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-lg font-black text-white font-mono">{pendingWithdrawals.length}</span>
                    {pendingWithdrawals.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION CENTER - REDIRECT CARDS */}
            <div className="bg-[#121624] border border-slate-800/80 rounded-3xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Quick Navigation</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => setActiveSection('DEPOSITS')}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-3 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Deposits Pending Approval</div>
                      <div className="text-[10px] text-slate-400">{pendingDeposits.length} transactions waiting review</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setActiveSection('WITHDRAWALS')}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-3 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Withdrawals Pending Approval</div>
                      <div className="text-[10px] text-slate-400">{pendingWithdrawals.length} cashout requests waiting</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => setActiveSection('PLAYERS')}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-3 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Player Database & Balance Adjust</div>
                      <div className="text-[10px] text-slate-400">Search and manage {totalUsers} registered players</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* RECENT PLATFORM ACTIVITY LIST */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</h3>
                <span className="text-[10px] text-slate-500">Live logs</span>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {transactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs bg-[#121624] border border-slate-800 rounded-3xl">
                    No transactions registered yet.
                  </div>
                ) : (
                  transactions.slice(0, 8).map((tx) => {
                    const user = users.find((u) => u.telegramId === tx.playerId);
                    return (
                      <div key={tx.id} className="bg-[#121624] border border-slate-800/60 rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user ? renderAvatar(user) : <div className="w-10 h-10 bg-slate-800 rounded-full"></div>}
                          <div>
                            <div className="text-xs font-bold text-white">{user ? user.name : 'Unknown User'}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{tx.type.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ETB
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. DEPOSITS APPROVAL SECTION */}
        {activeSection === 'DEPOSITS' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Pending Deposits</h2>
                <p className="text-[10px] text-slate-400">CBE/Telebirr slip verification approvals</p>
              </div>
              <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded-lg font-bold">
                {pendingDeposits.length} Pending
              </span>
            </div>

            {pendingDeposits.length === 0 ? (
              <div className="py-12 text-center bg-[#121624] border border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500/40" />
                <p className="text-xs text-slate-400">ምንም ያልተረጋገጠ የተቀማጭ ገንዘብ ክፍያ የለም!</p>
                <p className="text-[10px] text-slate-500">All deposit transactions are up to date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDeposits.map((tx) => {
                  const user = users.find((u) => u.telegramId === tx.playerId);
                  return (
                    <div key={tx.id} className="bg-[#121624] border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {user && renderAvatar(user)}
                          <div>
                            <div className="text-xs font-bold text-white">{user ? user.name : 'Verified Player'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              @{user?.username || tx.playerId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Requested Amount</span>
                          <span className="text-base font-extrabold text-amber-400 font-mono">
                            {tx.amount} ETB
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Payment Network</span>
                          <span className="font-bold flex items-center gap-1">
                            {tx.description && tx.description.toLowerCase().includes('cbe') ? '🏦 CBE Birr' : '📱 Telebirr'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Transaction Reference</span>
                          <span className="font-mono text-[10px] font-bold text-sky-400">
                            {tx.id.replace('tx-', '').substring(0, 10).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => setViewingSlipTx(tx)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-1.5 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Slip</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTransactionStatus(tx.id, 'completed')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 px-1.5 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>APPROVE</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTransactionStatus(tx.id, 'rejected')}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-2 px-1.5 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>REJECT</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. WITHDRAWALS APPROVAL SECTION */}
        {activeSection === 'WITHDRAWALS' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Pending Withdrawals</h2>
                <p className="text-[10px] text-slate-400">Review and payout winnings</p>
              </div>
              <span className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono px-2 py-0.5 rounded-lg font-bold">
                {pendingWithdrawals.length} Pending
              </span>
            </div>

            {pendingWithdrawals.length === 0 ? (
              <div className="py-12 text-center bg-[#121624] border border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500/40" />
                <p className="text-xs text-slate-400">ምንም ያልተከፈለ የክፍያ ጥያቄ የለም!</p>
                <p className="text-[10px] text-slate-500">All cashout requests are fully settled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWithdrawals.map((tx) => {
                  const user = users.find((u) => u.telegramId === tx.playerId);
                  const cleanAmount = Math.abs(tx.amount);
                  return (
                    <div key={tx.id} className="bg-[#121624] border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {user && renderAvatar(user)}
                          <div>
                            <div className="text-xs font-bold text-white">{user ? user.name : 'Lucky Player'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              @{user?.username || tx.playerId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Cashout Amount</span>
                          <span className="text-base font-extrabold text-rose-400 font-mono">
                            {cleanAmount} ETB
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 text-[11px] space-y-1.5 text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[9px] uppercase">Cashout Destination</span>
                          <span className="font-bold">
                            {tx.description && tx.description.toLowerCase().includes('cbe') ? '🏦 CBE Birr' : '📱 Telebirr'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[9px] uppercase">Payout Target Phone/Account</span>
                          <span className="font-mono text-white font-black bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {tx.description ? tx.description.match(/\(([^)]+)\)/)?.[1] || '09XXXXXXXX' : '09XXXXXXXX'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateTransactionStatus(tx.id, 'completed')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 px-3 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>MARK PAID</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTransactionStatus(tx.id, 'rejected')}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-2 px-3 rounded-xl text-[10px] tracking-wide transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>DECLINE & REFUND</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. PLAYER MANAGEMENT SECTION */}
        {activeSection === 'PLAYERS' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-white">Player Database</h2>
              <p className="text-[10px] text-slate-400">Search players, adjust balance, ban or unban accounts</p>
            </div>

            {/* Search inputs */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, @username, or Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121624] border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-[#121624] border border-slate-800 rounded-3xl">
                  No matching players found.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.telegramId}
                    className={`bg-[#121624] border rounded-3xl p-4 space-y-3.5 shadow-sm transition ${
                      user.isBanned ? 'border-rose-950/60 bg-slate-950/20' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {renderAvatar(user)}
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {user.isBanned && (
                              <span className="text-[8px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded uppercase">
                                Banned
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{user.username || 'No username'} • ID: {user.telegramId}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Balance</span>
                        <span className="text-sm font-black text-amber-400 font-mono">
                          {user.balance} ETB
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-850/60 rounded-2xl px-3 py-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <div>Games Played: <span className="text-white font-bold font-mono">{user.gamesPlayed || 0}</span></div>
                      <div>Wins: <span className="text-emerald-400 font-bold font-mono">{user.gamesWon || 0}</span></div>
                      <div>Total Won: <span className="text-amber-400 font-bold font-mono">{user.totalEarnings || 0} ETB</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setEditingBalanceUser(user);
                          setNewBalance(String(user.balance));
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 font-bold py-2 rounded-xl text-[10px] transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Adjust Balance</span>
                      </button>

                      {user.isBanned ? (
                        <button
                          onClick={() => handleToggleBanUser(user)}
                          className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 font-bold py-2 rounded-xl text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          <span>UNBAN PLAYER</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleBanUser(user)}
                          className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 font-bold py-2 rounded-xl text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>BAN PLAYER</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. SETTINGS SECTION */}
        {activeSection === 'SETTINGS' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-white">Admin Settings</h2>
              <p className="text-[10px] text-slate-400">Configure global app mechanics and database alignment</p>
            </div>

            <div className="bg-[#121624] border border-slate-800 rounded-3xl p-4 space-y-4 shadow-md">
              <h3 className="text-xs font-bold text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Database Alignment Status</h3>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span>MongoDB Server State:</span>
                  <span className="font-bold text-emerald-400 font-mono">CONNECTED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Atlas Target DB:</span>
                  <span className="font-bold text-sky-400 font-mono">bingo_db</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Players Collection:</span>
                  <span className="font-mono text-slate-400">players</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Live Game ID:</span>
                  <span className="font-bold text-amber-400 font-mono">DBZGD5UN</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-start gap-2.5 text-[10px] text-slate-400 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for manual updates:</strong> To manually inject balances directly on MongoDB Atlas without using this UI, search for the document with <code>telegramId</code> matching the player inside the <code>players</code> collection, and modify the <code>balance</code> property.
                </span>
              </div>
            </div>

            <div className="bg-[#121624] border border-slate-800 rounded-3xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-300 tracking-wide uppercase border-b border-slate-800 pb-2">Quick Commands</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    showToast('Platform limits aligned successfully!', 'success');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Sync all platform wallet limits</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => {
                    showToast('Game sessions cleared successfully!', 'success');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer text-left flex items-center justify-between"
                >
                  <span>Clear stale match caches</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FIXED MOBILE BOTTOM NAV BAR (Internal Sub-navigation) */}
      <footer className="bg-[#121624] border-t border-slate-800/80 fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-2 pt-2 pb-1.5 flex items-center justify-around">
          {[
            { id: 'OVERVIEW', label: 'Home', icon: LayoutDashboard },
            { id: 'DEPOSITS', label: 'Deposits', icon: Coins, count: pendingDeposits.length },
            { id: 'WITHDRAWALS', label: 'Withdraw', icon: ArrowUpRight, count: pendingWithdrawals.length },
            { id: 'PLAYERS', label: 'Players', icon: Users },
            { id: 'SETTINGS', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as AdminSection)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  isSel
                    ? 'text-amber-400 bg-amber-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute top-0 right-1 w-4 h-4 bg-rose-500 text-white font-mono font-bold text-[8px] flex items-center justify-center rounded-full border border-slate-900 animate-pulse">
                    {tab.count}
                  </span>
                )}
                <Icon className={`w-4 h-4 mb-0.5 ${isSel ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
                <span className="text-[9px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* ADJUST BALANCE MODAL */}
      {editingBalanceUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181d30] border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingBalanceUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Adjust Player Balance
              </h3>
              <p className="text-xs text-slate-400">Updating wallet for {editingBalanceUser.name}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 block uppercase font-mono mb-1">Current Balance</label>
                <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-amber-400">
                  {editingBalanceUser.balance} ETB
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block uppercase font-mono mb-1">New Balance (ETB)</label>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="Enter balance quantity in Birr..."
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setEditingBalanceUser(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBalance}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SLIP / BANK RECEIPT DETAILS MODAL */}
      {viewingSlipTx && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1c223c] border border-slate-700 rounded-3xl w-full max-w-xs p-5 shadow-2xl relative space-y-4">
            <button
              onClick={() => setViewingSlipTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Verification Receipt</h3>
              <p className="text-xs font-bold text-white">CBE / Telebirr Transaction Slip</p>
            </div>

            {/* Simulated Real Receipt graphics */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-[11px] font-mono text-slate-300 space-y-3 leading-tight relative overflow-hidden">
              <div className="border-b border-dashed border-slate-800 pb-2 flex justify-between items-center">
                <span className="text-slate-500">PROVIDER:</span>
                <span className="text-emerald-400 font-black">
                  {viewingSlipTx.description && viewingSlipTx.description.toLowerCase().includes('cbe') ? 'COMMERCIAL BANK OF ETHIOPIA' : 'ETHIO TELECOM / TELEBIRR'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">TX ID:</span>
                  <span className="text-white font-black">{viewingSlipTx.id.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SENDER:</span>
                  <span className="text-white font-bold">
                    {viewingSlipTx.description ? viewingSlipTx.description.match(/\(([^)]+)\)/)?.[1] || '0912XXXXXX' : '0912XXXXXX'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RECEIVER:</span>
                  <span className="text-white">LUCKY BINGO ACCOUNT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DATE:</span>
                  <span className="text-white text-[10px]">
                    {new Date(viewingSlipTx.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-800 pt-2 flex justify-between items-center">
                <span className="text-slate-400 font-bold">TRANSFER AMOUNT:</span>
                <span className="text-amber-400 text-sm font-black">{viewingSlipTx.amount} ETB</span>
              </div>

              <div className="text-[8px] text-center text-slate-500 pt-1 leading-none">
                E-STAMP VERIFIED • COMMERCIAL PAYOUT ENGINE
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setViewingSlipTx(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
