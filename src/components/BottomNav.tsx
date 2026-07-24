import React from 'react';
import { NavTab } from '../types';
import { Gamepad2, Trophy, Clock, Wallet, User, Shield } from 'lucide-react';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'GAME' as NavTab, label: 'GAME', icon: Gamepad2 },
    { id: 'SCORES' as NavTab, label: 'SCORES', icon: Trophy },
    { id: 'HISTORY' as NavTab, label: 'HISTORY', icon: Clock },
    { id: 'WALLET' as NavTab, label: 'WALLET', icon: Wallet },
    { id: 'PROFILE' as NavTab, label: 'PROFILE', icon: User },
  ];

  return (
    <footer className="bg-[#121624] border-t border-slate-800/80 fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-md mx-auto px-2 pt-2 pb-1 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400 stroke-[2.5]' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-wider uppercase">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
