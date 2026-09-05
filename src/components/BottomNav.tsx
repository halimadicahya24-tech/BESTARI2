'use client';

import React from 'react';
import { Home, History, Settings } from 'lucide-react';

export type TabType = 'home' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#D8E4E0] px-6 py-2 flex justify-around items-center z-40 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-full transition-all duration-200 ${
              isActive
                ? 'bg-[#C8F2E2] text-[#1E4852] font-bold shadow-sm scale-105'
                : 'text-[#6B878C] hover:text-[#1E4852]'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
