import React, { useState, useEffect } from 'react';
import { NavTab, GameStage, Player, TicketItem } from './types';
import { generateTicketList } from './lib/bingo';
import { getStoredPlayer, updateBalance, addGameHistory } from './lib/storage';
import { BottomNav } from './components/BottomNav';
import { PageHome } from './components/PageHome';
import { PageTicketSelect } from './components/PageTicketSelect';
import { PageLiveGame } from './components/PageLiveGame';
import { PageScores } from './components/PageScores';
import { PageHistory } from './components/PageHistory';
import { PageWallet } from './components/PageWallet';
import { PageProfile } from './components/PageProfile';
import { WalletModal } from './components/WalletModal';
import { TransactionsModal } from './components/TransactionsModal';
import { RulesModal } from './components/RulesModal';
import { socket, RoomState } from './lib/socket';

export const App: React.FC = () => {
  // Navigation & Game Stage
  const [activeTab, setActiveTab] = useState<NavTab>('GAME');
  const [gameStage, setGameStage] = useState<GameStage>('HOME');

  // Player & Wallet State
  const [player, setPlayer] = useState<Player>({
    id: 'demo-player-1',
    username: 'lucky_player',
    first_name: 'Lucky',
    mainWallet: 112,
    playWallet: 0,
    created_at: new Date().toISOString(),
  });

  // Game Settings & Tickets
  const [selectedStake, setSelectedStake] = useState<number>(10);
  const [tickets, setTickets] = useState<TicketItem[]>(() => generateTicketList(400));
  const [gameId, setGameId] = useState<string>('DBZGD5UN');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [walletModal, setWalletModal] = useState<{ open: boolean; type: 'deposit' | 'withdraw' }>({
    open: false,
    type: 'deposit',
  });
  const [transactionsOpen, setTransactionsOpen] = useState<boolean>(false);

  // Load Telegram user or default on mount
  useEffect(() => {
    const p = getStoredPlayer();
    setPlayer(p);
  }, []);

  // Synchronize room state across Socket.IO
  useEffect(() => {
    const handleRoomState = (state: RoomState) => {
      if (state.gameId && state.gameId !== gameId) {
        setGameId(state.gameId);
        // Clear selected tickets for new game ID
        setTickets((prev) => prev.map((t) => ({ ...t, selected: false })));
      }
      if (state.phase === 'PLAYING' && activeTab === 'GAME' && gameStage === 'TICKET_SELECT') {
        setGameStage('PLAYING');
      } else if (state.phase === 'TICKET_SELECT') {
        if (gameStage === 'PLAYING') {
          setGameStage('TICKET_SELECT');
        }
        setTickets((prev) => prev.map((t) => ({ ...t, selected: false })));
      }
    };

    socket.on('room_state', handleRoomState);

    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [activeTab, gameStage, gameId]);

  // Handle Ticket Toggle
  const handleToggleTicket = (ticketNum: number) => {
    setTickets((prev) =>
      prev.map((t) => (t.number === ticketNum ? { ...t, selected: !t.selected } : t))
    );
  };

  // Handle Refresh Tickets
  const handleRefreshTickets = () => {
    setTickets(generateTicketList(400));
  };

  // Transition from Home -> Ticket Selection
  const handleStartTicketSelect = () => {
    setGameStage('TICKET_SELECT');
  };

  // Transition from Ticket Selection -> Live Game
  const handleStartLiveGame = async () => {
    const selected = tickets.filter((t) => t.selected);
    const count = selected.length > 0 ? selected.length : 1;
    const totalCost = count * selectedStake;

    if (player.mainWallet + player.playWallet < totalCost) {
      alert(`Insufficient balance! Need ${totalCost} ETB to play ${count} cartel(s).`);
      return;
    }

    // Auto-select ticket 1 if user didn't pick any specific ticket
    if (selected.length === 0) {
      setTickets((prev) =>
        prev.map((t) => (t.number === 1 ? { ...t, selected: true } : t))
      );
    }

    // Deduct stake
    const updated = updateBalance(
      -totalCost,
      'stake',
      `Played ${count} Cartel(s) at ${selectedStake} ETB per cartel`
    );
    setPlayer(updated);

    // Generate random Game ID
    const randomGameId = 'DB' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameId(randomGameId);

    // Record initial match history entry
    addGameHistory({
      id: `gh-${Date.now()}`,
      gameId: randomGameId,
      date: 'Just now',
      stake: totalCost,
      ticketsCount: count,
      potWon: 0,
      status: 'LOST',
    });

    setGameStage('PLAYING');
  };

  // Handle Game Win
  const handleGameWin = async (prizeAmount: number, pattern: string) => {
    const updated = updateBalance(
      prizeAmount,
      'win',
      `Won Bingo Derash (${pattern})`
    );
    setPlayer(updated);

    const selected = tickets.filter((t) => t.selected);
    const count = selected.length > 0 ? selected.length : 1;

    // Record win in history
    addGameHistory({
      id: `gh-win-${Date.now()}`,
      gameId: gameId,
      date: 'Just now',
      stake: count * selectedStake,
      ticketsCount: count,
      potWon: prizeAmount,
      status: 'WON',
      pattern,
    });
  };

  // Handle Wallet submission
  const handleWalletSubmit = async (amount: number, method: string, phone: string) => {
    if (walletModal.type === 'deposit') {
      const updated = updateBalance(
        amount,
        'deposit',
        `Deposit via ${method} (${phone})`
      );
      setPlayer(updated);
    } else {
      const updated = updateBalance(
        -amount,
        'withdrawal',
        `Withdrawal via ${method} (${phone})`
      );
      setPlayer(updated);
    }
  };

  const handleQuickAddBonus = (amount = 100) => {
    const updated = updateBalance(amount, 'signup_bonus', `Free Game Bonus (+${amount} ETB)`);
    setPlayer(updated);
  };

  const selectedTicketsList = tickets.filter((t) => t.selected);

  return (
    <div className="min-h-screen bg-[#0b0e17] text-slate-100 flex flex-col font-sans antialiased relative selection:bg-amber-500 selection:text-slate-950">
      {/* Main Page Rendering according to activeTab */}
      {activeTab === 'GAME' && (
        <>
          {gameStage === 'HOME' && (
            <PageHome
              player={player}
              selectedStake={selectedStake}
              setSelectedStake={setSelectedStake}
              onOpenRules={() => setRulesOpen(true)}
              onStartTicketSelect={handleStartTicketSelect}
              onQuickAddBonus={() => handleQuickAddBonus(100)}
            />
          )}

          {gameStage === 'TICKET_SELECT' && (
            <PageTicketSelect
              player={player}
              stake={selectedStake}
              tickets={tickets}
              onToggleTicket={handleToggleTicket}
              onRefreshTickets={handleRefreshTickets}
              onBackToHome={() => setGameStage('HOME')}
              onTimerExpired={handleStartLiveGame}
            />
          )}

          {gameStage === 'PLAYING' && (
            <PageLiveGame
              player={player}
              gameId={gameId}
              stake={selectedStake}
              selectedTickets={selectedTicketsList.length > 0 ? selectedTicketsList : [tickets[0]]}
              onLeaveGame={() => {
                setTickets((prev) => prev.map((t) => ({ ...t, selected: false })));
                setGameStage('TICKET_SELECT');
              }}
              onWin={handleGameWin}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
            />
          )}
        </>
      )}

      {activeTab === 'SCORES' && <PageScores />}

      {activeTab === 'HISTORY' && <PageHistory />}

      {activeTab === 'WALLET' && (
        <PageWallet
          player={player}
          onOpenDeposit={() => setWalletModal({ open: true, type: 'deposit' })}
          onOpenWithdraw={() => setWalletModal({ open: true, type: 'withdraw' })}
          onOpenTransactions={() => setTransactionsOpen(true)}
          onClaimBonus={() => handleQuickAddBonus(50)}
        />
      )}

      {activeTab === 'PROFILE' && <PageProfile player={player} />}

      {/* Bottom Navigation Bar across all views */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} botHandle="@dilbingo_bot" />

      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Deposit/Withdraw Modal */}
      <WalletModal
        isOpen={walletModal.open}
        type={walletModal.type}
        onClose={() => setWalletModal({ ...walletModal, open: false })}
        player={player}
        onSubmit={handleWalletSubmit}
      />

      {/* Transactions Modal */}
      <TransactionsModal
        isOpen={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        playerId={player.id}
      />
    </div>
  );
};
